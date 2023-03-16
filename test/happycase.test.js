const {
    BN, // Big Number support
    constants, // Common constants, like the zero address and largest integers
    expectEvent, // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    time,
    balance,
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
const DONT_CARE_ABR_BYTES = ['0x012345', '0x6789abcdef'];
const DONT_CARE_DATA = "0xabcdef";
const OperatorType = "uint8";

const ORACLE = "0x5fB365a93B6F6db556c40c346ae14Bbd1dDAFB1E";

const AND = 1;
const OR = 2;

const missionNodeType = [
    'uint256',
    'bool',
    'address',
    'address',
    'uint8',
    'uint256',
    'uint256',
    'bytes[]'
];

const OutcomeTypes = [
    'address',
    'bytes4',
    'bytes',
    'bool',
    'uint256',
    'bool',
    'uint256'
];

async function getCurrentBlockTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
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


    beforeEach(async () => {
        accounts = await ethers.getSigners();
        quest = await ethers.getContractFactory("Quest");
        dquest = await ethers.getContractFactory("DQuest");
        mission = await ethers.getContractFactory("NFThodler");
        nft1 = await ethers.getContractFactory("NFT1");
        nft2 = await ethers.getContractFactory("NFT2");

        //deploy contracts
        deployedQuest = await quest.deploy();
        deployedDquest = await upgrades.deployProxy(dquest, [deployedQuest.address], { initializer: "initialize" });
        console.log("| - dquest deployed at: ", deployedDquest.address);

        deployedMission1 = await mission.deploy(deployedDquest.address);
        deployedMission2 = await mission.deploy(deployedDquest.address);
        deployedNft1 = await nft1.deploy();
        deployedNft2 = await nft2.deploy();
    });

    it("create a quest", async () => {

        // building a formula directed binary tree
        const node = {
            id: 1,
            isMission: false,
            missionHandlerAddress: DONT_CARE_ADDRESS,
            oracleAddress: DONT_CARE_ADDRESS,
            operatorType: AND,
            leftNode: 0,
            rightNode: 0,
            data: DONT_CARE_ABR_BYTES
        };
        
        const node1 = [
            node.id,
            node.isMission,
            node.missionHandlerAddress,
            node.oracleAddress,
            node.operatorType,
            node.leftNode,
            node.rightNode,
            node.data
        ];

        // building outcomes
        const outcome = {
            tokenAddress: DONT_CARE_ADDRESS,
            functionSelector: DONT_CARE_FUNC_SELECTOR,
            data: DONT_CARE_DATA,
            isNative: DONT_CARE_BOOL,
            nativeAmount: DONT_CARE_NUM,
            isLimitedReward: DONT_CARE_BOOL,
            totalReward: DONT_CARE_NUM
        };
        
        const outcome1 = [
            outcome.tokenAddress,
            outcome.functionSelector,
            outcome.data,
            outcome.isNative,
            outcome.nativeAmount,
            outcome.isLimitedReward,
            outcome.totalReward
        ];

        missionFormula = [node1];
        outcomes = [outcome1];

        currentTimeStamp = await getCurrentBlockTimestamp();
        questStart = currentTimeStamp + 1000;
        questEnd = questStart + 3000;

        // create a quest
        await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);
    });
});
