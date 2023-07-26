const { expect } = require("chai");
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { mockMissionFormula, mockOutcomes } = require("../helpers");
const { DONT_CARE_ADDRESS } = require("../constants");

describe("DQuest Unit Test", () => {
  let owner, questOwner;
  let questContract, dQuestContract;

  beforeEach(async () => {
    [owner, questOwner] = await ethers.getSigners();

    const Quest = await ethers.getContractFactory("Quest");
    questContract = await Quest.deploy();

    const DQuest = await ethers.getContractFactory("DQuest");
    dQuestContract = await upgrades.deployProxy(DQuest, [questContract.address], { initializer: "initialize" });
  });

  describe("initialize()", () => {
    it("should init with correct implement contract address", async () => {
      expect(await dQuestContract.getImplementation()).to.equal(questContract.address);
    });

    it("should revert when try to call `initialize()` again", async () => {
      await expect(dQuestContract.initialize(questContract.address)).to.be.reverted;
    });
  });

  describe("createQuest()", () => {
    let questInputs;

    beforeEach(async () => {
      const nodes = mockMissionFormula();
      const outcomes = mockOutcomes();
      const currentTime = await helpers.time.latest();
      const startTime = currentTime + 10;
      const endTime = startTime + 60;

      questInputs = [nodes, outcomes, startTime, endTime];
    });

    it("should emit event when success", async () => {
      expect(await dQuestContract.connect(questOwner).createQuest(...questInputs))
        .to.emit(dQuestContract, "QuestCreated")
        .withArgs(questContract.address, questOwner.address, ...questInputs);
    });

    it("should increase `quests` length", async () => {
      const beforeQuestLength = await dQuestContract.getQuestCount();
      await dQuestContract.connect(questOwner).createQuest(...questInputs);
      const afterQuestLength = await dQuestContract.getQuestCount();
      expect(afterQuestLength - beforeQuestLength).to.equal(1);
    });

    it("should include quest proxy address in `quests`", async () => {
      const tx = await dQuestContract.connect(questOwner).createQuest(...questInputs);
      const receiptTx = await tx.wait();
      const questAddressFromEvent = "0x" + receiptTx.events[receiptTx.events.length - 1].data.slice(26, 66);
      const questLength = await dQuestContract.getQuestCount();
      const newQuestAddress = await dQuestContract.getQuest(questLength - 1);
      expect(newQuestAddress.toLowerCase()).to.equal(questAddressFromEvent);
    });

    it("should include quest proxy address in `adminQuests`", async () => {
      await dQuestContract.connect(questOwner).createQuest(...questInputs);
      const questLength = await dQuestContract.getQuestCount();
      const newQuestAddress = await dQuestContract.getQuest(questLength - 1);
      expect(await dQuestContract.getQuests(questOwner.address)).to.include.members([newQuestAddress]);
    });
  });

  describe("upgradeQuests()", () => {
    it("should point to new implementation address", async () => {
      const Quest = await ethers.getContractFactory("Quest");
      const newQuestContract = await Quest.deploy();

      await dQuestContract.upgradeQuests(newQuestContract.address);
      expect(await dQuestContract.getImplementation()).to.equal(newQuestContract.address);
    });

    it("should upgrade multiple quests contract", async () => {
      const nodes = mockMissionFormula();
      const outcomes = mockOutcomes();
      const currentTime = await helpers.time.latest();
      const startTime = currentTime + 10;
      const endTime = startTime + 60;

      const questInputs = [nodes, outcomes, startTime, endTime];

      await dQuestContract.createQuest(...questInputs); // quest id 0
      const quest0Address = await dQuestContract.getQuest(0);

      await dQuestContract.createQuest(...questInputs); // quest id 1
      const quest1Address = await dQuestContract.getQuest(1);

      const Quest = await ethers.getContractFactory("QuestV2Test");
      const questV2 = await Quest.deploy();
      await dQuestContract.upgradeQuests(questV2.address);

      const quest0 = await ethers.getContractAt("QuestV2Test", quest0Address);
      const quest1 = await ethers.getContractAt("QuestV2Test", quest1Address);

      expect(await quest0.checkUpgrade()).to.equal(true);
      expect(await quest1.checkUpgrade()).to.equal(true);
    });
  });
});
