// scripts/prepare_upgrade_quest.js
/*
  To:
    + verify if new contract is valid for an upgrade
    + return implementation address

  NOTICE: only usable if every upgraded contract has got imported via `force-import-proxy.js`
*/

async function main() {
  //TODO: change the quest proxy address (any beacon proxy)
  const proxyAddress = "0xFc542c46141dBDf0b8c89065b83F1f02d527815B";
  const newQuestImplementation = await ethers.getContractFactory("Quest");

  // Checking new implemenation storage layout compatibility
  console.log("| - Preparing upgrade & get the implementation contract...");
  const questImplAddress = await upgrades.prepareUpgrade(proxyAddress, newQuestImplementation);
  console.log("| - Current Quest contract implementation at:", questImplAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
