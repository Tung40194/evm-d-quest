// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "../lib/DQuestStructLib.sol";

/// @title An interface for a Quest contract
/// @notice Quest contract is use to manage Questers, Missions and Outcomes
interface IQuest {

    /// @dev Defines the possible states of a quester's status to current quest.
    /// States:
    /// - NotEnrolled = The quester hasn't joined the quest.
    /// - InProgress = The quester has joined the quest and doing mission.
    /// - Completed = The quester has finished all missions in the quest.
    /// - Rewarded = The quester has successfully completed the quest and received a reward.
    enum QuesterProgress {
        NotEnrolled,
        InProgress,
        Completed,
        Rewarded
    }

    /// EVENTS

    /// @notice This event is triggered when the set of mission nodes is updated.
    /// @param missionFormulas An array of MissionNode objects.
    event MissionNodeFormulasSet(DQuestStructLib.MissionNode[] missionFormulas);

    /// @notice This event is triggered when the set of outcomes is updated.
    /// @param outcomes An array of Outcome objects.
    event OutcomeSet(DQuestStructLib.Outcome[] outcomes);

    /// @notice This event is triggered when an outcome is executed on a quester.
    /// @param quester The address of the quester who outcome is being executed on.
    event OutcomeExecuted(address indexed quester);

    /// @notice This event is triggered when a new quester is added to the system.
    /// @param quester The address of the newly added quester.
    event QuesterAdded(address indexed quester);

    /// SETTER

    /**
     * @dev Sets the formulas for the mission nodes.
     * @notice Only the contract owner can call this function.
     * @param nodes The array of mission nodes to set. MUST be a directed binary tree.
     * Emits a `MissionNodeFormulasSet` event.
     *
     * We have 2 kinds of node:
     *  - Mission node (see the M* nodes at the tree below)
     *  - Operator node (see AND and OR node at the tree below)
     *
     * Input constraints (`nodes`'s constraints):
     *  - Nodes' ids MUST be unique.
     *  - Nodes' ids MUST be positive integers in range [1:].
     *  - LeftNode/RightNode MUST be either 0 or refer to other nodes' ids.
     *  - In case of leafNode (also Mission node(not "operator" node)), its LeftNode/RightNode must be both 0.
     *  - The input array `nodes` MUST not contain any cycles.
     * 
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
     * FYI:
     *  - The numbers in the parentheses are the indexes of the nodes
     */
    function setMissionNodeFormulas(DQuestStructLib.MissionNode[] calldata nodes) external;

    /// @notice Set the outcomes for this quest.
    /// @param outcomes An array of Outcome structs.
    function setOutcomes(DQuestStructLib.Outcome[] calldata outcomes) external;

    /// QUEST FUNCTIONS
    
    /**
     * @dev Sets the status of a mission for a specific quester.
     * Only dquest oracle can call this function.
     * @param quester The address of the quester.
     * @param missionNodeId The ID of the mission node.
     * @param isMissionDone The status of the mission.
     */
    function setMissionStatus(address quester, uint256 missionNodeId, bool isMissionDone) external;

    /**
     * @dev Pauses the quest.
     * Only the contract owner can call this function.
     * Emits a `Paused` event.
     */
    function pauseQuest() external;

    /**
     * @dev Resumes the quest.
     * Only the contract owner can call this function.
     * Emits a `Unpaused` event.
     */
    function resumeQuest() external;

    /**
     * @dev A function to evaluate the tree for a user
     * @return isComplete Returns validation result.
     */
    function validateQuest() external returns (bool isComplete);

    /**
     * @dev Validates a mission for the given mission node ID.
     * @param missionNodeId MUST be the id of mission node (isMission == true).
     * @return isComplete Returns validation result.
     * Emits a `MissionValidated` event.
     */
    function validateMission(uint256 missionNodeId) external returns (bool isComplete);

    /// @notice Execute a defined outcome of the quest.
    /// @dev This function is public and can only be called by anyone.
    /// Whether the quester is eligible to receive the outcome depends on the allQuesterStatuses mapping.
    /// @param quester The quester who wants to receive the quest's outcome.
    /// @return executeSuccess Returns `true` if the outcome is executed successfully.
    /// Returns `false` if the execution fails or the quest is closed.
    function executeQuestOutcome(address quester) external returns (bool executeSuccess);

    /// QUESTER FUNCTIONS

    /**
     * @dev Adds a new quester to the list of all questers.
     * Only callable when the contract is active.
     * Emits a `QuesterAdded` event.
     */
    function addQuester() external;

    /**
     * @dev Returns the total number of questers.
     * @return totalQuesters total number of questers.
     */
    function getTotalQuesters() external view returns (uint256 totalQuesters);
}
