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

// Testing setMintingCondition function for multi-minting condition
describe("Overlap with tokenRange which is currently in sale period", () => {

    let accounts;


    beforeEach(async () => {
        accounts = await ethers.getSigners();

        const quest = await ethers.getContractFactory("Quest");
        const deployedQuest = await quest.deploy();

        const dquest = await ethers.getContractFactory("DQuest");

        // deploy Factory with initial implementation contract myNFTV1
        const deployedDquest = await upgrades.deployProxy(dquest, [deployedQuest.address], { initializer: "initialize" });
        console.log("dquest deployed at: ", deployedDquest.address);
    });

    it("create a quest", async () => {
    });
});
