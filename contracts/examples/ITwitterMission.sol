// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITwitterMission {
    event RequestMissionStatus(bytes32 indexed requestId, string status);

    function requestMissionStatus(string memory userId) external returns (bytes32 requestId);

    function fulfill(bytes32 requestId, string memory status) external;

    function statusOf(string memory userId) external view returns (string memory);
}
