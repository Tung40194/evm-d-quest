// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../lib/DQuestStructLib.sol";
import "../lib/BytesConversion.sol";
import "../interface/IMission.sol";
import "../interface/IDQuest.sol";
import "./ChainlinkMissionHandler.sol";

contract Twitter is IMission, ChainlinkMissionHandler {
    using BytesConversion for bytes;

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
     * data schema: (string requestHead, string twitterId, string userId)
     *  - requestHead: the head of action request. It is either "like" or "follow"
     *  - twitterId: the tweet id
     *  - userId: the user id
     */
    function validateMission(
        address quester,
        DQuestStructLib.MissionNode calldata node
    ) external returns (bool isComplete) {
        // ensure only quest contracts calling
        IDQuest dquest = IDQuest(dquestContract);
        require(dquest.isQuest(msg.sender), "Caller is not a quest");

        // start decoding node.data with schema: (string twitterId, string userId)
        string memory requestHead = node.data[0].toString();
        string memory twitterId = node.data[1].toString();
        string memory userId = node.data[2].toString();

        string memory apiUrl = string(abi.encodePacked(requestHead, "/", twitterId, "/", userId));

        // send request to chainlink oracle
        request(apiUrl);
        
        emit MissionValidated(quester, node);

        // this is off-chain mission, return false by default
        return false;
    }
}
