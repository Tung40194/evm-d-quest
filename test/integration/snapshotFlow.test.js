const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { utils } = require("ethers");
const { DONT_CARE_BYTES32 } = require("../constants");
const { mockMissionFormula, mockOutcomes } = require("../helpers");
const dotenv = require("dotenv");
dotenv.config();

!process.env.DISABLE_TEST &&
  describe("Snapshot Mission Integration Test", () => {
    const jobId = DONT_CARE_BYTES32;

    let owner, oracleOwner, quester;
    let dQuestContract, missionHandlerContract, operatorContract, linkTokenContract;
    let dQuestAddress, missionHandlerAddress, operatorAddress, linkTokenAddress;

    beforeEach(async () => {
      [owner, oracleOwner, quester] = await ethers.getSigners();

      const Quest = await ethers.getContractFactory("Quest");
      const questContract = await Quest.deploy();

      const DQuest = await ethers.getContractFactory("DQuest");
      dQuestContract = await upgrades.deployProxy(DQuest, [questContract.address], { initializer: "initialize" });
      dQuestAddress = dQuestContract.address;

      const LinkToken = await ethers.getContractFactory("LinkToken");
      linkTokenContract = await LinkToken.deploy();
      linkTokenAddress = linkTokenContract.address;

      const oracleOwnerAddress = oracleOwner.address;
      const Operator = await ethers.getContractFactory("Operator");
      operatorContract = await Operator.deploy(linkTokenAddress, oracleOwnerAddress);
      operatorAddress = operatorContract.address;
      await operatorContract.connect(oracleOwner).setAuthorizedSenders([oracleOwnerAddress]);

      const MissionHandler = await ethers.getContractFactory("SnapshotMission");
      missionHandlerContract = await MissionHandler.deploy(dQuestAddress, linkTokenAddress, operatorAddress, jobId);
      missionHandlerAddress = missionHandlerContract.address;

      await linkTokenContract.transfer(missionHandlerContract.address, ethers.BigNumber.from(10).pow(18));
    });

    it("should receive outcome (only native token) when completed `createQuest` -> `validateQuest`x2 -> `executeQuestOutcome`", async () => {
      console.log(`
              ********* Mission Formula *********
                    
                          OR(id=1)
                        /     \\
                       /       \\
                      /         \\
                  AND(2)         OR(3)
                  / \\           / \\ 
                 /   \\         /   \\
            miss1(4) miss2(5) miss3(6) miss4(7)
completed:   true    false     true    false
  `);
      const missionsFormula = mockMissionFormula("snapshot", missionHandlerContract.address);
      const outcomes = mockOutcomes();
      const currentTime = await time.latest();
      const startTime = currentTime + 10;
      const endTime = startTime + 60;

      await dQuestContract.createQuest(missionsFormula, outcomes, startTime, endTime);
      await time.increase(30);

      const snapshotQuestAddress = await dQuestContract.getQuest(0);
      const snapshotQuestContract = await ethers.getContractAt("Quest", snapshotQuestAddress);
      await owner.sendTransaction({ to: snapshotQuestAddress, value: utils.parseEther("10") });

      const validateQuestTx = await snapshotQuestContract.connect(quester).validateQuest();
      const validateQuestReceiptTx = await validateQuestTx.wait();

      const oracleRequestEventHash = utils.keccak256(
        utils.toUtf8Bytes("OracleRequest(bytes32,address,bytes32,uint256,address,bytes4,uint256,uint256,bytes)")
      );
      const oracleRequestEvents = validateQuestReceiptTx.events.filter(
        (event) => event.topics[0] === oracleRequestEventHash
      );

      const missions = missionsFormula.slice(3);
      const completedList = [true, false, true, false];
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
      for (let i = 0; i < oracleRequestEvents.length; i++) {
        const abiCoder = new utils.AbiCoder();
        const decoded = abiCoder.decode(
          ["address", "bytes32", "uint256", "address", "bytes4", "uint256", "uint256", "bytes"],
          oracleRequestEvents[i].data
        );

        const requestId = decoded[mapNameToIndexOfOracleRequestEventData.requestId];
        const payment = decoded[mapNameToIndexOfOracleRequestEventData.payment];
        const callbackAddress = decoded[mapNameToIndexOfOracleRequestEventData.callbackAddress];
        const callbackFunctionId = decoded[mapNameToIndexOfOracleRequestEventData.callbackFunctionId];
        const expiration = decoded[mapNameToIndexOfOracleRequestEventData.cancelExpiration];
        const completed = completedList[i];

        const fulfillInputs = abiCoder.encode(
          ["bytes32", "address", "uint256", "bool"],
          [requestId, quester.address, missions[i][0], completed]
        );

        await operatorContract
          .connect(oracleOwner)
          .fulfillOracleRequest2(requestId, payment, callbackAddress, callbackFunctionId, expiration, fulfillInputs);
      }

      await snapshotQuestContract.connect(quester).validateQuest();

      const beforeBalanceQuester = await quester.getBalance();

      await snapshotQuestContract.executeQuestOutcome(quester.address);

      const afterBalanceQuester = await quester.getBalance();

      const nativeEthReceive = outcomes[0][4];

      expect(nativeEthReceive).to.equal(afterBalanceQuester.sub(beforeBalanceQuester));
    });
  });

