require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-solhint");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("hardhat-abi-exporter");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      { version: "0.7.0" }
    ]
  },
  networks: {
    local: {
      url: process.env.ETH_ENDPOINT || "http://localhost:8545",
      accounts: [process.env.PRIVATE_KEY]
    },
    goerli: {
      url: `https://rpc.ankr.com/eth_goerli`,
      gasPrice: 1000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    mainnet: {
      url: `https://eth.llamarpc.com`,
      gasPrice: 14000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    mumbai: {
      url: "https://matic-mumbai.chainstacklabs.com",
      gasPrice: 30000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    polygon: {
      url: "https://polygon-rpc.com",
      gasPrice: 150000000000,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "ETH",
    showTimeSpent: true,
    gasPrice: process.env.GAS_PRICE ? process.env.GAS_PRICE : 15,
    coinmarketcap: process.env.COINMARKETCAP_KEY
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: []
  },
  abiExporter: {
    path: "./abi",
    runOnCompile: true,
    clear: true,
    flat: true,
    only: [":DQuest$", ":Quest$"],
    spacing: 2,
    format: "json"
  }
};
