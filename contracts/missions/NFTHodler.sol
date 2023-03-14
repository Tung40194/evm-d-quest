// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../lib/DQuestStructLib.sol";
import "../lib/BytesConversion.sol";
import "../interface/IMission.sol";
import "../interface/IQuest.sol";
import "../interface/IDQuest.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFThodler is IMission, Ownable {
    using BytesConversion for bytes;

    // address of dquest contract
    address public dquestContract;

    constructor(address dQuest) {
        require(dQuest != address(0x0), "can't be 0x0");
        dquestContract = dQuest;
    }

    /**
     * To meet mission formula setup from Quest, decode MissionNode.data with the following schema
     * data schema: (address token_address, uint256 start_id, uint256 stop_id)
     *  - token_address: the address of the NFT contract
     *  - start_id: the start of token id range (included)
     *  - stop_id: the stop of token id range (included)
     */
    function validateMission(
        address quester,
        DQuestStructLib.MissionNode calldata node
    ) external returns (bool isComplete) {
        //TODO ensure only quest contracts calling
        IDQuest dquest = IDQuest(dquestContract);
        require(dquest.isQuest(msg.sender), "Caller is not a quest");
        IQuest quest = IQuest(msg.sender);

        // start decoding node.data with schema: (address token_address, uint256 start_id, uint256 stop_id)
        address tokenAddr = node.data[0].toAddress();
        uint256 startId = node.data[1].toUint256();
        uint256 stopId = node.data[2].toUint256();

        IERC721 tokenContract = IERC721(tokenAddr);

        //TODO Mountain merkle range may help saving GAS here
        for (uint256 index = startId; index <= stopId; index++) {
            bool tokenInUse = quest.erc721GetTokenUsed(tokenAddr, index);

            if (!tokenInUse && tokenContract.ownerOf(index) == quester) {
                quest.setMissionStatus(quester, node.id, true);
                quest.erc721SetTokenUsed(node.id, tokenAddr, index);
                return true;
            }
        }
        return false;
    }
}
