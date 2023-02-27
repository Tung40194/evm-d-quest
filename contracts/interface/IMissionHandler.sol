// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./../lib/DQuestStructLib.sol";
import "./IChainlinkMissionHandler.sol";

interface IMissionHandler is IChainlinkMissionHandler {
    event MissionValidated(bytes32 indexed requestId, address quester, uint256 missionId, bool completed);

    function validateMission(address quester, DQuestStructLib.MissionNode memory missionNode) external;
}
