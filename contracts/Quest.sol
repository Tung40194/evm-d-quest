// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./lib/DQuestStructLib.sol";
import "./lib/MissionFormula.sol";
import "./lib/NodeId2IteratorHelper.sol";
import "./interface/IQuest.sol";
import "./interface/IMission.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract Quest is IQuest, Initializable, OwnableUpgradeable, PausableUpgradeable {
    using MissionFormula for MissionFormula.efficientlyResetableFormula;
    using mNodeId2Iterator for mNodeId2Iterator.ResetableId2iterator;

    // binary tree cycles detection helpers
    mNodeId2Iterator.ResetableId2iterator id2itr1;
    mNodeId2Iterator.ResetableId2iterator id2itr2;
    uint256 formulaRootNodeId;

    // contract storage
    MissionFormula.efficientlyResetableFormula missionNodeFormulas;
    address[] allQuesters;
    mapping(address quester => QuesterProgress progress) questerProgresses;
    mapping(address quester => mapping(uint256 missionNodeId => bool isDone)) questerMissionsDone;
    uint256 startTimestamp;
    uint256 endTimestamp;

    // utility mapping for NFT handler only
    mapping(address => mapping(uint256 => bool)) tokenUsed;

    // TODO: check allQuesters's role
    modifier onlyQuester() {
        require(questerProgresses[msg.sender] != QuesterProgress.NotEnrolled, "For questers only");
        _;
    }

    modifier questerNotEnrolled() {
        require(questerProgresses[msg.sender] == QuesterProgress.NotEnrolled, "Quester already joined");
        _;
    }

    // when quest is inactive
    modifier whenInactive() {
        require(block.timestamp < startTimestamp, "Quest has started");
        _;
    }

    // when quest is active
    modifier whenActive() {
        //require(status == QuestStatus.Active, "Quest is not Active");
        require(startTimestamp <= block.timestamp && block.timestamp <= endTimestamp, "Quest is not Active");
        _;
    }

    // when quest is closed/expired
    modifier whenClosed() {
        //require(status != QuestStatus.Closed, "Quest is expired");
        require(block.timestamp > endTimestamp, "Quest is expired");
        _;
    }

    // prettier-ignore
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with the specified mission nodes and quest start/end times.
     * @notice This function can only be called during the initialization phase of the contract.
     * @notice Check docstrings of setMissionNodeFormulas carefully
     * @param nodes The array of mission nodes to set.
     * @param questStartTime The timestamp at which the quest starts.
     * @param questEndTime The timestamp at which the quest ends.
     * Emits a `MissionNodeFormulasSet` event.
     */
    function init(
        address owner,
        DQuestStructLib.MissionNode[] calldata nodes,
        DQuestStructLib.Outcome[] calldata outcomes,
        uint256 questStartTime,
        uint256 questEndTime
    ) external onlyInitializing {
        //TODO check carefully
        require(questStartTime < questEndTime, "Invalid quest lifetime");
        __Ownable_init();
        __Pausable_init();
        setMissionNodeFormulas(nodes);
        setOutcomes(outcomes);
        // d.quest's transfering ownership to quest admin
        transferOwnership(owner);
        startTimestamp = questStartTime;
        endTimestamp = questEndTime;
    }

    function setMissionStatus(
        address quester,
        uint256 missionNodeId,
        bool isMissionDone
    ) external {
        DQuestStructLib.MissionNode memory node = missionNodeFormulas._getNode(missionNodeId);
        require(
            msg.sender == node.missionHandlerAddress || msg.sender == node.oracleAddress,
            "Can not update cross-mission states"
        );
        require(questerProgresses[quester] != QuesterProgress.NotEnrolled, "Not a quester");
        questerMissionsDone[quester][missionNodeId] = isMissionDone;
    }

    function setMissionNodeFormulas(DQuestStructLib.MissionNode[] calldata nodes)
        public
        override
        onlyOwner
        whenInactive
    {
        // TODO: improve validation of input mission nodes
        validateFormulaInput(nodes);
        require(missionNodeFormulas._set(nodes), "Fail to set mission formula");
        emit MissionNodeFormulasSet(nodes);
    }

    /**
     * @dev evaluate mission formula
     * @param nodeId Always the root node of the formula
     */
    function evaluateMissionFormulaTree(
        uint256 nodeId
    ) private returns (bool) {
        //TODO validate the binary tree's depth
        DQuestStructLib.MissionNode memory node = missionNodeFormulas._getNode(nodeId);
        if (node.isMission) {
            return validateMission(nodeId);
        } else {
            bool leftResult = evaluateMissionFormulaTree(node.leftNode);
            bool rightResult = evaluateMissionFormulaTree(node.rightNode);
            if (node.operatorType == DQuestStructLib.OperatorType.AND) {
                return leftResult && rightResult;
            } else {
                return leftResult || rightResult;
            }
        }
    }

    function validateQuest() external override onlyQuester whenNotPaused returns (bool) {
        bool result = evaluateMissionFormulaTree(formulaRootNodeId);
        if (result == true) {
            questerProgresses[msg.sender] = QuesterProgress.Completed;
        }
        return result;
    }

    function validateMission(uint256 missionNodeId) public override onlyQuester whenNotPaused returns (bool) {
        DQuestStructLib.MissionNode memory node = missionNodeFormulas._getNode(missionNodeId);
        require(node.isMission == true, "Not a mission");
        bool cache = questerMissionsDone[msg.sender][missionNodeId];
        // if false, proceed validation at mission handler contract
        if (cache == false) {
            IMission mission = IMission(node.missionHandlerAddress);
            // subsequent call at this trigger will update back the cache
            return mission.validateMission(msg.sender, node);
        }
        return cache;
    }

    function pauseQuest() external override onlyOwner {
        _pause();
    }

    function resumeQuest() external override onlyOwner {
        _unpause();
    }

    function addQuester() external override whenActive questerNotEnrolled {
        allQuesters.push(msg.sender);
        questerProgresses[msg.sender] = QuesterProgress.InProgress;
        emit QuesterAdded(msg.sender);
    }

    function getTotalQuesters() external view override returns (uint256 totalQuesters) {
        return allQuesters.length;
    }

    /**
     * @dev Sets the list of possible outcomes for the quest.
     * Only the contract owner can call this function.
     * @param _outcomes The list of possible outcomes to set.
     */
    function setOutcomes(DQuestStructLib.Outcome[] calldata _outcomes) public override onlyOwner {
        // TODO
    }

    /**
     * @dev Executes the quest outcome for the specified quester.
     * Only the quest can call this function when the quest is active.
     * @param _quester The address of the quester whose outcome to execute.
     * @return result Whether the outcome was successfully executed.
     */
    function executeQuestOutcome(address _quester) external override whenActive returns (bool result) {
        //TODO set questerProgresses[msg.sender] = QuesterProgress.Rewarded;
    }

    // validate mission formula input
    function validateFormulaInput(DQuestStructLib.MissionNode[] memory nodes) private {
        require(nodes.length > 0, "formula input empty");
        // Check for repeated IDs
        for (uint256 i = 0; i < nodes.length; i++) {
            // validate for mission node (operator nodes don't need this)
            if(nodes[i].isMission == true) {
                if(nodes[i].missionHandlerAddress == address(0x0))
                    revert("handler address 0x0");
                if(nodes[i].oracleAddress == address(0x0))
                    revert("oracle address 0x0");
                if((nodes[i].leftNode | nodes[i].rightNode) != 0)
                    revert("leaf node left and right must be 0");
                if(nodes[i].data.length == 0)
                    revert("empty data");
            }
            for (uint256 j = i + 1; j < nodes.length; j++) {
                if (nodes[i].id == nodes[j].id) {
                    revert("MF1");
                }
            }
        }

        // Validate and find root node
        uint256 rootId = findRoot(nodes);

        //TODO Check for loops/cycles
        if(hasCycle(nodes, rootId))
            revert("mission formula has cycles/loops");

        formulaRootNodeId = rootId;
    }

    // detect Cycle in a directed binary tree
    function hasCycle(DQuestStructLib.MissionNode[] memory nodes, uint256 rootNodeId) private returns(bool) {
        bool[] memory visited = new bool[](nodes.length);
        id2itr1._setIterators(nodes);
        return hasCycleUtil(nodes, visited, rootNodeId);
    }

    // cycle detection helper
    function hasCycleUtil(
        DQuestStructLib.MissionNode[] memory nodes,
        bool[] memory visited,
        uint256 id
    ) private returns (bool) {
        DQuestStructLib.MissionNode memory node = nodes[id2itr1._getIterator(id)];
        visited[id2itr1._getIterator(id)] = true;
        if (node.leftNode != 0) {
            if (visited[id2itr1._getIterator(node.leftNode)]) {
                return true;
            }
            if (hasCycleUtil(nodes, visited, node.leftNode)) {
                return true;
            }
        }
        if (node.rightNode != 0) {
            if (visited[id2itr1._getIterator(node.rightNode)]) {
                return true;
            }
            if (hasCycleUtil(nodes, visited, node.rightNode)) {
                return true;
            }
        }
        return false;
    }

    // support find root node of a binary tree
    function findRoot(DQuestStructLib.MissionNode[] memory tree) private returns (uint256) {
        uint256 n = tree.length;
        id2itr2._setIterators(tree);
        bool[] memory isChild = new bool[](n);

        for (uint256 i = 0; i < n; i++) {
            if (tree[i].leftNode != 0) {
                isChild[id2itr2._getIterator(tree[i].leftNode)] = true;
            }
            if (tree[i].rightNode != 0) {
                isChild[id2itr2._getIterator(tree[i].rightNode)] = true;
            }
        }

        uint256 rootNode = 0;
        uint256 rootCount = 0;
        for (uint256 i = 0; i < n; i++) {
            if (!isChild[i]) {
                rootCount++;
                rootNode = tree[i].id;
                if (rootCount > 1)
                    revert("tree contains more than one root node");
            }
        }

        // there's no node that's referenced by nothing(the root node)
        if (rootCount == 0)
            revert("no root found");

        return rootNode;
    }

    function erc721SetTokenUsed(uint256 missionNodeId, address addr, uint256 tokenId) external override {
        DQuestStructLib.MissionNode memory node = missionNodeFormulas._getNode(missionNodeId);
        require(msg.sender == node.missionHandlerAddress, "Can not update cross-mission states");
        tokenUsed[addr][tokenId] = true;
    }

    function erc721GetTokenUsed(address addr, uint256 tokenId) external view override returns(bool) {
        return tokenUsed[addr][tokenId];
    }
}
