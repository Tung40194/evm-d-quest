// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../lib/DQuestStructLib.sol";
import "../lib/BytesConversion.sol";
import "../interface/IMission.sol";
import "../interface/IQuest.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFThodler is IMission, Ownable {
    using BytesConversion for bytes;
    address public tokenAddr;
    address public dquestContract;

    // inclusion range type
    struct Range {
        uint256 start;
        uint256 stop;
    }

    Range public NFTrange;

    constructor() {
        // nothing yet
    }

    // function setDquestAddress(address dQuest) external onlyOwner {
    //     require(dQuest != address(0x0), "can't be 0x0");
    //     dquestContract = dQuest;
    // }

    function validateMission(
        address quester,
        DQuestStructLib.MissionNode calldata node
    ) external returns (bool isComplete) {
        //TODO ensure only quest contracts calling
        IQuest quest = IQuest(msg.sender);

        tokenAddr = node.data[0].toAddress();
        NFTrange.start = node.data[1].toUint256();
        NFTrange.stop = node.data[2].toUint256();
        IERC721 tokenContract = IERC721(tokenAddr);

        for (uint256 index = NFTrange.start; index <= NFTrange.stop; index++) {
            if (tokenContract.ownerOf(index) == quester) {
                quest.setMissionStatus(quester, node.id, true);
                return true;
            }
        }
        quest.setMissionStatus(quester, node.id, false);
        return false;
    }
}
