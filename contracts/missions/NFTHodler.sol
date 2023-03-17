// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../lib/DQuestStructLib.sol";
import "../lib/BytesConversion.sol";
import "../interface/IMission.sol";
import "../interface/IQuest.sol";
import "../interface/IDQuest.sol"; //TODO check d.quest
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFThodler is IMission, Ownable {
    using BytesConversion for bytes;
    using Strings for uint256;
    using Strings for address;

    address public tokenAddr;
    address public dquestContract;

    // inclusion range type
    struct Range {
        uint256 start;
        uint256 stop;
    }

    Range public NFTrange;

    constructor(address dQuest) {
        require(dQuest != address(0x0), "can't be 0x0");
        dquestContract = dQuest;
    }

    /**
     * To meet mission formula setup from Quest, decode MissionNode.data with the following schema
     * data schema: (address token_address, uint256 start_id, uint256 stop_id)
     */
    function validateMission(
        address quester,
        DQuestStructLib.MissionNode calldata node
    ) external returns (bool isComplete) {
        //TODO ensure only quest contracts calling
        IDQuest dquest = IDQuest(dquestContract);
        require(dquest.isQuest(msg.sender), "Caller is not a quest");
        IQuest quest = IQuest(msg.sender);

        // start decoding node.data
        tokenAddr = node.data[0].toAddress();
        NFTrange.start = node.data[1].toUint256();
        NFTrange.stop = node.data[2].toUint256();
        revert(tokenAddr.toHexString());

        IERC721 tokenContract = IERC721(tokenAddr);

        //TODO Mountain merkle range may help saving GAS here
        for (uint256 index = NFTrange.start; index <= NFTrange.stop; index++) {
            bool tokenInUse = quest.erc721GetTokenUsed(tokenAddr, index);
            bool owned = false;

            try tokenContract.ownerOf(index) returns (address owner) {
                // if found, check if owner is the quester
                owned = (quester == owner);
            } catch {
                // if index not valid, continue
                continue;
            }

            if (!tokenInUse && owned) {
                quest.setMissionStatus(quester, node.id, true);
                quest.erc721SetTokenUsed(node.id, tokenAddr, index);
                return true;
            }
        }
        return false;
    }
}
