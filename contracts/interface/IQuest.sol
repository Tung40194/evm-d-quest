// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "../lib/DQuestStructLib.sol";

/// @title An interface for a Quest contract
/// @notice Quest contract is use to manage Questers, Missions and Outcomes
interface IQuest {
    /// @dev Possible states of a Quest
    /// States:
    /// - Ready = The quest has not yet started.
    /// - Active = The quest is currently ongoing, between its start and end times.
    /// - Close = The quest has expired or been paused.
    enum QuestStatus {
        Ready,
        Active,
        Close
    }

    /// @dev Defines the possible states of a quester's status.
    /// States:
    /// - InProgress = The quester has joined the quest and doing mission.
    /// - Completed = The quester has finished all missions in the quest.
    /// - Rewarded = The quester has successfully completed the quest and received a reward.
    enum MyQuestStatus {
        InProgress,
        Completed,
        Rewarded
    }

    /// @notice This event is triggered when the set of mission nodes is updated.
    /// @param missionNodes An array of MissionNode objects.
    event MissionNodeFormularsSet(MissionNode[] missionNodes);

    /// @notice This event is triggered when the set of outcomes is updated.
    /// @param outcomes An array of Outcome objects.
    event OutcomeSet(Outcome[] outcomes);

    /// @notice This event is triggered when an outcome is executed on a quester.
    /// @param quester The address of the quester who outcome is being executed on.
    event OutcomeExecuted(address indexed quester);

    /// @notice This event is triggered when a new quester is added to the system.
    /// @param quester The address of the newly added quester.
    event QuesterAdded(address indexed quester);

    /// @notice Set the mission node formulas for this quest.
    /// @dev The input array must follow the AND/OR tree rule, or the function will revert.
    /// @param missionNodes An array of MissionNode structs.
    function setMissionNodeFormulars(MissionNode[] calldata missionNodes) external;

    /// @notice Set the outcomes for this quest.
    /// @dev Anyone can execute an outcome if the quester is eligible.
    /// @param outcomes An array of Outcome structs.
    function setOutcomes(Outcome[] calldata outcomes) external;

    /// @notice Update and return the quester's status.
    /// @dev Only the quester can call this function to validate their quests.
    /// This function checks the status of all of the quester's missions and updates the
    /// allQuesterStatuses mapping.
    /// @return questerStatus The latest Quester status after validating all missions.
    function validateQuest() external returns (MyQuestStatus questerStatus);

    /// @notice Execute a defined outcome of the quest.
    /// @dev This function is public and can only be called by anyone.
    /// Whether the quester is eligible to receive the outcome depends on the allQuesterStatuses mapping.
    /// @param quester The quester who wants to receive the quest's outcome.
    /// @return executeSuccess Returns `true` if the outcome is executed successfully.
    /// Returns `false` if the execution fails or the quest is closed.
    function executeQuestOutcome(address quester) external returns (bool executeSuccess);

    /// @notice Add the caller to the quest as a quester.
    /// @dev This function adds `msg.sender` to the `allQuesters` array.
    /// @return addSuccess Returns `false` if the caller is already inside the quest or the quest is closed.
    function addQuester() external returns (bool addSuccess);

    /// @notice Get the total number of questers who have joined the current quest.
    /// @return totalQuesters Returns the number of questers in the quest.
    function getTotalQuesters() external view returns (uint256 totalQuesters);
}
