// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../lib/Types.sol";
import "../lib/BytesConversion.sol";
import "../interface/IMission.sol";
import "../interface/IDQuest.sol";
import "./ChainlinkMissionHandler.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Twitter is IMission, ChainlinkMissionHandler {
    using BytesConversion for bytes;
    using Strings for address;

    // address of dquest contract
    address public dquestContract;

    constructor(
        address dQuest,
        address linkAddr,
        address oracleAddr,
        bytes32 jobId
    ) ChainlinkMissionHandler(linkAddr, oracleAddr, jobId) {
        require(dQuest != address(0x0), "dquest can't be 0x0");
        dquestContract = dQuest;
    }

    /**
     * To meet mission formula setup from Quest, decode MissionNode.data with the following schema
     * data schema: (string requestHead, string twitterId)
     *  - requestHead: the head of action request. It is either "like" or "follow"
     *  - twitterId: the tweet id
     */
    function validateMission(address quester, Types.MissionNode calldata node) external returns (bool isComplete) {
        // ensure only quest contracts calling
        IDQuest dquest = IDQuest(dquestContract);
        require(dquest.isQuest(msg.sender), "Caller is not a quest");

        // start decoding node.data with schema: (string requestHead, string twitterId)
        string memory requestHead = node.data[0].toString();
        string memory twitterId = node.data[1].toString();

        string memory apiUrl = string(abi.encodePacked(requestHead, "/", twitterId, "/", quester.toHexString()));

        // send request to chainlink oracle
        request(apiUrl);

        // this is off-chain mission, return false by default
        return false;
    }
}
