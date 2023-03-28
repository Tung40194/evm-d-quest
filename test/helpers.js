const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const getCurrentBlockTimestamp = async () => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
};

const advanceBlockTimestamp = async (units) => {
  // Get the current block timestamp
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  const currentTimestamp = block.timestamp;

  // Set the next block timestamp to the specified number of units ahead of the current timestamp
  const nextTimestamp = currentTimestamp + units;
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);

  // Mine a new block to finalize the timestamp change
  await ethers.provider.send("evm_mine", []);
};

/*
                root(1)
                /     \
               /       \
              /         \
        op1(2)         op2(3)
          / \           / \ 
         /   \         /   \
  miss1(4) miss2(5) miss3(6) miss4(7)
*/
const mockMissionFormula = (missionName, missionHandlerAddress) => {
  const operator = {
    NONE: 0,
    AND: 0,
    OR: 1
  };

  const oracleAddress = "0x072c7F4a8e9276f810727Ca68d3c99e6d8a72990";

  const abiCoder = new ethers.utils.AbiCoder();
  const data = [];
  if (missionName === "snapshot") {
    const baseApiUrl = abiCoder.encode(["string"], ["http://example.com"]);
    data.push(baseApiUrl);

    const proposal = abiCoder.encode(["string"], ["proposal"]);
    data.push(proposal);
  }

  // [id, isMission, missionHandlerAddress, operatorType, leftNode, rightNode, data]
  const root = [1, false, missionHandlerAddress, operator.NONE, 1, 2, data];
  const op1 = [2, false, missionHandlerAddress, operator.AND, 3, 4, data];
  const op2 = [3, false, missionHandlerAddress, operator.OR, 5, 6, data];
  const miss1 = [4, true, missionHandlerAddress, operator.NONE, 0, 0, data];
  const miss2 = [5, true, missionHandlerAddress, operator.NONE, 0, 0, data];
  const miss3 = [6, true, missionHandlerAddress, operator.NONE, 0, 0, data];
  const miss4 = [7, true, missionHandlerAddress, operator.NONE, 0, 0, data];

  return [root, op1, op2, miss1, miss2, miss3, miss4];
};

const mockOutcomes = () => {
  const tokenAddress = "0x072c7F4a8e9276f810727Ca68d3c99e6d8a72990";
  const functionSelector = "0x12345678";
  const data = "0x1234";

  // [tokenAddress, functionSelector, data, isNative, nativeAmount, isLimitedReward, totalReward]
  const outcome1 = [tokenAddress, functionSelector, data, false, 1, false, 0];

  return [outcome1];
};

const setupQuest = async (dQuestContract, operatorContract, linkTokenContract, missionName, jobId) => {
  const dQuestAddress = dQuestContract.address;
  const operatorAddress = operatorContract.address;
  const linkAddress = linkTokenContract.address;

  const MissionHandler = await ethers.getContractFactory(missionName);
  const missionHandlerContract = await MissionHandler.deploy(dQuestAddress, linkAddress, operatorAddress, jobId);

  await linkTokenContract.transfer(missionHandlerContract.address, ethers.BigNumber.from(10).pow(18));

  const missionsFormula = mockMissionFormula("snapshot", missionHandlerContract.address);
  const outcomes = mockOutcomes();
  const currentTime = await helpers.time.latest();
  const startTime = currentTime + 10;
  const endTime = startTime + 60;

  await dQuestContract.createQuest(missionsFormula, outcomes, startTime, endTime);
  await helpers.time.increase(30);

  const instanceQuestAddress = await dQuestContract.getQuest(0);
  const instanceQuestContract = await ethers.getContractAt("Quest", instanceQuestAddress);

  const mission = missionsFormula.find((mission) => mission[1] === true);

  return { instanceQuestContract, missionHandlerContract, mission };
};

module.exports = {
  getCurrentBlockTimestamp,
  advanceBlockTimestamp,
  setupQuest
};
