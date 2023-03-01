// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./lib/DQuestStructLib.sol";
import "./interface/IQuest.sol";
import "./interface/IMission.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract Quest is IQuest, Initializable, OwnableUpgradeable, PausableUpgradeable {
    address public oracle; // todo: single or many oracles for dquest?
    DQuestStructLib.MissionNode[] missionNodeFormulas;
    address[] allQuesters;
    mapping(address quester =>  QuesterProgress progress) questerProgresses;
    mapping(address quester => mapping(uint256 missionNodeId => bool isDone)) questerMissionsDone;
    uint256 startTimestamp;
    uint256 endTimestamp;
    QuestStatus public status;

    modifier onlyOracle() {
        require(msg.sender == oracle, "For oracle only");
        _;
    }

    // TODO: check allQuesters's role
    modifier onlyQuester() {
        require(
            questerProgresses[msg.sender] != QuesterProgress.NotEnrolled,
            "For questers only"
        );

        _;
    }
    
    modifier whenActive() {
        require(status == QuestStatus.Active, "Quest is not Active");
        _;
    }

    // modifier whenClosed() {
    //     require(status != QuestStatus.Closed, "Quest is paused/closed.");
    //     _;
    // }

    /**
    * @dev Initializes the contract with the specified mission nodes and quest start/end times.
    * @notice This function can only be called during the initialization phase of the contract.
    * @notice Check docstrings of setMissionNodeFormulas carefully
    * @param _nodes The array of mission nodes to set.
    * @param _questStartTime The timestamp at which the quest starts.
    * @param _questEndTime The timestamp at which the quest ends.
    * Emits a `MissionNodeFormulasSet` event.
    */
    function init(
        DQuestStructLib.MissionNode[] calldata _nodes,
        uint256 _questStartTime,
        uint256 _questEndTime
    ) internal onlyInitializing {
        //TODO check carefully
        __Ownable_init();
        __Pausable_init();
        setMissionNodeFormulas(_nodes);
        startTimestamp = _questStartTime;
        endTimestamp = _questEndTime;
    }

    /**
    * @dev Sets the oracle address for the contract.
    * Only the contract owner can call this function.
    * @param _oracle The new oracle address.
    */
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    /**
     * @dev Sets the formulas for the mission nodes.
     * @notice Only the contract owner can call this function.
     * @param _nodes The array of mission nodes to set.
     * Emits a `MissionNodeFormulasSet` event.
     * Warning: wrong order in the input array can fail the entire formula
     * For example given a formula: ((M1 AND M2 AND M3) OR (M4 AND M1))
     * We have the following tree:
     *                             OR(0)
     *                           /        `
     *                          /            `
     *                         /                `
     *                     AND(1)                  `AND(2)
     *                    /      `                 /      `
     *                   /         `              /         `
     *               AND(3)          `M3(4)     M4(5)         `M1(6)
     *              /    `
     *             /       `
     *           M1(7)       `M2(8)
     *
     * The numbers in the parentheses are the indexes of the nodes and each
     * node should be added to the tree in that exact order (0->1->2-> ...)
     * otherwise the entire formula can fail.
     * A correct orderredly constructed array should be: [node0, node1, node2, ... node8]
    */
    function setMissionNodeFormulas(DQuestStructLib.MissionNode[] calldata _nodes)
        public
        override
        onlyOwner
    {
        require(_nodes.length > 0, "Empty node list");
        // TODO: Validation of input mission nodes?
        for (uint i = 0; i < _nodes.length; i++) {
            missionNodeFormulas[i] = _nodes[i];
        }
        emit MissionNodeFormulasSet(_nodes);
    }

    /**
    * @dev Sets the status of a mission for a specific quester.
    * Only the oracle can call this function.
    * @param quester The address of the quester.
    * @param missionNodeId The ID of the mission node.
    * @param isMissionDone The status of the mission.
    */
    function setMissionStatus(
        address quester,
        uint256 missionNodeId,
        bool isMissionDone
    ) external onlyOracle {
        questerMissionsDone[quester][missionNodeId] = isMissionDone;
    }

    /**
     * @dev evaluate mission formula
     * @param nodeId Always the root node of the formula
     * @param user address of user's to be verified
     */
    function evalMF(
        uint256 nodeId,
        address user
    ) private returns (bool) {
        DQuestStructLib.MissionNode memory node = missionNodeFormulas[nodeId];
        if (node.isMission) {
            IMission mission = IMission(node.missionHandlerAddress);
            return mission.validateMission(user, node);
        } else {
            bool leftResult = evalMF(node.leftNode, user);
            bool rightResult = evalMF(node.rightNode, user);
            if (node.operatorType == DQuestStructLib.OperatorType.AND) {
                return leftResult && rightResult;
            } else {
                return leftResult || rightResult;
            }
        }
    }

    /**
     * @dev A function to evaluate the tree for a user
     */
    function validateQuest() external override onlyQuester whenNotPaused returns (bool) {
        return evalMF(0, msg.sender);
    }

    /**
    * @dev Validates a mission for the given mission node ID.
    * @param _missionNodeId The ID of the mission node to validate.
    * Emits a `MissionValidated` event.
    */
    function validateMission(uint256 _missionNodeId) external override onlyQuester whenNotPaused returns(bool) {
        DQuestStructLib.MissionNode memory node = missionNodeFormulas[_missionNodeId];
        IMission mission = IMission(node.missionHandlerAddress);
        return mission.validateMission(msg.sender, node);
    }

    /**
    * @dev Pauses the quest.
    * Only the contract owner can call this function.
    * Emits a `Paused` event.
    */
    function pauseQuest() external override onlyOwner {
        _pause();
    }

    /**
    * @dev Resumes the quest.
    * Only the contract owner can call this function.
    * Emits a `Unpaused` event.
    */
    function resumeQuest() external override onlyOwner {
        _unpause();
    }

    /**
    * @dev Adds a new quester to the list of all questers.
    * Only callable when the contract is active.
    * Emits a `QuesterAdded` event.
    */
    function addQuester() external override whenActive {
        require(questerProgresses[msg.sender] == QuesterProgress.NotEnrolled, "Quester already joined");
        allQuesters.push(msg.sender);
        questerProgresses[msg.sender] = QuesterProgress.InProgress;
        emit QuesterAdded(msg.sender);
    }

    /**
    * @dev Returns the total number of questers.
    * @return totalQuesters total number of questers.
    */
    function getTotalQuesters() external view override returns (uint256 totalQuesters) {
        return allQuesters.length;
    }

    /**
    * @dev Sets the list of possible outcomes for the quest.
    * Only the contract owner can call this function.
    * @param _outcomes The list of possible outcomes to set.
    */
    function setOutcomes(DQuestStructLib.Outcome[] calldata _outcomes) external override onlyOwner {
        // TODO
    }

    /**
    * @dev Executes the quest outcome for the specified quester.
    * Only the quest can call this function when the quest is active.
    * @param _quester The address of the quester whose outcome to execute.
    * @return result Whether the outcome was successfully executed.
    */
    function executeQuestOutcome(address _quester) external override whenActive returns (bool result) {
        //TODO
    }
}