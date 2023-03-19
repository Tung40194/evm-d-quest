// scripts/prepare_upgrade_dquest_factory.js
/*
  To:
    + verify if new contract is valid for an upgrade
    + return implementation address
*/

async function main() {
  //TODO: change the Dquest Factory proxy address
  const proxyAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const newDquestImplementation = await ethers.getContractFactory("DQuestV2");

  // Checking new implemenation storage layout compatibility
  console.log("| - Preparing upgrade & get the implementation contract...");
  const dQuestImplementationAddress = await upgrades.prepareUpgrade(
    proxyAddress,
    newDquestImplementation
  );
  console.log(
    "| - Current Dquest Factory contract implementation at:",
    dQuestImplementationAddress
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
