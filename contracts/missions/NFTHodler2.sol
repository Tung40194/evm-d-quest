// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../lib/Types.sol";
import "../lib/BytesConversion.sol";
import "../interface/IMission.sol";
import "../interface/IQuest.sol";
import "../interface/IDQuest.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// This is an improvement from ./NFTHodler targeting all ERC721 Enumerable extender
// To verify if a user has any NFT token in a given range
// mission data schema: (address token_address, uint256 start_id, uint256 stop_id)
contract NFTHodler2 is IMission {
    using BytesConversion for bytes;
    using Address for address;

    // address of dquest contract
    address public dquestContract;

    // define ERC721 Enumerable interface
    bytes4 private constant _INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;

    constructor(address dQuest) {
        require(dQuest != address(0x0), "dquest can't be 0x0");
        dquestContract = dQuest;
    }

    /**
     * To meet mission formula setup from Quest, decode MissionNode.data with the following schema
     * data schema: (address token_address, uint256 start_id, uint256 stop_id)
     *  - token_address: the address of the NFT contract
     *  - start_id: the start of token id range (included)
     *  - stop_id: the stop of token id range (included)
     */
    function validateMission(address quester, Types.MissionNode calldata node) external returns (bool isComplete) {
        IDQuest dquest = IDQuest(dquestContract);
        require(dquest.isQuest(msg.sender), "Caller is not a quest");
        IQuest quest = IQuest(msg.sender);

        // start decoding node.data with schema: (address token_address, uint256 start_id, uint256 stop_id)
        address tokenAddr = node.data[0].toAddress();
        uint256 startId = node.data[1].toUint256();
        uint256 stopId = node.data[2].toUint256();

        require(startId <= stopId, "Invalid encoded token range");

        require(address(tokenAddr).isContract(), "Not a contract");
        try IERC165(tokenAddr).supportsInterface(_INTERFACE_ID_ERC721_ENUMERABLE) returns (bool supported) {
            // Contracts support ERC-165
            require(supported, "ERC721Enumerable not supported");
            ERC721Enumerable tokenContract = ERC721Enumerable(tokenAddr);

            uint256 balance = tokenContract.balanceOf(quester);
            for (uint256 index = 0; index < balance; index++) {
                uint256 tokenId = tokenContract.tokenOfOwnerByIndex(quester, index);
                bool tokenInUse = quest.erc721GetTokenUsed(tokenAddr, index);
                if (startId <= tokenId && tokenId <= stopId && !tokenInUse) {
                    quest.setMissionStatus(quester, node.id, true);
                    quest.erc721SetTokenUsed(node.id, tokenAddr, index);
                    return true;
                }
            }
            return false;
        } catch (bytes memory /*lowLevelData*/) {
            // Contracts doesn't support ERC-165
            revert("ERC-165 not supported");
        }
    }
}
