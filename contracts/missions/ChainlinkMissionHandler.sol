// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "../interface/IChainlinkMissionHandler.sol";
import "../interface/IQuest.sol";

abstract contract ChainlinkMissionHandler is IChainlinkMissionHandler, ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;
    uint256 public linkFee;
    bytes32 public job;
    address public linkToken;
    address public linkOracle;

    constructor(address linkAddress, address oracleAddress, bytes32 jobId) ConfirmedOwner(msg.sender) {
        // LINK addresses
        // ethereum mainnet: 0x514910771AF9Ca656af840dff83E8264EcF986CA
        // ethereum goerli: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
        // polygon mainnet: 0xb0897686c545045aFc77CF20eC7A532E3120E0F1
        // polygon mumbai: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
        setLink(linkAddress);

        // set oracle (operator) address
        setOracle(oracleAddress);

        // set oracle job
        setJob(jobId);

        // LINK_DIVISIBILITY = 10**18
        linkFee = (1 * LINK_DIVISIBILITY) / 10;
    }

    /// @dev See {IChainlinkMissionHandler-request}
    function request(string calldata apiUrl) external virtual override returns (bytes32 requestId) {
        Chainlink.Request memory req = buildChainlinkRequest(job, address(this), this.fulfill.selector);

        // Set API url
        req.add("get", apiUrl);

        // Set the path to find the desired data in the API response
        req.add("pathQuester", "quester");
        req.add("pathMissionId", "missionId");
        req.add("pathCompleted", "completed");

        // Sends request
        return sendChainlinkRequest(req, linkFee);
    }

    /// @dev See {IChainlinkMissionHandler-fulfill}
    function fulfill(
        bytes32 requestId,
        address quester,
        uint256 missionId,
        bool completed
    ) external virtual override recordChainlinkFulfillment(requestId) {
        IQuest(msg.sender).setMissionStatus(quester, missionId, completed);

        emit RequestFulfilled(requestId);
    }

    /// @dev See {IChainlinkMissionHandler-withdraw}
    function withdraw() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }

    function setJob(bytes32 id) public onlyOwner {
        job = id;
    }

    function setOracle(address oracleAddress) public onlyOwner {
        linkOracle = oracleAddress;
        setChainlinkOracle(linkOracle);
    }

    function setLink(address linkAddress) public onlyOwner {
        linkToken = linkAddress;
        setChainlinkToken(linkAddress);
    }

    function setFee(uint256 fee) public onlyOwner {
        linkFee = fee;
    }
}
