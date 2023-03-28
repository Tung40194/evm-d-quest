const { expect } = require("chai");
const { utils } = require("ethers");
const { DONT_CARE_BYTES32 } = require("../constants");
const { setupQuest } = require("../helpers");

describe("Snapshot Mission Handler Unit Test", () => {
  let owner, oracleOwner, quester;
  let dQuestContract, missionHandlerContract, snapshotQuestContract, operatorContract, linkTokenContract;
  let dQuestAddress, missionHandlerAddress, snapshotQuestAddress, operatorAddress, linkTokenAddress;
  const jobId = DONT_CARE_BYTES32;
  const nonce = 1;

  beforeEach(async () => {
    [owner, oracleOwner, quester] = await ethers.getSigners();

    const LinkToken = await ethers.getContractFactory("LinkToken");
    linkTokenContract = await LinkToken.deploy();
    linkTokenAddress = linkTokenContract.address;

    const oracleOwnerAddress = oracleOwner.address;
    const Operator = await ethers.getContractFactory("Operator");
    operatorContract = await Operator.deploy(linkTokenAddress, oracleOwnerAddress);
    operatorAddress = operatorContract.address;

    await operatorContract.connect(oracleOwner).setAuthorizedSenders([oracleOwnerAddress]);

    const Quest = await ethers.getContractFactory("Quest");
    const questContract = await Quest.deploy();

    const DQuest = await ethers.getContractFactory("DQuest");
    dQuestContract = await upgrades.deployProxy(DQuest, [questContract.address], { initializer: "initialize" });
    dQuestAddress = dQuestContract.address;
  });

  describe("constructor()", () => {
    let MissionHandler;

    beforeEach(async () => {
      MissionHandler = await ethers.getContractFactory("SnapshotMission");
    });

    it("should revert when DQuestContract is zero address", async () => {
      const zeroAddress = ethers.constants.AddressZero;
      await expect(MissionHandler.deploy(zeroAddress, linkTokenAddress, oracleOwner.address, jobId)).to.be.revertedWith(
        "dquest can't be 0x0"
      );
    });

    it("should initialize DQuestContract address correctly", async () => {
      missionHandlerContract = await MissionHandler.deploy(dQuestAddress, linkTokenAddress, oracleOwner.address, jobId);
      expect(await missionHandlerContract.dquestContract()).to.equal(dQuestAddress);
    });

    it("should initialize oracle address correctly", async () => {
      const oracleAddress = oracleOwner.address;
      missionHandlerContract = await MissionHandler.deploy(dQuestAddress, linkTokenAddress, oracleAddress, jobId);
      expect(await missionHandlerContract.linkOracle()).to.equal(oracleAddress);
    });

    it("should initialize jobId correctly", async () => {
      missionHandlerContract = await MissionHandler.deploy(dQuestAddress, linkTokenAddress, oracleOwner.address, jobId);
      expect(await missionHandlerContract.job()).to.equal(jobId);
    });
  });

  describe("validateMission()", () => {
    let mission, missionId;

    beforeEach(async () => {
      ({
        instanceQuestContract: snapshotQuestContract,
        missionHandlerContract,
        mission
      } = await setupQuest(dQuestContract, operatorContract, linkTokenContract, "SnapshotMission", jobId));

      snapshotQuestAddress = snapshotQuestContract.address;
      missionHandlerAddress = missionHandlerContract.address;
      missionId = mission[0];
    });

    it("should revert when caller is not quest or owner", async () => {
      await expect(missionHandlerContract.connect(quester).validateMission(quester.address, mission)).to.be.reverted;
    });

    it("should emit ChainlinkRequested event when request to Chainlink", async () => {
      const requestId = utils.keccak256(utils.solidityPack(["address", "uint256"], [missionHandlerAddress, nonce]));

      await expect(snapshotQuestContract.connect(quester).validateMission(missionId))
        .to.emit(missionHandlerContract, "ChainlinkRequested")
        .withArgs(requestId);
    });

    it("should emit OracleRequest event when request to Chainlink", async () => {
      await expect(snapshotQuestContract.connect(quester).validateMission(missionId)).to.emit(
        operatorContract,
        "OracleRequest"
      );
    });
  });

  describe("request()", () => {
    it("should revert when caller is not quest", async () => {
      await expect(missionHandlerContract.connect(quester).request("http://example.com")).to.be.reverted;
    });
  });

  describe("fulfill()", () => {
    const completed = true;
    let requestId, missionId;
    let mission;
    let payment, callbackAddress, callbackFunctionId, expiration, fulfillInputs;

    beforeEach(async () => {
      ({
        instanceQuestContract: snapshotQuestContract,
        missionHandlerContract,
        mission
      } = await setupQuest(dQuestContract, operatorContract, linkTokenContract, "SnapshotMission", jobId));

      snapshotQuestAddress = snapshotQuestContract.address;
      missionHandlerAddress = missionHandlerContract.address;
      missionId = mission[0];

      const tx = await snapshotQuestContract.connect(quester).validateMission(missionId);
      const receiptTx = await tx.wait();

      // get `requestId` from `ChainlinkRequested` event
      const chainlinkRequestedEventHash = utils.keccak256(utils.toUtf8Bytes("ChainlinkRequested(bytes32)"));
      const chainlinkRequestedEvent = receiptTx.events.find((event) => event.topics[0] === chainlinkRequestedEventHash);
      requestId = chainlinkRequestedEvent.topics[1];

      // get data from `OracleRequest` event
      const oracleRequestEventHash = utils.keccak256(
        utils.toUtf8Bytes("OracleRequest(bytes32,address,bytes32,uint256,address,bytes4,uint256,uint256,bytes)")
      );
      const oracleRequestEvent = receiptTx.events.find((event) => event.topics[0] === oracleRequestEventHash);

      const abiCoder = new utils.AbiCoder();
      const decoded = abiCoder.decode(
        ["address", "bytes32", "uint256", "address", "bytes4", "uint256", "uint256", "bytes"],
        oracleRequestEvent.data
      );

      const mapNameToIndexOfOracleRequestEventData = {
        requester: 0,
        requestId: 1,
        payment: 2,
        callbackAddress: 3,
        callbackFunctionId: 4,
        cancelExpiration: 5,
        dataVersion: 6,
        data: 7
      };

      payment = decoded[mapNameToIndexOfOracleRequestEventData.payment];
      callbackAddress = decoded[mapNameToIndexOfOracleRequestEventData.callbackAddress];
      callbackFunctionId = decoded[mapNameToIndexOfOracleRequestEventData.callbackFunctionId];
      expiration = decoded[mapNameToIndexOfOracleRequestEventData.cancelExpiration];

      fulfillInputs = abiCoder.encode(
        ["bytes32", "address", "uint256", "bool"],
        [requestId, quester.address, missionId, completed]
      );
    });

    it("should revert when caller is not a oracle", async () => {
      await expect(missionHandlerContract.fulfill(requestId, quester.address, missionId, completed)).to.be.revertedWith(
        "Source must be the oracle of the request"
      );
    });

    it("should revert when requestId is not recorded", async () => {
      const fakeRequestId = utils.keccak256(utils.solidityPack(["string"], ["fakeRequestId"]));
      fulfillInputs[0] = fakeRequestId;

      await expect(
        operatorContract
          .connect(oracleOwner)
          .fulfillOracleRequest2(fakeRequestId, payment, callbackAddress, callbackFunctionId, expiration, fulfillInputs)
      ).to.be.reverted;
    });

    it("should emit RequestFulfilled event when request fulfilled", async () => {
      await expect(
        operatorContract
          .connect(oracleOwner)
          .fulfillOracleRequest2(requestId, payment, callbackAddress, callbackFunctionId, expiration, fulfillInputs)
      )
        .to.emit(missionHandlerContract, "RequestFulfilled")
        .withArgs(requestId);
    });

    it("should set mission completed when fulfilled", async () => {
      expect(await snapshotQuestContract.getMissionStatus(quester.address, missionId)).to.equal(false);

      await operatorContract
        .connect(oracleOwner)
        .fulfillOracleRequest2(requestId, payment, callbackAddress, callbackFunctionId, expiration, fulfillInputs);

      expect(await snapshotQuestContract.getMissionStatus(quester.address, missionId)).to.equal(true);
    });
  });
});
