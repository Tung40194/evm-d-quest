// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../lib/Types.sol";

/*
 * @title An interface for a Quest contract
 * @notice Quest contract is use to manage Questers, Missions and Outcomes
 */
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
    event MissionNodeFormulasSet(Types.MissionNode[] missionFormulas);

    /// @notice This event is triggered when the set of outcomes is updated.
    /// @param outcomes An array of Outcome objects.
    event OutcomeSet(Types.Outcome[] outcomes);

    /// @notice This event is triggered when an outcome is executed on a quester.
    /// @param quester The address of the quester who outcome is being executed on.
    event OutcomeExecuted(address indexed quester);

    /// @notice This event is triggered when a new quester is enrolled to the system.
    /// @param quester The address of the newly added quester.
    event QuesterJoined(address indexed quester);

    /// @notice This event is triggered when native coin is transfered to Quest contract
    /// @param sender The address of sender.
    /// @param amount The total amount of native coin reward.
    event Received(address indexed sender, uint indexed amount);

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
     *                             OR(1)
     *                           /        `
     *                          /            `
     *                         /                `
     *                     AND(2)                  `AND(3)
     *                    /      `                 /      `
     *                   /         `              /         `
     *               AND(4)          `M3(5)     M4(6)         `M1(7)
     *              /    `
     *             /       `
     *           M1(8)       `M2(9)
     *
     * FYI:
     *  - The numbers in the parentheses are the indexes of the nodes
     */
    function setMissionNodeFormulas(Types.MissionNode[] calldata nodes) external;

    /**
     * @notice Set the outcomes for this quest.
     * @param outcomes An array of Outcome structs.
     */
    function setOutcomes(Types.Outcome[] calldata outcomes) external;

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

    /**
     * @notice Execute a defined outcome of the quest.
     * @dev This function is public and can only be called by anyone.
     * Whether the quester is eligible to receive the outcome depends on the allQuesterStatuses mapping.
     * @param quester The quester who wants to receive the quest's outcome.
     */
    function executeQuestOutcome(address quester) external;

    /**
     * @dev quester calls this function to get enrolled.
     * Only callable when the contract is active and only when user has not joined before.
     * Emits a `QuesterJoined` event.
     */
    function join() external;

    /**
     * @dev Returns the total number of questers.
     * @return totalQuesters total number of questers.
     */
    function getTotalQuesters() external view returns (uint256 totalQuesters);

    /**
     * @dev Marks an ERC721 token as used for this Quest.
     * @param missionNodeId The ID of the mission node to associate the token with.
     * @param tokenAddr The address of the ERC721 token contract.
     * @param tokenId The ID of the ERC721 token to mark as used.
     * @notice This function can only be called by the mission handler associated with the specified mission node.
     * @notice Once a token has been marked as used for a quest, it cannot be used by any other questers on that Quest.
     */
    function erc721SetTokenUsed(uint256 missionNodeId, address tokenAddr, uint256 tokenId) external;

    /**
     * @dev Checks if an ERC721 token has been marked as used for this Quest.
     * @param addr The address of the ERC721 token contract.
     * @param tokenId The ID of the token to check.
     * @return bool Returns true if the token has been marked as used for the specified mission node, false otherwise.
     */
    function erc721GetTokenUsed(address addr, uint256 tokenId) external view returns (bool);

    /**
     * @dev get missions.
     * @return an array of mission nodes.
     */
    function getMissions() external view returns (Types.MissionNode[] memory);

    /**
     * @dev get outcomes.
     * @return an array of mission outcomes.
     */
    function getOutcomes() external view returns (Types.Outcome[] memory);
}
