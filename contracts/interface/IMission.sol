// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "../lib/DQuestStructLib.sol";

/// @title An interface for a Mission contract
/// @notice Mission contract is used to verify certain mission logic and cache mission status
interface IMission {
    //TODO just emit enough
    event MissionValidated(address quester, DQuestStructLib.MissionNode node);

    /**
     * @dev Validates the mission submitted.
     * @notice caller MUST belong to d.quest's quest contracts
     * @param quester The address of the quester submitting the mission.
     * @param node The mission to be validated.
     * @return isComplete Returns validation result
     */
    function validateMission(
        address quester,
        DQuestStructLib.MissionNode calldata node
    ) external returns (bool isComplete);
}
