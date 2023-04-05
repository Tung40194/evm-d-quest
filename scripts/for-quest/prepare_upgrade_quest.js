// scripts/prepare_upgrade.js
/*
  To:
    + verify if new contract is valid for an upgrade
    + return implementation address

  NOTICE: only usable if every upgraded contract has got imported via `force-import-proxy.js`
*/

async function main() {
  //TODO: change the nft proxy address (any beacon proxy)
  const proxyAddress = "0xFc542c46141dBDf0b8c89065b83F1f02d527815B";
  const newQuestImplementation = await ethers.getContractFactory("Quest");

  // Checking new implemenation storage layout compatibility
  console.log("| - Preparing upgrade & get the implementation contract...");
  const myNFTImplAddress = await upgrades.prepareUpgrade(proxyAddress, newQuestImplementation);
  console.log("| - Current NFT contract implementation at:", myNFTImplAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
