// scripts/force-import-proxy.js
/*
 * Warning: used for Factorized Quest via Dquest Factory only
 * @notice: Recommended to use only ONCE after the first Quest creation via Dquest Factory
 * To import any proxy contract from outside of the hardhat upgrades pluggin (actually from on-chain qDquest factory)
 * that later can be verified by prepare_upgrade_nft.js script
 */

async function main() {
  //TODO: change the quest(proxy) address (beacon proxy) below. Take it on-chain via Dquest::getQuest(index)
  const proxyAddress = "0xd614A0636bF46c008E54D5c6D1d66b3e6A65649b";
  const questImplementation = await ethers.getContractFactory("QuestV2");

  // importing compatible-checked/ok new implementation
  await upgrades.forceImport(proxyAddress, questImplementation, {
    kind: "beacon",
    constructorArgs: ["0xBa1f95E4C02dfa1383E6b0659C83361ef5d276b8"]
  });
  console.log("| - Imported new quest implementation to hardhat upgrades management system");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
