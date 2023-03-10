// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./lib/DQuestStructLib.sol";
import "./lib/MissionFormula.sol";
import "./lib/OutcomeManager.sol";
import "./interface/IQuest.sol";
import "./interface/IMission.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract Quest is IQuest, Initializable, OwnableUpgradeable, PausableUpgradeable {
    using MissionFormula for MissionFormula.efficientlyResetableFormula;
    using OutcomeManager for OutcomeManager.efficientlyResetableOutcome;

    address public dQuestOracle; // todo: single or many oracles for dquest?
    MissionFormula.efficientlyResetableFormula missionNodeFormulas;
    OutcomeManager.efficientlyResetableOutcome outcomes;
    address[] allQuesters;
    mapping(address quester =>  QuesterProgress progress) questerProgresses;
    mapping(address quester => mapping(uint256 missionNodeId => bool isDone)) questerMissionsDone;
    uint256 startTimestamp;
    uint256 endTimestamp;

    bytes4 constant SELECTOR_TRANSFERFROM = bytes4(keccak256(bytes("transferFrom(address,address,uint256)")));
    bytes4 constant SELECTOR_SAFETRANSFERFROM = bytes4(keccak256(bytes("safeTransferFrom(address,address,uint256)")));
    bytes4 constant SELECTOR_NFTSTANDARDMINT =
        bytes4(keccak256(bytes("mint(uint256,address[],uint256,uint256[],bytes32[])")));
    bytes4 constant SELECTOR_SBTMINT = bytes4(keccak256(bytes("mint(address[],uint256)")));

    // TODO: check allQuesters's role
    modifier onlyQuester() {
        require(
            questerProgresses[msg.sender] != QuesterProgress.NotEnrolled,
            "For questers only"
        );
        _;
    }

    modifier questerNotEnrolled() {
        require(
            questerProgresses[msg.sender] == QuesterProgress.NotEnrolled,
            "Quester already joined"
        );
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
        DQuestStructLib.MissionNode[] calldata nodes,
        DQuestStructLib.Outcome[] calldata outcomes,
        uint256 questStartTime,
        uint256 questEndTime
    ) internal onlyInitializing {
        //TODO check carefully
        require(questStartTime < questEndTime, "Invalid quest lifetime");
        __Ownable_init();
        __Pausable_init();
        setMissionNodeFormulas(nodes);
        setOutcomes(outcomes);
        startTimestamp = questStartTime;
        endTimestamp = questEndTime;
    }

    function setMissionStatus(
        address quester,
        uint256 missionNodeId,
        bool isMissionDone
    ) public {
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
        require(nodes.length > 0, "Empty node list");
        // TODO: Validation of input mission nodes: mission interface, binary tree index...
        missionNodeFormulas._set(nodes);
        emit MissionNodeFormulasSet(nodes);
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
        //TODO validate the binary tree's depth
        DQuestStructLib.MissionNode memory node = missionNodeFormulas._getNode(nodeId);
        if (node.isMission) {
            return validateMission(nodeId);
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

    function validateQuest() external override onlyQuester whenNotPaused returns (bool) {
        bool result = evalMF(0, msg.sender);
        if (result == true) {
            questerProgresses[msg.sender] = QuesterProgress.Completed;
        } else {
            questerProgresses[msg.sender] = QuesterProgress.InProgress;
        }
        return result;
    }

    function validateMission(uint256 missionNodeId) public override onlyQuester whenNotPaused returns(bool) {
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
        require(_outcomes.length > 0, "No outcome provided");
        
        for (uint256 i = 0; i < _outcomes.length; i++) {
            if (_outcomes[i].isNative) {
                require(_outcomes[i].nativeAmount > 0, "Insufficient native reward amount");
                outcomes._set(_outcomes);
            } else {
            require(_outcomes[i].tokenAddress != address(0), "Outcome address is invalid");
            require(_outcomes[i].functionSelector != 0, "functionSelector can't be empty");
            require(
                keccak256(abi.encodePacked(_outcomes[i].data)) != keccak256(abi.encodePacked("")),
                "outcomeData can't be empty"
            );
            outcomes._set(_outcomes);
            }
        }

        emit OutcomeSet(_outcomes);
    }

    /**
    * @dev Executes the quest outcome for the specified quester.
    * Only the quest can call this function when the quest is active.
    * @param _quester The address of the quester whose outcome to execute.
    * @return result Whether the outcome was successfully executed.
    */
    function executeQuestOutcome(address _quester) external override whenActive returns (bool result) {
        require(questerProgresses[_quester] == QuesterProgress.Completed, "Quester hasn't completed the Quest");
           for (uint256 i = 0; i < EnumerableSet.length(outcomes.ero[outcomes.outPtr]._keys); i++) {
            if (outcomes._getOutcome(i).isNative) {
                _executeNativeOutcome(_quester, outcomes._getOutcome(i));
            }
            if (outcomes._getOutcome(i).functionSelector == 0x23b872dd) {
                _executeERC20Outcome(_quester, outcomes._getOutcome(i));
            }
            if (outcomes._getOutcome(i).functionSelector == 0x42842e0e) {
                (bytes memory newData) = _executeERC721Outcome(_quester, outcomes._getOutcome(i));
                outcomes._getOutcome(i).data = newData;
            }
            if (outcomes._getOutcome(i).functionSelector == 0xea66696c) {
                _executeSBTOutcome(_quester, outcomes._getOutcome(i));
            }
            if (outcomes._getOutcome(i).functionSelector == 0x699a0077) {
                _executeNFTStandardOutcome(_quester, outcomes._getOutcome(i));
            }
        }
        questerProgresses[_quester] = QuesterProgress.Rewarded;
        emit OutcomeExecuted(_quester);  
        return true;
    }

    function _executeERC20Outcome(address _quester, DQuestStructLib.Outcome memory outcome)
        internal
    {
        address spender;
        uint256 value;
        assembly {
            spender := mload(add(outcome, 36))
            value := mload(add(outcome, 100))
        }

        (bool success, bytes memory response) = outcome.tokenAddress.call(
            abi.encodeWithSelector(SELECTOR_TRANSFERFROM, spender, _quester, value)
        );

        require(success, string(response));
    }

    /**
    * @dev Executes the ERC721Outcome for the specified quester.
    * It's currently implemented with 
    * Admin: setApprovalForAll from Admin's balance
    * tokenId: sequential tokenId with 1st tokenId passing to Outcome.data
    * @param _quester The address of the quester whose outcome to execute.
    * @return newData for Outcome Struct 
    */
    function _executeERC721Outcome(address _quester, DQuestStructLib.Outcome memory outcome)
        internal
        returns (bytes memory newData)
    {
        address spender;
        uint256 tokenId;

        assembly {
            spender := mload(add(outcome, 36))
            tokenId := mload(add(outcome, 100))
        }

        (bool success, bytes memory response) = outcome.tokenAddress.call(
            abi.encodeWithSelector(SELECTOR_SAFETRANSFERFROM, spender, _quester, tokenId)
        );
        require(success, string(response));

        bytes memory _newData = abi.encodeWithSelector(SELECTOR_SAFETRANSFERFROM, spender, _quester, tokenId++);

        return (_newData);
    }

    function _executeNFTStandardOutcome(address _quester, DQuestStructLib.Outcome memory outcome)
        internal
    {
        uint256 mintingConditionId;
        uint256 amount;
        address[] memory quester = new address[](1);
        uint256[] memory clientIds;
        bytes32[] memory merkleRoot = new bytes32[](1);

        quester[0] = _quester;
        merkleRoot[0] = 0x0000000000000000000000000000000000000000000000000000000000000000;

        assembly {
            mintingConditionId := mload(add(outcome, 164))
            amount := mload(add(outcome, 228))
        }

        (bool success, bytes memory response) = outcome.tokenAddress.call(
            abi.encodeWithSelector(
                SELECTOR_NFTSTANDARDMINT,
                mintingConditionId,
                quester,
                amount,
                clientIds,
                merkleRoot
            )
        );
        
        require(success, string(response));
    }

    function _executeSBTOutcome(address _quester, DQuestStructLib.Outcome memory outcome)
        internal
    {
        uint256 expiration;
        address[] memory quester = new address[](1);
        quester[0] = _quester;

        assembly {
            expiration := mload(add(outcome, 196))
        }

        (bool success, bytes memory response) = outcome.tokenAddress.call(
            abi.encodeWithSelector(SELECTOR_SBTMINT, quester, expiration)
        );

        require(success, string(response));
    }

    function _executeNativeOutcome(address _quester, DQuestStructLib.Outcome memory outcome)
        internal
    {
        (bool sent, bytes memory data) = payable(_quester).call{value: outcome.nativeAmount}("");
        require(sent, string(data));
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}