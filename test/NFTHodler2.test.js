const { expect } = require("chai");
const {
  DONT_CARE_ADDRESS,
  DONT_CARE_BOOL,
  DONT_CARE_NUM,
  DONT_CARE_FUNC_SELECTOR,
  DONT_CARE_OPERATOR,
  DONT_CARE_ABR_BYTES,
  DONT_CARE_DATA,
  AND,
  OR,
  NOT_ENROLLED,
  IN_PROGRESS,
  COMPLETED,
  REWARDED
} = require("./constants");

const { getCurrentBlockTimestamp, advanceBlockTimestamp } = require("./helpers");

// Testing setMintingCondition function for multi-minting condition
describe("Testing new mission handler for erc721 enumerable contracts", () => {
  let accounts, quest, dquest, mission, nft3, ftStandard;
  let deployedQuest, deployedDquest, deployedMission, deployedNft3, deployedFtStandard;
  let missionFormula, outcomes, currentTimeStamp, questStart, questEnd;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    quest = await ethers.getContractFactory("Quest");
    dquest = await ethers.getContractFactory("DQuest");
    mission = await ethers.getContractFactory("NFTHodler2");
    nft3 = await ethers.getContractFactory("NFT3");
    ftStandard = await ethers.getContractFactory("FTStandard");

    //deploy contracts
    deployedQuest = await quest.deploy();
    console.log("| - quest impl deployed at: ", deployedQuest.address);

    deployedDquest = await upgrades.deployProxy(dquest, [deployedQuest.address], { initializer: "initialize" });
    console.log("| - dquest proxy deployed at: ", deployedDquest.address);

    deployedMission = await mission.deploy(deployedDquest.address);
    console.log("| - NFT hodler mission deployed at: ", deployedMission.address);

    deployedNft3 = await nft3.deploy();
    console.log("| - NFT1 token contract deployed at: ", deployedNft3.address);

    deployedFtStandard = await ftStandard.deploy("Reward Token Demo", "RTD", 0);
    console.log("| - Reward token contract deployed at: ", deployedFtStandard.address);
  });

  it("Should create a quest with a 1-node formula, set up a condition, validate it, and execute the outcome", async () => {
    // encoding data for M1
    addr = web3.eth.abi.encodeParameter("address", deployedNft3.address);
    start = web3.eth.abi.encodeParameter("uint256", "7");
    end = web3.eth.abi.encodeParameter("uint256", "10000000000000000000000000000");
    data = [addr, start, end];
    const M1_node = [2, true, deployedMission.address, DONT_CARE_ADDRESS, DONT_CARE_OPERATOR, 0, 0, data];

    missionFormula = [M1_node];

    /*
     * BUILDING OUTCOME
     * the outcome: 32 token RTD for anyone completed the quest (M1 OR M2)
     *
     */
    const totalReward = 100;
    const toBeRewarded = 32;
    const ftstandardI = await ftStandard.attach(deployedFtStandard.address);

    // accounts[0] aka owner of FT standard will mint to account[3] 100 erc20 token RTD
    await ftstandardI.connect(accounts[0]).mint(accounts[3].address, totalReward);

    // expect erc20 balance
    await expect(await ftstandardI.balanceOf(accounts[3].address)).to.equal(totalReward);

    // function selector of transferFrom(address from, address to, uint256 amount)
    erc20mintSelector = "0x23b872dd";

    // `to` is dont care currently because it will be replaced by quester later anyway
    data = web3.eth.abi.encodeFunctionCall(
      {
        name: "transferFrom",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "from"
          },
          {
            type: "address",
            name: "to"
          },
          {
            type: "uint256",
            name: "amount"
          }
        ]
      },
      [accounts[3].address, DONT_CARE_ADDRESS, toBeRewarded.toString()]
    );

    const outcome1 = [deployedFtStandard.address, erc20mintSelector, data, false, DONT_CARE_NUM, true, totalReward];
    outcomes = [outcome1];
    /*
     * START CREATING A QUEST WITH A LIFETIME 30 OF SECONDS IN 10 SECONDS
     *
     */
    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;

    // create a quest
    await deployedDquest.createQuest(missionFormula, outcomes, questStart, questEnd);

    // instantiating a proxy quest contract and the condition NFT
    const questProxy1Address = await deployedDquest.getQuest(0);
    const pQuest = await quest.attach(questProxy1Address);
    const nft3I = await nft3.attach(deployedNft3.address);

    // add Quester
    await expect(await pQuest.questerProgresses(accounts[7].address)).to.equal(NOT_ENROLLED);
    await advanceBlockTimestamp(20);
    quester = accounts[7].address;
    await expect(pQuest.connect(accounts[7]).addQuester()).to.emit(pQuest, "QuesterAdded").withArgs(quester);
    await expect(await pQuest.questerProgresses(accounts[7].address)).to.equal(IN_PROGRESS);

    /*
     * FAIL VALIDADE (M1) (ONLY QUESTER CAN DO THIS)
     *
     */

    // give quester id #6 from NFT3. This will not be eligible because required range is [7,10]
    await nft3I.connect(accounts[0]).safeMint(quester, 6);
    // now since mission formula is (M1 OR M2) so either one of the two being eligible will drive the whole quest validation true.
    // or simply speaking, quester(accounts[7]) is elligible and validation result should be marked as completed
    await pQuest.connect(accounts[7]).validateQuest();
    await expect(await pQuest.questerProgresses(quester)).to.equal(IN_PROGRESS);

    /*
     * PASS VALIDADE (M1) (ONLY QUESTER CAN DO THIS)
     *
     */

    await nft3I.connect(accounts[0]).safeMint(quester, 10);
    await pQuest.connect(accounts[7]).validateQuest();
    await expect(await pQuest.questerProgresses(quester)).to.equal(COMPLETED);

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
    await expect(await pQuest.questerProgresses(quester)).to.equal(REWARDED);
    // expect erc20 balance
    await expect(await ftstandardI.balanceOf(quester)).to.equal(toBeRewarded);
  });
});
