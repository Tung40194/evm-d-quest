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

const NOT_ENROLLED = 0;
const IN_PROGRESS = 1;
const COMPELETED = 2;
const REWADRDED = 3;

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
    beforeEach(async () => {
    accounts = await ethers.getSigners();
    quest = await ethers.getContractFactory("Quest");
    dquest = await ethers.getContractFactory("DQuest");
    mission = await ethers.getContractFactory("NFThodler");
    nft1 = await ethers.getContractFactory("NFT1");
    nft2 = await ethers.getContractFactory("NFT2");
    ftStandard = await ethers.getContractFactory("FTStandard");

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

    deployedFtStandard = await ftStandard.deploy("Reward Token Demo", "RTD", 0);
    console.log("| - Reward token contract deployed at: ", deployedFtStandard.address);

  });

  it("create a quest with 1-node dummy mission formula", async () => {
    // building a formula directed binary tree
    const node1 = [1, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    missionFormula = [node1];

    // building outcomes
    const outcome1 = [DONT_CARE_ADDRESS,DONT_CARE_FUNC_SELECTOR,DONT_CARE_DATA,DONT_CARE_BOOL,DONT_CARE_NUM,DONT_CARE_BOOL,DONT_CARE_NUM];
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
    const outcome1 = [DONT_CARE_ADDRESS,DONT_CARE_FUNC_SELECTOR,DONT_CARE_DATA,DONT_CARE_BOOL,DONT_CARE_NUM,DONT_CARE_BOOL,DONT_CARE_NUM];
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
    const outcome1 = [DONT_CARE_ADDRESS,DONT_CARE_FUNC_SELECTOR,DONT_CARE_DATA,DONT_CARE_BOOL,DONT_CARE_NUM,DONT_CARE_BOOL,DONT_CARE_NUM];
    outcomes = [outcome1];

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 1000;
    questEnd = questStart + 3000;

    // create a quest
    await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);

    // instantiating a proxy quest contract
    const questProxy1Address = await deployedDquest.getQuest(0);
    const pQuest = await quest.attach(questProxy1Address);

    const node2 = [1, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, AND, 2, 3, DONT_CARE_ABR_BYTES];
    const node3 = [2, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    const node4 = [3, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, AND, 4, 5, DONT_CARE_ABR_BYTES];
    const node5 = [4, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
    const node6 = [5, true, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];

    // reset mission formula
    newMissionFormula = [node2, node3, node4, node5, node6];
    await pQuest.setMissionNodeFormulas(newMissionFormula);

    await deployedDquest.setMission;
  });

  it.only("create a quest with 3-working-node mission formula: M1 OR M2", async () => {
    /*
     * SCRIPTING SUMMARY:
     *
     * quest: M1 OR M2
     * M1: own at least an NFT token in range [1,10] from address X
     * M2: own at least a token in range [5,30] from address Y
     * outcome: get 32 Ft token from address Z
    */

    /* 
     * BUILDING A MISSION FORMULA - A DIRECTED BINARY TREE
     *
     * Again, mission formula is an array of the following type:
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
     * Each node can either be a Mission or an operator and we need to give proper inputs to construct our formula: (M1 OR M2)
     * 
     * We are going to need 3 nodes: M1, M2 and OR.
     * 
     * M1 and M2 will point to NFT hodling mission handler, and the OR operator will just focuses on its ID and operatorType.
     *
     * Mission formula tree:
     *       OR
     *      /  \
     *    M1    M2
     * 
     * M1: "holding an NFT in range [1,10] of a contract at address X"
     * M2: "holding an NFT in range [5, 30] of a contract at address Y"
     * OR: an OR operator
     *
     * MissionNode.data is specifically designed for "mission node", every mission handler will need this data
     * as input parameter. With NFT HOdler Mission handler it will have the following data schema:
     * {
     *   'address': token_address, // the token address
     *   'uint256': start_id, // the start of the token range
     *   'uint256': stop_id // the end of the token range
     * }
     *
     * encode each element and stack them to an array in order:
     *
     *  - data1 = [X encoded, 1 encoded, 10 encoded]
     *  - data2 = [Y encoded, 5 encoded, 30 encoded]
     */

    const OR_node = [1, false, DONT_CARE_ADDRESS, DONT_CARE_ADDRESS, OR, 2, 3, DONT_CARE_ABR_BYTES];

    // encoding data for M1
    addr = web3.eth.abi.encodeParameter("address", deployedNft1.address);
    start = web3.eth.abi.encodeParameter("uint256", "1");
    end = web3.eth.abi.encodeParameter("uint256", "10");
    data = [addr, start, end];
    const M1_node = [2, true, deployedMission.address, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, data];

    // encoding data for M2
    addr = web3.eth.abi.encodeParameter("address", deployedNft2.address);
    start = web3.eth.abi.encodeParameter("uint256", "5");
    end = web3.eth.abi.encodeParameter("uint256", "30");
    data = [addr, start, end];
    const M2_node = [3, true, deployedMission.address, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, data];

    missionFormula = [OR_node, M1_node, M2_node];

    /*
     * BUILDING OUTCOME
     * the outcome: 32 token RTD for anyone completed the quest (M1 OR M2)
     * 
    */
    // accounts[0] aka owner of FT standard will mint to account[3] 100 erc20 token RTD
    const ftstandardI = await ftStandard.attach(deployedFtStandard.address);
    const totalReward = 100;
    await ftstandardI.connect(accounts[0]).mint(accounts[3].address, totalReward);

    // expect erc20 balance
    await expect(await ftstandardI.balanceOf(accounts[3].address)).to.equal(totalReward);

    // function selector of transferFrom(address from, address to, uint256 amount)
    erc20mintSelector = "0x23b872dd";

    // `to` is dont care currently because it will be replaced by quester later anyway
    data = web3.eth.abi.encodeFunctionCall({
      name: 'transferFrom',
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'from'
      },{
          type: 'address',
          name: 'to'
      },{
        type: 'uint256',
        name: 'amount'
      }]
  }, [accounts[3].address, DONT_CARE_ADDRESS, "32"]);

    const outcome1 = [deployedFtStandard.address, erc20mintSelector, data, false, DONT_CARE_NUM, true, totalReward];
    outcomes = [outcome1];
    /*
     * START CREATING A QUEST
     * 
    */
    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;

    // create a quest
    await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);

    // instantiating a proxy quest contract
    const questProxy1Address = await deployedDquest.getQuest(0);
    const pQuest = await quest.attach(questProxy1Address);

    // add Quester
    await advanceBlockTimestamp(20);
    quester = accounts[7].address;
    await expect(pQuest.connect(accounts[7]).addQuester()).to.emit(pQuest, "QuesterAdded").withArgs(quester);
    await expect(await pQuest.questerProgresses(accounts[7].address)).to.equal(IN_PROGRESS);

    /*
     * DISTRIBUTING NFT1 AND NFT2 TO QUESTER
     * 
    */
    const nft1I = await nft1.attach(deployedNft1.address);
    const nft2I = await nft2.attach(deployedNft2.address);

    // give quester id #1 from NFT 1. This will not be eligible because required range is [1,10]
    await nft1I.connect(accounts[0]).safeMint(quester, "give quester id #0");

    // give quester 6 first ids from NFT2. This will be eligible because required range is [5,30]
    await nft2I.connect(accounts[0]).safeMint(quester, "give quester id #0");
    await nft2I.connect(accounts[0]).safeMint(quester, "give quester id #1");
    await nft2I.connect(accounts[0]).safeMint(quester, "give quester id #2");
    await nft2I.connect(accounts[0]).safeMint(quester, "give quester id #3");
    await nft2I.connect(accounts[0]).safeMint(quester, "give quester id #4");
    await nft2I.connect(accounts[0]).safeMint(quester, "give quester id #5");

    /*
     * VALIDADE (M1 OR M2) (ONLY QUESTER CAN DO THIS)
     * 
    */

    // now since mission formula is (M1 OR M2) so either one of the two being eligible will drive the whole quest validation true.
    // or simply speaking, quester(accounts[7]) is elligible and validation result should be marked as completed
    await pQuest.connect(accounts[7]).validateQuest();
    await expect(await pQuest.questerProgresses(quester)).to.equal(COMPELETED);

    /*
     * REWARD SETTING UP. REWARD OWNER NEEDS TO APPROVE QUEST TO TRANSFER ALL HIS 100 RTD
     * 
    */
    await ftstandardI.connect(accounts[3]).approve(questProxy1Address, totalReward);
    await expect(await ftstandardI.allowance(accounts[3].address, questProxy1Address)).to.equal(totalReward);
    
    /*
     * EXECUTE QUEST OUTCOME (ANYONE CAN DO THIS LET'S USE ACCOUNTS[4])
     * 
    */
   await pQuest.connect(accounts[4]).executeQuestOutcome(quester);
   await expect(await pQuest.questerProgresses(quester)).to.equal(REWADRDED);

  });
});
