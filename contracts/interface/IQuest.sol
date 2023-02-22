// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "../lib/DQuestStructLib.sol";

/// @title An interface for a Quest contract
/// @notice Quest contract is use to manage Questers, Missions and Outcomes
interface IQuest {
    /// @dev Possible states of a Quest
    /// States:
    /// - NotStarted = The quest has not yet started.
    /// - Active = The quest is currently ongoing, between its start and end times.
    /// - Closed = The quest has expired.
    enum QuestStatus {
        NotStarted,
        Active,
        Closed
    }

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
    /// @param missionNodes An array of MissionNode objects.
    event MissionNodeFormularsSet(DQuestStructLib.MissionNode[] missionNodes);

    /// @notice This event is triggered when the set of outcomes is updated.
    /// @param outcomes An array of Outcome objects.
    event OutcomeSet(DQuestStructLib.Outcome[] outcomes);

    /// @notice This event is triggered when an outcome is executed on a quester.
    /// @param quester The address of the quester who outcome is being executed on.
    event OutcomeExecuted(address indexed quester);

    /// @notice This event is triggered when a new quester is added to the system.
    /// @param quester The address of the newly added quester.
    event QuesterAdded(address indexed quester);

    /// @notice This event is triggered when Quest is paused.
    event QuestPaused();

    /// @notice This event is triggered when Quest is unpaused.
    event QuestUnpaused();

    /// SETTER

    /// @notice Set the mission node formulas for this quest.
    /// @dev The input array must follow the AND/OR tree rule, or the function will revert.
    /// @param missionNodes An array of MissionNode structs.
    function setMissionNodeFormulars(DQuestStructLib.MissionNode[] calldata missionNodes) external;

    /// @notice Set the outcomes for this quest.
    /// @param outcomes An array of Outcome structs.
    function setOutcomes(DQuestStructLib.Outcome[] calldata outcomes) external;

    /// @notice Change status of quester's mission
    /// @dev Only Oracles able to set mission status
    /// @param quester Quester to change mission's status
    /// @param missionNodeId Mission node ID of inside the missionNodeFormulars
    /// @param isMissionDone Status of a quester's mission
    function setMissionStatus(
        address quester,
        uint256 missionNodeId,
        bool isMissionDone
    ) external;

    /// QUEST FUNCTIONS

    /// @notice Pauses the Quest
    /// @dev Only the owner of the Quest can call this function. Also requires that the QuestStatus is Active.
    function pauseQuest() external;

    /// @notice Unpauses the Quest
    /// @dev Only the owner of the Quest can call this function. Also requires that the QuestStatus is Active.
    function unpauseQuest() external;

    /// @notice Update and return the quester's progress.
    /// @dev Only the quester can call this function to validate their quests.
    /// This function checks the status of all of the quester's missions and updates the
    /// allQuesterStatuses mapping.
    /// @return questerProgress The latest Quester progress status after validating all missions.
    function validateQuest() external returns (QuesterProgress questerProgress);

    /// @notice Validate a specific mission of caller
    /// @param missionNodeId Mission node ID of inside the missionNodeFormulars
    function validateMission(uint256 missionNodeId) external;

    /// @notice Execute a defined outcome of the quest.
    /// @dev This function is public and can only be called by anyone.
    /// Whether the quester is eligible to receive the outcome depends on the allQuesterStatuses mapping.
    /// @param quester The quester who wants to receive the quest's outcome.
    /// @return executeSuccess Returns `true` if the outcome is executed successfully.
    /// Returns `false` if the execution fails or the quest is closed.
    function executeQuestOutcome(address quester) external returns (bool executeSuccess);

    /// QUESTER FUNCTIONS

    /// @notice Add the caller to the quest as a quester.
    /// @dev This function adds `msg.sender` to the `allQuesters` array.
    /// @return addSuccess Returns `false` if the caller is already inside the quest or the quest is closed.
    function addQuester() external returns (bool addSuccess);

    /// @notice Get the total number of questers who have joined the current quest.
    /// @return totalQuesters Returns the number of questers in the quest.
    function getTotalQuesters() external view returns (uint256 totalQuesters);
}
