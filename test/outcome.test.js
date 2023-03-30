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
describe("Testing Outcome", () => {
  let accounts, quest, dquest, mission, nft1, nft2, ftStandard, nftReward;
  let deployedQuest, deployedDquest, deployedMission, deployedNft1, deployedNft2, deployedFtStandard;
  let missionFormula, outcomes, currentTimeStamp, questStart, questEnd;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    quest = await ethers.getContractFactory("Quest");
    dquest = await ethers.getContractFactory("DQuest");
    mission = await ethers.getContractFactory("NFTHodler");
    nft1 = await ethers.getContractFactory("NFT1");
    nft2 = await ethers.getContractFactory("NFT2");
    ftStandard = await ethers.getContractFactory("FTStandard");
    nftReward = await ethers.getContractFactory("NFTReward");

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
    console.log("| - Reward ERC20 contract deployed at: ", deployedFtStandard.address);

    deployedNFTReward = await nftReward.deploy();
    console.log("| - Reward ERC721 contract deployed at: ", deployedNFTReward.address);
  });

  // A full flow demo test case
  it("Should create a quest with a 3-node formula, set up a condition, validate it, and execute the ERC20 unlimited outcome", async () => {
    const OR_node = [1, false, DONT_CARE_ADDRESS, OR, 2, 3, DONT_CARE_ABR_BYTES];

    // encoding data for M1
    addr = web3.eth.abi.encodeParameter("address", deployedNft1.address);
    start = web3.eth.abi.encodeParameter("uint256", "1");
    end = web3.eth.abi.encodeParameter("uint256", "10");
    data = [addr, start, end];
    const M1_node = [2, true, deployedMission.address, DONT_CARE_OPERATOR, 0, 0, data];

    // encoding data for M2
    addr = web3.eth.abi.encodeParameter("address", deployedNft2.address);
    start = web3.eth.abi.encodeParameter("uint256", "5");
    end = web3.eth.abi.encodeParameter("uint256", "30");
    data = [addr, start, end];
    const M2_node = [3, true, deployedMission.address, DONT_CARE_OPERATOR, 0, 0, data];

    missionFormula = [OR_node, M1_node, M2_node];

    /*
     * BUILDING OUTCOME
     * the outcome: 32 token RTD for anyone completed the quest (M1 OR M2)
     * ERC20 outcome is unlimited
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

    const outcome1 = [deployedFtStandard.address, erc20mintSelector, data, false, DONT_CARE_NUM, false, 0];
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

    // instantiating a proxy quest contract
    const questProxy1Address = await deployedDquest.getQuest(0);
    const pQuest = await quest.attach(questProxy1Address);

    // add Quester
    await expect(await pQuest.getQuesterProgress(accounts[7].address)).to.equal(NOT_ENROLLED);
    await advanceBlockTimestamp(20);
    quester = accounts[7].address;
    await expect(pQuest.connect(accounts[7]).join()).to.emit(pQuest, "QuesterJoined").withArgs(quester);
    await expect(await pQuest.getQuesterProgress(accounts[7].address)).to.equal(IN_PROGRESS);

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

    // validate mission status
    await expect(pQuest.connect(accounts[7]).validateMission(1)).to.revertedWith("Not a mission");
    await pQuest.connect(accounts[7]).validateMission(2);
    await pQuest.connect(accounts[7]).validateMission(3);
    await expect(await pQuest.getMissionStatus(quester, 2)).to.equal(false);
    await expect(await pQuest.getMissionStatus(quester, 3)).to.equal(true);

    /*
     * VALIDADE (M1 OR M2) (ONLY QUESTER CAN DO THIS)
     *
     */

    // now since mission formula is (M1 OR M2) so either one of the two being eligible will drive the whole quest validation true.
    // or simply speaking, quester(accounts[7]) is elligible and validation result should be marked as completed
    await pQuest.connect(accounts[7]).validateQuest();
    await expect(await pQuest.getQuesterProgress(quester)).to.equal(COMPLETED);

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
    await expect(await pQuest.getQuesterProgress(quester)).to.equal(REWARDED);
    // expect erc20 balance
    await expect(await ftstandardI.balanceOf(quester)).to.equal(toBeRewarded);
  });

  it.only("Should create a quest with a 1-node formula, set up a condition, validate it, and execute the ERC721 unlimited outcome", async () => {
    // encoding data for node
    addr = web3.eth.abi.encodeParameter("address", deployedNft1.address);
    start = web3.eth.abi.encodeParameter("uint256", "1");
    end = web3.eth.abi.encodeParameter("uint256", "10");
    data = [addr, start, end];
    const M1_node = [1, true, deployedMission.address, DONT_CARE_OPERATOR, 0, 0, data];

    missionFormula = [M1_node];

    /*
     * BUILDING OUTCOME
     * the outcome: 32 token RTD for anyone completed the quest (M1 OR M2)
     * ERC20 outcome is unlimited
     */

    
    const firstTokenId = 4;
    const totalERC721 = 20;
    const nftRewardI = await nftReward.attach(deployedNFTReward.address);

    // accounts[0] aka owner of NFTReward will mint to account[3] 20 erc721 token 
    
    for (i = 0; i < totalERC721; i++) 
    {
        await nftRewardI.connect(accounts[0]).safeMint(accounts[3].address);
    }

    // expect erc20 balance
    await expect(await nftRewardI.balanceOf(accounts[3].address)).to.equal(totalERC721);

    // function selector of transferFrom(address from, address to, uint256 amount)
    erc721safeTransferFromSelector = "0x42842e0e";

    // `to` is dont care currently because it will be replaced by quester later anyway
    data = web3.eth.abi.encodeFunctionCall(
      {
        name: "safeTransferFrom",
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
            name: "tokenId"
          }
        ]
      },
      [accounts[3].address, DONT_CARE_ADDRESS, firstTokenId.toString()]
    );

    const outcome1 = [deployedNFTReward.address, erc721safeTransferFromSelector, data, false, DONT_CARE_NUM, false, 0];
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

    // instantiating a proxy quest contract
    const questProxy1Address = await deployedDquest.getQuest(0);
    const pQuest = await quest.attach(questProxy1Address);

    // add Quester
    await expect(await pQuest.getQuesterProgress(accounts[7].address)).to.equal(NOT_ENROLLED);
    await advanceBlockTimestamp(20);
    quester = accounts[7].address;
    await expect(pQuest.connect(accounts[7]).join()).to.emit(pQuest, "QuesterJoined").withArgs(quester);
    await expect(await pQuest.getQuesterProgress(accounts[7].address)).to.equal(IN_PROGRESS);

    /*
     * DISTRIBUTING NFT1 TO QUESTER
     *
     */
    const nft1I = await nft1.attach(deployedNft1.address);

    // give quester 6 first ids from NFT1. This will be eligible because required range is [5,30]
    await nft1I.connect(accounts[0]).safeMint(quester, "give quester id #0");
    await nft1I.connect(accounts[0]).safeMint(quester, "give quester id #1");
    await nft1I.connect(accounts[0]).safeMint(quester, "give quester id #2");
    await nft1I.connect(accounts[0]).safeMint(quester, "give quester id #3");
    await nft1I.connect(accounts[0]).safeMint(quester, "give quester id #4");
    await nft1I.connect(accounts[0]).safeMint(quester, "give quester id #5");

    // validate mission status
    await pQuest.connect(accounts[7]).validateMission(1);
    await expect(await pQuest.getMissionStatus(quester, 1)).to.equal(true);

    /*
     * VALIDADE (M1) (ONLY QUESTER CAN DO THIS)
     *
     */

    await pQuest.connect(accounts[7]).validateQuest();
    await expect(await pQuest.getQuesterProgress(quester)).to.equal(COMPLETED);

    /*
     * REWARD SETTING UP. REWARD OWNER NEEDS TO APPROVE QUEST TO TRANSFER ALL HIS 100 RTD
     *
     */

    await nftRewardI.connect(accounts[3]).setApprovalForAll(questProxy1Address, true);

    /*
     * EXECUTE QUEST OUTCOME (ANYONE CAN DO THIS LET'S USE ACCOUNTS[4])
     *
     */
    await pQuest.connect(accounts[4]).executeQuestOutcome(quester);
    await expect(await pQuest.getQuesterProgress(quester)).to.equal(REWARDED);
    // expect erc721 balance
    await expect(await nftRewardI.ownerOf(firstTokenId)).to.equal(quester);
    
  });
});
