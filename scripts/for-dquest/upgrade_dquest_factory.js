// scripts/upgrade_dquest_factory.js
const { ethers, upgrades } = require("hardhat");

//TODO: change the proxy address
const proxyAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

async function main() {
  const FactoryV2 = await ethers.getContractFactory("FactoryV2");
  console.log("Upgrading to FactoryV2...");
  let upgraded = await upgrades.upgradeProxy(proxyAddress, FactoryV2);
  console.log("FactoryV2 upgraded: ", upgraded.address);
}

main();
