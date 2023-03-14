// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../lib/DQuestStructLib.sol";

interface IDQuest {
    /**
    * @dev Creates a new Quest contract as a beacon proxy.
    * @param nodes An array of mission nodes for the new proxy contract.
    * @param outcomes An array of outcomes for the new proxy contract.
    * @param startTime The start time of the new proxy contract.
    * @param endTime The end time of the new proxy contract.
    */
    function createQuest(DQuestStructLib.MissionNode[] memory nodes, DQuestStructLib.Outcome[] memory outcomes, uint256 startTime, uint256 endTime) external;

    /**
    * @notice Returns the address of the current implementation contract.
    * @return Address of the current implementation contract.
    */
    function getImplementation() external view returns (address);

    /**
    * @notice Returns the address of the beacon contract.
    * @return Address of the beacon contract.
    */
    function getBeacon() external view returns (address);

    /**
    * @notice Returns the address of the beacon proxy contract at the given index.
    * @param index The index of the beacon proxy contract.
    * @return Address of the beacon proxy contract.
    */
    function getQuest(uint256 index) external view returns (address);

    /**
    * @notice Returns the number of beacon proxy contracts created.
    * @return Number of beacon proxy contracts created.
    */
    function getQuestCount() external view returns (uint256);

    /**
    * @notice Upgrades the implementation contract for all beacon proxy contracts.
    * @param implContract Address of the new implementation contract.
    */
    function upgradeQuests(address implContract) external;

    /**
    * @dev Determines whether the provided contract address is a Quest.
    * @param contractAddr The address of the contract to check.
    * @return A boolean value indicating whether the contract is a Quest.
    */
    function isQuest(address contractAddr) external view returns(bool);

    /**
    * @dev Returns an array of all Quest contract addresses.
    * @return An array of all Quest contract addresses.
    */
    function getAllQuests() external view returns (address[] memory);

    /**
    * @dev Returns an array of Quest contract addresses created by the specified Quester.
    * @param quester The address of the Quester to get Quests from.
    * @return An array of Quest contract addresses created by the specified Quester.
    */
    function getQuests(address quester) external view returns (address[] memory);
}
