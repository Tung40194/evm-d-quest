// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "./ITwitterMission.sol";
import "./strings.sol";

/* solhint-disable */
contract LikeTwitterMission is ITwitterMission, ChainlinkClient, ConfirmedOwner {
    using strings for *;
    using Chainlink for Chainlink.Request;
    //define state variables stored on the block chain

    string public twitterId;
    mapping(string => string) statuses;
    uint256 public fee;
    bytes32 public jobId = "7d80a6386ef543a3abb52817f6707e3b";
    address public linkToken = 0x326C977E6efc84E512bB9C30f76E30c160eD06FB;
    address public linkOracle = 0xCC79157eb46F5624204f47AB42b3906cAA40eaB7;

    /**
     * @notice Initialize the link token and target oracle
     *
     * Goerli Testnet details:
     * Link Token: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
     * Oracle: 0xCC79157eb46F5624204f47AB42b3906cAA40eaB7 (Chainlink DevRel)
     * jobId: 7d80a6386ef543a3abb52817f6707e3b // string job
     * ref: https://docs.chain.link/resources/link-token-contracts/ ; https://docs.chain.link/any-api/testnet-oracles
     */
    constructor(string memory _twitterId) ConfirmedOwner(msg.sender) {
        twitterId = _twitterId;

        setChainlinkToken(linkToken);
        setChainlinkOracle(linkOracle);
        // fee = 0.01 * 10**18; // 0.01 LINK
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0,1 * 10**18 (Varies by network and job)
    }

    function requestMissionStatus(string memory userId) public override returns (bytes32 requestId) {
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);

        // Set the URL to perform the GET request
        // API docs: https://covalenthq.com/docs/api

        // given twitterID and userID, call api to get status
        req.add(
            "get",
            // "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10"
            "https://6397fe2077359127a04466c5.mockapi.io/twitter/userId"
        );

        // Set the path to find the desired data in the API response
        // {"data":"88-completed"}
        req.add("path", "data");

        // Sends the request
        return sendChainlinkRequest(req, fee);
    }

    function fulfill(
        bytes32 _requestId,
        string memory userStatus
    ) external override recordChainlinkFulfillment(_requestId) {
        emit RequestMissionStatus(_requestId, userStatus);

        // split string
        strings.slice memory userStatusSlice = userStatus.toSlice();
        strings.slice memory userId = userStatusSlice.split("-".toSlice());
        statuses[userId.toString()] = userStatusSlice.toString();
    }

    function statusOf(string memory userId) external view override returns (string memory) {
        return statuses[userId];
    }

    function withdrawLink() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(linkToken);
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }
}
