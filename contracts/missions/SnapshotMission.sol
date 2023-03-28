// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./ChainlinkMissionHandler.sol";
import "../interface/IDQuest.sol";
import "../interface/IMission.sol";
import "../lib/Types.sol";
import "../lib/BytesConversion.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SnapshotMission is IMission, ChainlinkMissionHandler {
    using BytesConversion for bytes;
    using Strings for address;
    using Strings for uint256;

    address public dquestContract;
    mapping(uint256 => address) public missionQuests;

    constructor(
        address dQuest,
        address linkAddr,
        address oracleAddr,
        bytes32 jobId
    ) ChainlinkMissionHandler(linkAddr, oracleAddr, jobId) {
        require(dQuest != address(0x0), "dquest can't be 0x0");
        dquestContract = dQuest;
    }

    function validateMission(address quester, Types.MissionNode calldata node) external returns (bool isComplete) {
        // store quest address by missionId

        bool isValidRequester = IDQuest(dquestContract).isQuest(msg.sender) || msg.sender == owner();
        require(isValidRequester, "Invalid requester");

        if (missionQuests[node.id] == address(0)) missionQuests[node.id] = msg.sender;

        // start decoding node.data with schema: (string requestHead, string proposalId)
        string memory baseApiUrl = node.data[0].toString();
        string memory proposal = node.data[1].toString();

        string memory apiUrl = string(
            abi.encodePacked(
                baseApiUrl,
                "?quester=",
                quester.toHexString(),
                "&missionId=",
                node.id.toString(),
                "&proposal=",
                proposal
            )
        );

        // send request to chainlink oracle
        request(apiUrl);

        // this is off-chain mission, return false by default
        return false;
    }

    /// @dev See {IChainlinkMissionHandler-fulfill}
    function fulfill(
        bytes32 requestId,
        address quester,
        uint256 missionId,
        bool completed
    ) external virtual override recordChainlinkFulfillment(requestId) {
        IQuest(missionQuests[missionId]).setMissionStatus(quester, missionId, completed);

        Types.MissionNode memory node;
        node.id = missionId;
        emit MissionValidated(quester, node, completed);
    }
}

