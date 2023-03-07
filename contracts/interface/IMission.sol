// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "../lib/DQuestStructLib.sol";

/// @title An interface for a Mission contract
/// @notice Mission contract is used to verify certain mission logic
interface IMission {
    //TODO just emit enough
    //     mapping(address quester => mapping(uint256 missionNodeId => bool isDone)) questerMissionsDone;
    event MissionValidated(address quester, DQuestStructLib.MissionNode node);

    /**
     * @dev Validates the mission submitted.
     * @notice caller MUST be one of d.quest's quest contracts
     * @notice Must update quest's questerMissionsDone via e.g. setMissionStatus()
     * for on-chain missions. For off-chain missions, it can be done via fulfill() method.
     * @param quester The address of the quester submitting the mission.
     * @param node The mission to be validated.
     * @return isComplete Returns validation result
     */
    function validateMission(
        address quester,
        DQuestStructLib.MissionNode calldata node
    ) external returns (bool isComplete);
}
