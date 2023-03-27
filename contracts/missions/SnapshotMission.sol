// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "../interface/IChainlinkMissionHandler.sol";
import "../interface/IDQuest.sol";
import "../interface/IQuest.sol";
import "../interface/IMission.sol";
import "../lib/Types.sol";
import "../lib/BytesConversion.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SnapshotMission is IMission, IChainlinkMissionHandler, ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;
    using BytesConversion for bytes;
    using Strings for address;
    using Strings for uint256;

    uint256 public linkFee;
    bytes32 public job;
    address public linkToken;
    address public linkOracle;

    address public dquestContract;
    mapping(uint256 => address) public missionQuests;

    constructor(address dQuest, address linkAddress, address oracleAddress, bytes32 jobId) ConfirmedOwner(msg.sender) {
        require(dQuest != address(0x0), "dquest can't be 0x0");
        dquestContract = dQuest;

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
        linkFee = (1 * LINK_DIVISIBILITY) / 100000;
    }

    function request(string memory apiUrl) public virtual override returns (bytes32 requestId) {
        // ensure only quest contracts calling
        bool isValidRequester = IDQuest(dquestContract).isQuest(msg.sender) || msg.sender == owner();
        require(isValidRequester, "Invalid requester");

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

    function validateMission(address quester, Types.MissionNode calldata node) external returns (bool isComplete) {
        // store quest address by missionId
        if (missionQuests[node.id] == address(0)) missionQuests[node.id] = msg.sender;

        // start decoding node.data with schema: (string requestHead, string twitterId)
        string memory baseApiUrl = node.data[0].toString();
        string memory proposal = uint256(bytes32(node.data[1])).toHexString();

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

        // // TODO: emit event if needed
        // emit MissionValidated(quester, node);

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
        emit RequestFulfilled(requestId);

        IQuest(missionQuests[missionId]).setMissionStatus(quester, missionId, completed);
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
