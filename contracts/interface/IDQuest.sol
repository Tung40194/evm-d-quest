// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../lib/DQuestStructLib.sol";

interface IDQuest {
    function createQuest(DQuestStructLib.MissionNode[] memory missionFormular, DQuestStructLib.Outcome[] memory allOutcomes) external returns(address);
    function getAllQuests() external view returns (address[] memory);
    function getQuests(address Quester) external view returns (address[] memory);
}