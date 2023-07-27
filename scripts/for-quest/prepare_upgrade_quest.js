// scripts/prepare_upgrade_quest.js
/*
  To:
    + verify if new contract is valid for an upgrade
    + return implementation address

  NOTICE: only usable if every upgraded contract has got imported via `force-import-proxy.js`
*/

async function main() {
  //TODO: change the quest proxy address (any beacon proxy)
  const proxyAddress = "0xFadD077b37169D9ef17744a3d780B54b518228FA";
  const newQuestImplementation = await ethers.getContractFactory("QuestV2");

  // Checking new implemenation storage layout compatibility
  console.log("| - Preparing upgrade & get the implementation contract...");
  const questImplAddress = await upgrades.prepareUpgrade(proxyAddress, newQuestImplementation, {constructorArgs: ["0xBa1f95E4C02dfa1383E6b0659C83361ef5d276b8"]});
  console.log("| - Current Quest contract implementation at:", questImplAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
