// scripts/force-import-proxy.js
/*
 * Warning: used for Factorized Quest via Dquest Factory only
 * @notice: Recommended to use only ONCE after the first Quest creation via Dquest Factory
 * To import any proxy contract from outside of the hardhat upgrades pluggin (actually from on-chain qDquest factory)
 * that later can be verified by prepare_upgrade_nft.js script
 */

async function main() {
  //TODO: change the quest(proxy) address (beacon proxy) below. Take it on-chain via Dquest::getQuest(index)
  const proxyAddress = "0x447950d65aD786ccbcb184F6e1318d356FCEbF6D";
  const questImplementation = await ethers.getContractFactory("Quest");

  // importing compatible-checked/ok new implementation
  await upgrades.forceImport(proxyAddress, questImplementation, { kind: "beacon" });
  console.log("| - Imported new quest implementation to hardhat upgrades management system");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
