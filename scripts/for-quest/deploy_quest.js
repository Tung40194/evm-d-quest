// scripts/deploy_dquest_factory.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  // Dquest deployment needs a Quest deployment prior to it
  const quest = await ethers.getContractFactory("Quest");
  const deployedQuest = await quest.deploy();
  await deployedQuest.deployed();
  console.log("| - Quest implementation address at:", deployedQuest.address);
}

main();
