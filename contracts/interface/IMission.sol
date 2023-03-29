// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import "../lib/Types.sol";

/* @title An interface for a Mission contract
 * @notice Mission contract is used to verify certain mission logic and cache mission status
 * @notice MUST define data schema to decode object node.data in validateMission() method.
 * Quest Admin utilizing Dquest::createQuest will follow schema to encode the data
 */
interface IMission {
    /**
     * @dev Validates the mission submitted.
     * @notice caller MUST belong to d.quest's quest contracts. Use DQuest::isQuest() method to verify
     * @param quester The address of the quester submitting the mission.
     * @param node The mission to be validated.
     * @return isComplete Returns validation result
     */
    function validateMission(address quester, Types.MissionNode calldata node) external returns (bool isComplete);
}
