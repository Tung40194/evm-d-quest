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
} = require("../test/constants");

async function demo() {
  const provider = new ethers.providers.JsonRpcProvider("https://matic-mumbai.chainstacklabs.com");

  address1 = "0x072c7F4a8e9276f810727Ca68d3c99e6d8a72990";
  address2 = "0x5fB365a93B6F6db556c40c346ae14Bbd1dDAFB1E";
  signer1 = provider.getSigner(address1);
  signer2 = provider.getSigner(address2);

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

  /*
   * SCRIPTING SUMMARY:
   *
   * quest: M1 OR M2
   * M1: own at least an NFT token in range [1,10] from address X
   * M2: own at least a token in range [5,30] from address Y
   * outcome: get 32 Ft token from address Z
   *
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

  // putting all nodes together to make our mission formula
  missionFormula = [OR_node, M1_node, M2_node];

  /*
   * BUILDING OUTCOME
   * the outcome: 32 token RTD for anyone completed the quest (M1 OR M2)
   *
   */
  const totalReward = 100;
  const toBeRewarded = 32;
  const ftstandardI = await ftStandard.attach(deployedFtStandard.address);

  // address1 aka owner of FT standard will mint to itself 100 erc20 token RTD
  await ftstandardI.connect(signer1).mint(address1, totalReward);

  // expect erc20 balance
  await expect(await ftstandardI.balanceOf(address1)).to.equal(totalReward);

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
    [address2, DONT_CARE_ADDRESS, toBeRewarded.toString()]
  );

  const outcome1 = [deployedFtStandard.address, erc20mintSelector, data, false, DONT_CARE_NUM, true, totalReward];
  outcomes = [outcome1];
  /*
   * START CREATING A QUEST WITH A LIFETIME 30 OF SECONDS IN 10 SECONDS
   *
   */
  // currentTimeStamp = await getCurrentBlockTimestamp();
  // questStart = currentTimeStamp + 10;
  // questEnd = questStart + 30;

  web3 = new Web3("https://matic-mumbai.chainstacklabs.com");
  blockNumber = await web3.eth.getBlockNumber();
  block = await web3.eth.getBlock(blockNumber);
  currentTimeStamp = await block.timestamp;

  questStart = currentTimeStamp + 120;
  questEnd = questStart + 120;

  // create a quest
  await deployedDquest.connect(signer1).createQuest(missionFormula, outcomes, questStart, questEnd);

  // instantiating a proxy quest contract
  const questProxy1Address = await deployedDquest.getQuest(0);
  const pQuest = await quest.attach(questProxy1Address);

  // add address2 as a Quester
  await expect(await pQuest.questerProgresses(address2)).to.equal(NOT_ENROLLED);

  //await advanceBlockTimestamp(20);
  /*
   *
   *
   * WAITING 120 seconds
   *
   *
   */
  await new Promise((r) => setTimeout(r, 120000));

  await expect(pQuest.connect(signer2).addQuester()).to.emit(pQuest, "QuesterAdded").withArgs(address2);
  await expect(await pQuest.questerProgresses(address2)).to.equal(IN_PROGRESS);

  /*
   * DISTRIBUTING NFT1 AND NFT2 TO QUESTER
   *
   */
  const nft1I = await nft1.attach(deployedNft1.address);
  const nft2I = await nft2.attach(deployedNft2.address);

  // give address2 id #1 from NFT 1. This will not be eligible because required range is [1,10]
  await nft1I.connect(accounts[0]).safeMint(address2, "give address2 id #0");

  // give address2 6 first ids from NFT2. This will be eligible because required range is [5,30]
  await nft2I.connect(accounts[0]).safeMint(address2, "give address2 id #0");
  await nft2I.connect(accounts[0]).safeMint(address2, "give address2 id #1");
  await nft2I.connect(accounts[0]).safeMint(address2, "give address2 id #2");
  await nft2I.connect(accounts[0]).safeMint(address2, "give address2 id #3");
  await nft2I.connect(accounts[0]).safeMint(address2, "give address2 id #4");
  await nft2I.connect(accounts[0]).safeMint(address2, "give address2 id #5");

  /*
   * VALIDADE (M1 OR M2) (ONLY QUESTER CAN DO THIS)
   *
   */

  // now since mission formula is (M1 OR M2) so either one of the two being eligible will drive the whole quest validation true.
  // or simply speaking, address2/signer2 is elligible and validation result should be marked as completed
  await pQuest.connect(signer2).validateQuest();
  await expect(await pQuest.questerProgresses(address2)).to.equal(COMPLETED);

  /*
   * REWARD SETTING UP. REWARD OWNER(signer1) NEEDS TO APPROVE QUEST TO TRANSFER ALL HIS 100 RTD
   *
   */
  await ftstandardI.connect(signer1).approve(questProxy1Address, totalReward);
  await expect(await ftstandardI.allowance(address1, questProxy1Address)).to.equal(totalReward);

  /*
   * EXECUTE QUEST OUTCOME (ANYONE CAN DO THIS LET'S USE ACCOUNTS[4])
   *
   */
  await pQuest.connect(signer1).executeQuestOutcome(address2);
  await expect(await pQuest.questerProgresses(address2)).to.equal(REWARDED);
  // expect erc20 balance
  await expect(await ftstandardI.balanceOf(address2)).to.equal(toBeRewarded);
  done();
}

demo();
