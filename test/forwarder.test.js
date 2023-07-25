// Import the necessary dependencies and artifacts
const { expect } = require("chai");
const ethUtil = require("ethereumjs-util");
const { config } = require("hardhat");
const ethSigUtil = require("@metamask/eth-sig-util");
const Web3 = require("web3");
const {
  SignTypedDataVersion,
  TypedDataUtils,
} = require("@metamask/eth-sig-util");
const { bufferToHex } = require("ethereumjs-util");
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

describe("Testing Forwarder", function (accounts) {
  let privateKey1;
  let forwarder;
  let fromAddress;

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    const chainId = await new Web3(web3.currentProvider).eth.getChainId();
    console.log("chainId=", chainId);
    const hardhatAccounts = config.networks.hardhat.accounts;
    const index = 1; // second wallet
    const wallet1 = ethers.Wallet.fromMnemonic(
      hardhatAccounts.mnemonic,
      hardhatAccounts.path + `/${index}`
    );
    fromAddress = await wallet1.getAddress();
    privateKey1 = wallet1.privateKey;

    // Deploy the Forwarder contract before each test
    const Forwarder = await ethers.getContractFactory("Forwarder");
    forwarder = await Forwarder.deploy();
    await forwarder.deployed();

    // Deploy the Quest contract before each test
    const Factory = await ethers.getContractFactory("DQuest");
    const Quest = await ethers.getContractFactory("QuestV2");
    quest = await Quest.deploy(forwarder.address);
    await quest.deployed();
    const dquestProxy = await upgrades.deployProxy(Factory, [quest.address], {
      initializer: "initialize",
    });
    await dquestProxy.deployed();

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

    currentTimeStamp = await getCurrentBlockTimestamp();
    questStart = currentTimeStamp + 10;
    questEnd = questStart + 30;

    // create a proxies
    await dquestProxy
      .connect(accounts[0])
      .createQuest(
        missionFormula,
        outcomes,
        questStart,
        questEnd
      ); // proxy id 1

    // instantiating Proxy1
    questProxy1 = await Quest.attach(await dquestProxy.getQuest(0));
  });

  it("sign + verify + execute without sufix", async function () {
    const EIP712Domain = [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ];
    const ForwardRequest = [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "validUntilTime", type: "uint256" },
    ];

    const toSign = {
      types: {
        EIP712Domain,
        ForwardRequest,
      },
      domain: {
        name: "GSNForwarder",
        version: "0.0.1",
        chainId: 31337,
        verifyingContract: forwarder.address,
      },
      primaryType: "ForwardRequest",
      message: {
        from: fromAddress,
        to: questProxy1.address,
        value: 0,
        gas: 1e6,
        nonce: await forwarder
          .getNonce(accounts[1].address)
          .then((nonce) => nonce.toNumber()),
        data: web3.eth.abi.encodeFunctionCall(
          {
            "inputs": [],
            "name": "join",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          },
          []
        ),
        validUntilTime: 1684230004693,
      },
    };

    const domainSeparatorHash = bufferToHex(
      TypedDataUtils.hashStruct(
        "EIP712Domain",
        toSign.domain,
        toSign.types,
        SignTypedDataVersion.V4
      )
    );
    const requestTypeHash = TypedDataUtils.hashType(
      "ForwardRequest",
      toSign.types
    );

    // SIGNING
    const formatedPrivateKey = Buffer.from(privateKey1.slice(2), "hex");
    const signature = ethSigUtil.signTypedData({
      privateKey: formatedPrivateKey,
      data: toSign,
      version: SignTypedDataVersion.V4,
    });

    // VERIFYING OFF-CHAIN
    const signer = ethSigUtil.recoverTypedSignature({
      data: toSign,
      signature: signature,
      version: SignTypedDataVersion.V4,
    });
    expect(signer.toLowerCase()).to.equal(toSign.message.from.toLowerCase());

    // VERIFYING ON-CHAIN
    // register domain separator
    await forwarder.registerDomainSeparator("GSNForwarder", "0.0.1");
    // execute
    let suffixDataEncodeHash = [];
    await forwarder.execute(
      toSign.message,
      domainSeparatorHash,
      requestTypeHash,
      suffixDataEncodeHash,
      signature
    );
  });

  it("sign + verify + execute with atomic string typed suffix", async function () {
    const EIP712Domain = [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ];
    const ForwardRequest = [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "validUntilTime", type: "uint256" },
      // a new atomic suffix with type string
      { name: "suffix", type: "string" },
    ];

    const toSign = {
      types: {
        EIP712Domain,
        ForwardRequest,
      },
      domain: {
        name: "GSNForwarder",
        version: "0.0.1",
        chainId: 31337,
        verifyingContract: forwarder.address,
      },
      primaryType: "ForwardRequest",
      message: {
        from: fromAddress,
        to: questProxy1.address,
        value: 0,
        gas: 1e6,
        nonce: await forwarder
          .getNonce(accounts[1].address)
          .then((nonce) => nonce.toNumber()),
        data: web3.eth.abi.encodeFunctionCall(
          {
            inputs: [],
            name: "claim",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
          []
        ),
        validUntilTime: 1684230004693,
        suffix: "this is the new suffix data",
      },
    };

    const domainSeparatorHash = bufferToHex(
      TypedDataUtils.hashStruct(
        "EIP712Domain",
        toSign.domain,
        toSign.types,
        SignTypedDataVersion.V4
      )
    );
    const requestTypeHash = TypedDataUtils.hashType(
      "ForwardRequest",
      toSign.types
    );

    // SIGNING OFF CHAIN
    const formatedPrivateKey = Buffer.from(privateKey1.slice(2), "hex");
    const signature = ethSigUtil.signTypedData({
      privateKey: formatedPrivateKey,
      data: toSign,
      version: SignTypedDataVersion.V4,
    });

    // VERIFYING OFF-CHAIN
    const signer = ethSigUtil.recoverTypedSignature({
      data: toSign,
      signature: signature,
      version: SignTypedDataVersion.V4,
    });
    expect(signer.toLowerCase()).to.equal(toSign.message.from.toLowerCase());

    // VERIFYING ON-CHAIN
    // register domain separator
    await forwarder.registerDomainSeparator("GSNForwarder", "0.0.1");
    // register suffix type
    await forwarder.registerRequestType(toSign.primaryType, "string suffix)");
    // execute
    let suffixData = toSign.message.suffix;
    let suffixDataEncodeHash = ethUtil.keccakFromString(suffixData);
    await forwarder.execute(
      toSign.message,
      domainSeparatorHash,
      requestTypeHash,
      suffixDataEncodeHash,
      signature
    );
  });

  it("sign + verify + execute with struct typed suffix", async function () {
    const EIP712Domain = [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ];
    const ForwardRequest = [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "validUntilTime", type: "uint256" },
      // a new suffix with type is a struct
      { name: "alice", type: "People" },
    ];
    const People = [
      { name: "name", type: "string" },
      { name: "age", type: "uint256" },
      { name: "area", type: "string" },
    ];

    const toSign = {
      types: {
        EIP712Domain,
        ForwardRequest,
        People,
      },
      domain: {
        name: "GSNForwarder",
        version: "0.0.1",
        chainId: 31337,
        verifyingContract: forwarder.address,
      },
      primaryType: "ForwardRequest",
      message: {
        from: fromAddress,
        to: questProxy1.address,
        value: 0,
        gas: 1e6,
        nonce: await forwarder
          .getNonce(accounts[1].address)
          .then((nonce) => nonce.toNumber()),
        data: web3.eth.abi.encodeFunctionCall(
          {
            inputs: [],
            name: "claim",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
          []
        ),
        validUntilTime: 1684230004693,
        alice: {
          name: "alice in wonderland",
          age: 29,
          area: "american",
        },
      },
    };

    const domainSeparatorHash = bufferToHex(
      TypedDataUtils.hashStruct(
        "EIP712Domain",
        toSign.domain,
        toSign.types,
        SignTypedDataVersion.V4
      )
    );
    const requestTypeHash = TypedDataUtils.hashType(
      "ForwardRequest",
      toSign.types
    );

    // SIGNING OFF CHAIN
    const formatedPrivateKey = Buffer.from(privateKey1.slice(2), "hex");
    const signature = ethSigUtil.signTypedData({
      privateKey: formatedPrivateKey,
      data: toSign,
      version: SignTypedDataVersion.V4,
    });

    // VERIFYING OFF-CHAIN
    const signer = ethSigUtil.recoverTypedSignature({
      data: toSign,
      signature: signature,
      version: SignTypedDataVersion.V4,
    });
    expect(signer.toLowerCase()).to.equal(toSign.message.from.toLowerCase());

    // VERIFYING ON-CHAIN
    // register domain separator
    await forwarder.registerDomainSeparator("GSNForwarder", "0.0.1");
    // register suffix type. Check EIP721 "Definition of encodeType" for more details on the following request type
    await forwarder.registerRequestType(
      toSign.primaryType,
      "People alice)People(string name,uint256 age,string area)"
    );
    // execute
    let suffixDataEncode = TypedDataUtils.hashStruct(
      "People",
      toSign.message.alice,
      toSign.types,
      SignTypedDataVersion.V4
    );
    await forwarder.execute(
      toSign.message,
      domainSeparatorHash,
      requestTypeHash,
      suffixDataEncode,
      signature
    );
  });
});
