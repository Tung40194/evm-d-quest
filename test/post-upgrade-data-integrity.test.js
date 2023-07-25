const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  DONT_CARE_ADDRESS,
  DONT_CARE_BOOL,
  DONT_CARE_NUM,
  DONT_CARE_FUNC_SELECTOR,
  DONT_CARE_OPERATOR,
  DONT_CARE_ABR_BYTES,
  DONT_CARE_DATA,
} = require("./constants");
const { getCurrentBlockTimestamp } = require("./helpers");

describe("Upgrading contract should not f*** with storage layout", function () {
  beforeEach(async function () {
    accounts = await ethers.getSigners();

    // building a formula directed binary tree
    const node1 = [1, true, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, DONT_CARE_ABR_BYTES];
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

  });

  it("immutable slot at the new implementation should be available for all proxies pre and post upgrade", async () => {
    // deploy the previous version of Quest where the immutable slot was not introduced
    const Dquest = await ethers.getContractFactory("DQuest");
    const Quest = await ethers.getContractFactory("Quest");
    const QuestV2 = await ethers.getContractFactory("QuestV2");

    const questContractPrev1 = await Quest.deploy();
    const dquestProxy = await upgrades.deployProxy(
      Dquest,
      [questContractPrev1.address],
      {
        initializer: "initialize",
      }
    );
    await dquestProxy.deployed();

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;
    
    // create a proxy
    await dquestProxy
      .connect(accounts[0])
      .createQuest(
        missionFormula,
        outcomes,
        questStart,
        questEnd
      ); // proxy id 0

    // deploy the current version where the immutable slot is introduced.
    const fwder = await ethers.getContractFactory("Forwarder");
    const fwderContract = await fwder.deploy();
    await fwderContract.deployed();
    const questContractCurrent = await QuestV2.deploy(fwderContract.address);

    // upgrade to the new implementation that has the immutable slot
    await dquestProxy.upgradeQuests(questContractCurrent.address);

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;
    
    // create a proxy
    await dquestProxy
      .connect(accounts[0])
      .createQuest(
        missionFormula,
        outcomes,
        questStart,
        questEnd
      ); // proxy id 1

    // instantiating Proxy1 and Proxy2 objects
    const questCurrentProxy1 = await QuestV2.attach(await dquestProxy.getQuest(0));
    const questCurrentProxy2 = await QuestV2.attach(await dquestProxy.getQuest(1));

    // verify if the immutable slot is available for both pre-upgrade Proxy1 and post-upgrade Proxy2
    await expect(
      await questCurrentProxy1.isTrustedForwarder(fwderContract.address)
    ).to.equal(true);
    await expect(
      await questCurrentProxy2.isTrustedForwarder(fwderContract.address)
    ).to.equal(true);
  });

  it("state storage data integrity test - data post-upgrade should be preserved", async () => {
    // deploy the previous version of Quest where the immutable slot was not introduced
    const Dquest = await ethers.getContractFactory("DQuest");
    const Quest = await ethers.getContractFactory("Quest");
    const QuestV2 = await ethers.getContractFactory("QuestV2");

    const questContractPrev1 = await Quest.deploy();
    const dquestProxy = await upgrades.deployProxy(
      Dquest,
      [questContractPrev1.address],
      {
        initializer: "initialize",
      }
    );
    await dquestProxy.deployed();

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart1 = currentTimeStamp + 10;
    questEnd1 = questStart + 30;
    
    // create a proxy
    await dquestProxy
      .connect(accounts[0])
      .createQuest(
        missionFormula,
        outcomes,
        questStart1,
        questEnd1
      ); // proxy id 0

    // deploy the current version where the immutable slot is introduced.
    const fwder = await ethers.getContractFactory("Forwarder");
    const fwderContract = await fwder.deploy();
    await fwderContract.deployed();
    const questContractCurrent = await QuestV2.deploy(fwderContract.address);

    // upgrade to the new implementation that has the immutable slot
    await dquestProxy.upgradeQuests(questContractCurrent.address);

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart2 = currentTimeStamp + 10;
    questEnd2 = questStart + 30;
    
    // create a proxy
    await dquestProxy
      .connect(accounts[0])
      .createQuest(
        missionFormula,
        outcomes,
        questStart2,
        questEnd2
      ); // proxy id 1

    // instantiating Proxy1 and Proxy2 objects
    const questCurrentProxy1 = await QuestV2.attach(await dquestProxy.getQuest(0));
    const questCurrentProxy2 = await QuestV2.attach(await dquestProxy.getQuest(1));

    // verify data integrity
    await expect(await questCurrentProxy1.startTimestamp()).to.equal(questStart1);
    await expect(await questCurrentProxy1.endTimestamp()).to.equal(questEnd1);

    await expect(await questCurrentProxy2.startTimestamp()).to.equal(questStart2);
    await expect(await questCurrentProxy2.endTimestamp()).to.equal(questEnd2);
  });
});
