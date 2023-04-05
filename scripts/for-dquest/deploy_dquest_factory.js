// scripts/deploy_dquest_factory.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  // Dquest deployment needs a Quest deployment prior to it
  const quest = await ethers.getContractFactory("Quest");
  const deployedQuest = await quest.deploy();
  await deployedQuest.deployed();
  console.log("| - Quest implementation address at:", deployedQuest.address);

  const dQuest = await ethers.getContractFactory("DQuest");
  const dQuestProxy = await upgrades.deployProxy(dQuest, [deployedQuest.address], { initializer: "initialize" });
  await dQuestProxy.deployed();

  console.log("| - Dquest proxy deployed at:", dQuestProxy.address);
  console.log(
    "| - Dquest implementation address:",
    await upgrades.erc1967.getImplementationAddress(dQuestProxy.address)
  );
  console.log("| - Dquest admin address:", await upgrades.erc1967.getAdminAddress(dQuestProxy.address));
}

main();
