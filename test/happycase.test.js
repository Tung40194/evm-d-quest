const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
  time,
  balance
} = require("@openzeppelin/test-helpers");

const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const crypto = require("crypto");
const { ethers } = require("hardhat");
const { assert } = require("assert");
const { expect } = require("chai");

// random numbers below just for the right type
const DONT_CARE_ADDRESS = "0x072c7F4a8e9276f810727Ca68d3c99e6d8a72990";
const DONT_CARE_BOOL = false;
const DONT_CARE_NUM = 123;
const DONT_CARE_FUNC_SELECTOR = "0x12341234"; //4 bytes
const DONT_CARE_OPERATOR = 1;
const DONT_CARE_ABR_BYTES = ["0x012345", "0x6789abcdef"];
const DONT_CARE_DATA = "0xabcdef";

const ORACLE = "0x5fB365a93B6F6db556c40c346ae14Bbd1dDAFB1E";

const AND = 0;
const OR = 1;

const missionNodeType = ["uint256", "bool", "address", "address", "uint8", "uint256", "uint256", "bytes[]"];

const OutcomeTypes = ["address", "bytes4", "bytes", "bool", "uint256", "bool", "uint256"];

async function getCurrentBlockTimestamp() {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
}

async function advanceBlockTimestamp(units) {
  // Get the current block timestamp
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  const currentTimestamp = block.timestamp;

  // Set the next block timestamp to the specified number of units ahead of the current timestamp
  const nextTimestamp = currentTimestamp + units;
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);

  // Mine a new block to finalize the timestamp change
  await ethers.provider.send("evm_mine", []);
}

// Testing setMintingCondition function for multi-minting condition
describe("executing happy cases", () => {
  let accounts;
  let quest;
  let dquest;
  let mission;
  let nft1;
  let nft2;
  let deployedQuest;
  let deployedDquest;
  let deployedMission1;
  let deployedMission2;
  let deployedNft1;
  let deployedNft2;

  let missionFormula;
  let outcomes;
  let questStart;
  let questEnd;
  let data;
  let node;
  let outcome;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    quest = await ethers.getContractFactory("Quest");
    dquest = await ethers.getContractFactory("DQuest");
    mission = await ethers.getContractFactory("NFThodler");
    nft1 = await ethers.getContractFactory("NFT1");
    nft2 = await ethers.getContractFactory("NFT2");

    //deploy contracts
    deployedQuest = await quest.deploy();
    console.log("| - quest impl deployed at: ", deployedQuest.address);

    deployedDquest = await upgrades.deployProxy(dquest, [deployedQuest.address], { initializer: "initialize" });
    console.log("| - dquest proxy deployed at: ", deployedDquest.address);

    deployedMission = await mission.deploy(deployedDquest.address);
    console.log("| - NFT hodler mission deployed at: ", deployedMission.address);

    deployedNft1 = await nft1.deploy();
    console.log("| - NFT1 token contract deployed at: ", deployedNft1.address);

    deployedNft2 = await nft2.deploy();
    console.log("| - NFT2 token contract deployed at: ", deployedNft2.address);
  });

  it("create a quest with 1-node dummy mission formula", async () => {
    // building a formula directed binary tree
    const node1 = [1, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    missionFormula = [node1];

    // building outcomes
    const outcome1 = [
      DONT_CARE_ADDRESS,
      DONT_CARE_FUNC_SELECTOR,
      DONT_CARE_DATA,
      DONT_CARE_BOOL,
      DONT_CARE_NUM,
      DONT_CARE_BOOL,
      DONT_CARE_NUM
    ];
    outcomes = [outcome1];

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;

    // create a quest
    await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);
  });

  it("create a quest with 5-node dummy mission formula", async () => {
    // building a formula directed binary tree
    const node1 = [1, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, AND, 2, 3, DONT_CARE_ABR_BYTES];
    const node2 = [2, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    const node3 = [3, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, AND, 4, 5, DONT_CARE_ABR_BYTES];
    const node4 = [4, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    const node5 = [5, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    missionFormula = [node1, node2, node3, node4, node5];

    // building outcomes
    const outcome1 = [
      DONT_CARE_ADDRESS,
      DONT_CARE_FUNC_SELECTOR,
      DONT_CARE_DATA,
      DONT_CARE_BOOL,
      DONT_CARE_NUM,
      DONT_CARE_BOOL,
      DONT_CARE_NUM
    ];
    outcomes = [outcome1];

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;

    // create a quest
    await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);
  });

  it("create a quest then reset mission formula for that quest", async () => {
    // building a formula directed binary tree
    const node1 = [2, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    missionFormula = [node1];

    // building outcomes
    const outcome1 = [
      DONT_CARE_ADDRESS,
      DONT_CARE_FUNC_SELECTOR,
      DONT_CARE_DATA,
      DONT_CARE_BOOL,
      DONT_CARE_NUM,
      DONT_CARE_BOOL,
      DONT_CARE_NUM
    ];
    outcomes = [outcome1];

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 1000;
    questEnd = questStart + 3000;

    // create a quest
    await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);

    // instantiating a proxy quest contract
    const proxy1Address = await deployedDquest.getQuest(0);
    const pQuest = await quest.attach(proxy1Address);

    const node2 = [1, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, AND, 2, 3, DONT_CARE_ABR_BYTES];
    const node3 = [2, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    const node4 = [3, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, AND, 4, 5, DONT_CARE_ABR_BYTES];
    const node5 = [4, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    const node6 = [5, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];

    // reset mission formula
    newMissionFormula = [node2, node3, node4, node5, node6];
    pQuest.setMissionNodeFormulas(newMissionFormula);

    await deployedDquest.setMission;
  });

  it("create a quest with 3-working-node mission formula: M1 OR M2", async () => {
    // building a formula - a directed binary tree

    /* Targeting NFT hodling mission handler
     * Mission: "quester is hodling an NFT id in range [start, stop]"
     *
     * Mission1(M1): "holding an NFT in range [1,10] of a contract at address X"
     * Mission2(M2): "holding an NFT in range [5, 30] of a contract at address Y"
     *
     * Mission tree:
     *       OR
     *      /  \
     *    M1    M2
     *
     * `createQuest` takes in an array of [OR, M1, M2] so we need to construct them before hand.
     * Each element of an array is called node(refer type in DquestStructLib.MissionNode) and we
     * are going to need 3 nodes(OR, M1, M2) for our tree (mission formula)
     *
     * node1: OR
     * node2: M1
     * node3: M2
     *
     * With the following defined type we're going to construct each node acordingly
     *
     * struct MissionNode {
     *   uint256 id;
     *   bool isMission;
     *   address missionHandlerAddress;
     *   address oracleAddress;
     *   OperatorType operatorType;
     *   uint256 leftNode;
     *   uint256 rightNode;
     *   bytes[] data;
     * }
     *
     * About the data (the last field), it is needed for the mission handler. Every mission handler will need this data
     * as input parameter(node2: M1 and node3: M2). With NFT HOdler Mission handler it will have the following data schema:
     * {
     *   address token_address, // the token address
     *   uint256 start_id, // the start of the token range
     *   uint256 stop_id // the end of the token range
     * }
     *
     * encode each element and stack them to an array in order:
     *
     *  - data1 = [X encoded, 1 encoded, 10 encoded]
     *  - data2 = [Y encoded, 5 encoded, 30 encoded]
     */

    const node1 = [1, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, OR, 2, 3, DONT_CARE_ABR_BYTES];

    addr = web3.eth.abi.encodeParameter("address", deployedNft1.address);
    start = web3.eth.abi.encodeParameter("uint256", "1");
    end = web3.eth.abi.encodeParameter("uint256", "10");
    data = [addr, start, end];
    const node2 = [2, true, deployedMission.address, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, data];

    addr = web3.eth.abi.encodeParameter("address", deployedNft2.address);
    start = web3.eth.abi.encodeParameter("uint256", "5");
    end = web3.eth.abi.encodeParameter("uint256", "30");
    data = [addr, start, end];
    const node3 = [3, true, deployedMission.address, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, data];

    missionFormula = [node1, node2, node3];

    // building outcomes
    const outcome1 = [
      DONT_CARE_ADDRESS,
      DONT_CARE_FUNC_SELECTOR,
      DONT_CARE_DATA,
      DONT_CARE_BOOL,
      DONT_CARE_NUM,
      DONT_CARE_BOOL,
      DONT_CARE_NUM
    ];
    outcomes = [outcome1];

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;

    // create a quest
    await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);

    // instantiating a proxy quest contract
    const proxy1Address = await deployedDquest.getQuest(0);
    const pQuest = await quest.attach(proxy1Address);

    // add Quester
    await advanceBlockTimestamp(20);
    quester = accounts[7].address;
    await expect(pQuest.connect(accounts[7]).addQuester()).to.emit(pQuest, "QuesterAdded").withArgs(quester);

    // distributing NFT1 and NFT2 to the quester
    const nft1I = await nft1.attach(deployedNft1.address);
    const nft2I = await nft2.attach(deployedNft2.address);

    // give quester id #1 from NFT 1
    nft1I.connect(accounts[0]).safeMint(quester, "give quester id #1");

    // give quester 6 first ids from NFT2
    nft2I.connect(accounts[0]).safeMint(quester, "give quester id #1");
    nft2I.connect(accounts[0]).safeMint(quester, "give quester id #2");
    nft2I.connect(accounts[0]).safeMint(quester, "give quester id #3");
    nft2I.connect(accounts[0]).safeMint(quester, "give quester id #4");
    nft2I.connect(accounts[0]).safeMint(quester, "give quester id #5");
    nft2I.connect(accounts[0]).safeMint(quester, "give quester id #6");

    owner = await nft2I.ownerOf(3);
    // now quester(accounts[7]) is elligible
    result = await pQuest.connect(accounts[7]).validateQuest();
  });
});
