const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { mockMissionFormula, mockOutcomes, activeQuest } = require("../helpers");
const { ethers } = require("hardhat");

const createQuest = async (questOwner, dQuestContract, missions, outcomes) => {
  const currentTime = await time.latest();
  const startTime = currentTime + 10;
  const endTime = startTime + 60;
  if (!missions) {
    missions = mockMissionFormula();
  }
  if (!outcomes) {
    outcomes = mockOutcomes();
  }

  await dQuestContract.connect(questOwner).createQuest(missions, outcomes, startTime, endTime);

  const questLength = await dQuestContract.getQuestCount();
  const questAddress = await dQuestContract.getQuest(questLength - 1);
  const questContract = await ethers.getContractAt("Quest", questAddress);

  return questContract;
};

describe("Quest Unit Test", async () => {
  let owner, questOwner, quester;
  let dQuestContract, questContract;
  let dQuestAddress, questAddress;

  beforeEach(async () => {
    [owner, questOwner, quester] = await ethers.getSigners();

    const Quest = await ethers.getContractFactory("Quest");
    questContract = await Quest.deploy();

    const DQuest = await ethers.getContractFactory("DQuest");
    dQuestContract = await upgrades.deployProxy(DQuest, [questContract.address], { initializer: "initialize" });
    dQuestAddress = dQuestContract.address;
  });

  describe("init()", async () => {
    let startTime, endTime, missions, outcomes;

    beforeEach(async () => {
      const currentTime = await time.latest();
      startTime = currentTime + 10;
      endTime = startTime + 60;
      missions = mockMissionFormula();
      outcomes = mockOutcomes();
    });

    it("should revert when calling init directly", async () => {
      await expect(questContract.init(questOwner.address, missions, outcomes, startTime, endTime)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );
    });

    it("should revert when questStartTime < currentTime", async () => {
      const currentTime = await time.latest();
      startTime = currentTime - 1;

      await expect(
        dQuestContract.connect(questOwner).createQuest(missions, outcomes, startTime, endTime)
      ).to.be.revertedWith("Starting time is over");
    });

    it("should revert when questStartTime > questEndTime", async () => {
      endTime = startTime - 1;

      await expect(
        dQuestContract.connect(questOwner).createQuest(missions, outcomes, startTime, endTime)
      ).to.be.revertedWith("Invalid quest lifetime");
    });

    it("should revert when missions is empty", async () => {
      const emptyMission = [];
      await expect(dQuestContract.createQuest(emptyMission, outcomes, startTime, endTime)).to.be.revertedWith(
        "formula input empty"
      );
    });

    it("should revert when outcomes is empty", async () => {
      const emptyOutcome = [];
      await expect(dQuestContract.createQuest(missions, emptyOutcome, startTime, endTime)).to.be.revertedWith(
        "No outcome provided"
      );
    });

    it("should emit event when success", async () => {
      expect(await dQuestContract.connect(questOwner).createQuest(missions, outcomes, startTime, endTime))
        .to.be.emit(dQuestContract, "QuestCreated")
        .withArgs(anyValue, questOwner.address, missions, outcomes, startTime, endTime);
    });

    it("should transfer ownership to caller", async () => {
      await dQuestContract.connect(questOwner).createQuest(missions, outcomes, startTime, endTime);
      const questInstanceAddress = await dQuestContract.getQuest(0);
      const questInstanceContract = await ethers.getContractAt("Quest", questInstanceAddress);
      expect(await questInstanceContract.owner()).to.equal(questOwner.address);
    });
  });

  describe("pauseQuest()", () => {
    let questInstanceContract;

    beforeEach(async () => {
      questInstanceContract = await createQuest(questOwner, dQuestContract);
    });

    it("should revert when caller is not owner", async () => {
      await expect(questInstanceContract.pauseQuest()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when quest is not active", async () => {
      await expect(questInstanceContract.connect(questOwner).pauseQuest()).to.be.revertedWith("Quest is not Active");
    });

    it("should emit event when success", async () => {
      const startTimestamp = await questInstanceContract.startTimestamp();
      await time.increaseTo(startTimestamp);
      await expect(questInstanceContract.connect(questOwner).pauseQuest()).to.emit(questInstanceContract, "Paused");
    });

    it("should revert when pause again", async () => {
      const startTimestamp = await questInstanceContract.startTimestamp();
      await time.increaseTo(startTimestamp);
      questInstanceContract.connect(questOwner).pauseQuest();
      await expect(questInstanceContract.connect(questOwner).pauseQuest()).to.be.reverted;
    });
  });

  describe("resumeQuest()", () => {
    let questInstanceContract;

    beforeEach(async () => {
      questInstanceContract = await createQuest(questOwner, dQuestContract);

      const startTimestamp = await questInstanceContract.startTimestamp();
      await time.increaseTo(startTimestamp);
      questInstanceContract.connect(questOwner).pauseQuest();
    });

    it("should revert when caller is not owner", async () => {
      await expect(questInstanceContract.resumeQuest()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should emit event when success", async () => {
      await expect(questInstanceContract.connect(questOwner).resumeQuest()).to.emit(questInstanceContract, "Unpaused");
    });

    it("should revert when unpause again", async () => {
      await questInstanceContract.connect(questOwner).resumeQuest();
      await expect(questInstanceContract.connect(questOwner).resumeQuest()).to.be.reverted;
    });
  });

  describe.skip("join()", () => {});

  describe("setMissionNodeFormulas()", () => {
    let questInstanceContract;

    beforeEach(async () => {
      questInstanceContract = await createQuest(questOwner, dQuestContract);
    });

    it("should able to set missions when quest is not active", async () => {
      const newMissions = mockMissionFormula("snapshot");

      expect(await questInstanceContract.connect(questOwner).setMissionNodeFormulas(newMissions)).to.emit(
        questInstanceContract,
        "MissionNodeFormulasSet"
      );
    });

    it("should revert when caller is not owner", async () => {
      const newMissions = mockMissionFormula("snapshot");

      await expect(questInstanceContract.setMissionNodeFormulas(newMissions)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should revert when quest is active", async () => {
      const startTimestamp = await questInstanceContract.startTimestamp();
      await time.increaseTo(startTimestamp);

      const newMissions = mockMissionFormula("snapshot");
      await expect(questInstanceContract.connect(questOwner).setMissionNodeFormulas(newMissions)).to.be.revertedWith(
        "Quest has started"
      );
    });
  });

  describe("setOutcomes()", () => {
    let questInstanceContract;

    beforeEach(async () => {
      questInstanceContract = await createQuest(questOwner, dQuestContract);
    });

    it("should able to set outcomes when quest is not active", async () => {
      const newOutcomes = mockOutcomes();

      expect(await questInstanceContract.connect(questOwner).setOutcomes(newOutcomes)).to.emit(
        questInstanceContract,
        "OutcomesSet"
      );
    });

    it("should revert when caller is not owner", async () => {
      const newOutcomes = mockOutcomes();

      await expect(questInstanceContract.setOutcomes(newOutcomes)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should revert when quest is active", async () => {
      const startTimestamp = await questInstanceContract.startTimestamp();
      await time.increaseTo(startTimestamp);

      const newOutcomes = mockOutcomes();
      await expect(questInstanceContract.connect(questOwner).setOutcomes(newOutcomes)).to.be.revertedWith(
        "Quest has started"
      );
    });
  });

  describe("setMissionStatus()", () => {
    let questInstanceContract, mockMissionHandlerContract;

    beforeEach(async () => {
      mockMissionHandlerContract = questOwner;
      const missions = mockMissionFormula("", mockMissionHandlerContract.address);

      questInstanceContract = await createQuest(questOwner, dQuestContract, missions);
    });

    it("should revert when quest is not active", async () => {
      const anyNodeId = 0;
      const isMissionDone = true;

      await expect(
        questInstanceContract.setMissionStatus(quester.address, anyNodeId, isMissionDone)
      ).to.be.revertedWith("Quest is not Active");
    });

    it("should revert when sender is not missionHandler", async () => {
      await activeQuest(questInstanceContract);

      const existNode = 1;
      const isMissionDone = true;

      await expect(
        questInstanceContract.setMissionStatus(quester.address, existNode, isMissionDone)
      ).to.be.revertedWith("States update not allowed");
    });

    it("should revert when quester does not join quest", async () => {
      await activeQuest(questInstanceContract);

      const existNode = 1;
      const isMissionDone = true;

      await expect(
        questInstanceContract
          .connect(mockMissionHandlerContract)
          .setMissionStatus(quester.address, existNode, isMissionDone)
      ).to.be.revertedWith("Not a quester");
    });

    it("should emit event when success", async () => {
      await activeQuest(questInstanceContract);
      await questInstanceContract.connect(quester).join();

      const existNode = 1;
      const isMissionDone = true;

      expect(
        await questInstanceContract
          .connect(mockMissionHandlerContract)
          .setMissionStatus(quester.address, existNode, isMissionDone)
      ).to.emit(questInstanceContract, "MissionStatusSet");
    });
  });

  describe("validateMission()", () => {
    let mission;
    let questInstanceContract, nftContract, nftHodlerContract;

    beforeEach(async () => {
      const NFT = await ethers.getContractFactory("NFT1");
      nftContract = await NFT.deploy();

      const NFTHodler = await ethers.getContractFactory("NFTHodler");
      nftHodlerContract = await NFTHodler.deploy(dQuestAddress);

      const missionData = [nftContract.address];
      /**
       ********* Mission Formula *********
       NFT in range (0 -> 100)
    
                    OR(id=1)
                    /      \\
                   /        \\
                  /          \\
                AND(2)         OR(3)
                / \\            / \\ 
               /   \\          /   \\
        miss1(4) miss2(5) miss3(6) miss4(7)
      */
      const missions = mockMissionFormula("nft", nftHodlerContract.address, missionData);
      mission = missions[3];

      questInstanceContract = await createQuest(questOwner, dQuestContract, missions);
    });

    it("should revert when quest is not active", async () => {
      const anyNodeId = 0;

      await expect(questInstanceContract.connect(quester).validateMission(anyNodeId)).to.be.revertedWith(
        "Quest is not Active"
      );
    });

    it("should revert when node does not exist", async () => {
      const notExistNodeId = 0;
      await activeQuest(questInstanceContract);

      await expect(questInstanceContract.connect(quester).validateMission(notExistNodeId)).to.be.revertedWith(
        "Null node"
      );
    });

    it("should revert when node is not mission", async () => {
      const operatorNodeId = 1;
      await activeQuest(questInstanceContract);

      await expect(questInstanceContract.connect(quester).validateMission(operatorNodeId)).to.be.revertedWith(
        "Not a mission"
      );
    });

    it("should emit `MissionValidated` event when success", async () => {
      await activeQuest(questInstanceContract);

      const missionId = mission[0];
      await expect(questInstanceContract.connect(quester).validateMission(missionId))
        .to.emit(nftHodlerContract, "MissionValidated")
        .withArgs(quester.address, anyValue, anyValue);
    });

    it("should set mission is true if done", async () => {
      await nftContract.safeMint(quester.address, "http://example.com");
      await activeQuest(questInstanceContract);

      const missionId = mission[0];
      const isMissionDone = true;
      expect(await questInstanceContract.connect(quester).validateMission(missionId))
        .to.emit(nftHodlerContract, "MissionValidated")
        .withArgs(quester.address, anyValue, isMissionDone);
      expect(await questInstanceContract.getMissionStatus(quester.address, missionId)).to.equal(isMissionDone);
    });

    it("should set mission is false if undone", async () => {
      await activeQuest(questInstanceContract);

      const missionId = mission[0];
      const isMissionDone = false;
      expect(await questInstanceContract.connect(quester).validateMission(missionId))
        .to.emit(nftHodlerContract, "MissionValidated")
        .withArgs(quester.address, anyValue, isMissionDone);
      expect(await questInstanceContract.getMissionStatus(quester.address, missionId)).to.equal(isMissionDone);
    });
  });

  describe("validateQuest()", () => {});

  describe("executeQuestOutcome()", () => {});

  describe("erc721SetTokenUsed()", async () => {});
});

