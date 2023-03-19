// scripts/transfer_upgradeship_dquest_factory.js

async function main() {
  //TODO: use your own address. Below is an example
  const newOwner = "0x1c14600daeca8852BA559CC8EdB1C383B8825906";

  console.log("| - Transferring ownership of Dquest ProxyAdmin...");
  // The owner of the Dquest ProxyAdmin can upgrade our contracts
  await upgrades.admin.transferProxyAdminOwnership(newOwner);
  console.log("| - Transferred ownership/upgradeship of Dquest ProxyAdmin to:", newOwner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
