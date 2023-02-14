async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // const SimpleQuest = await ethers.getContractFactory("SimpleQuest");
  // const simpleQuest = await SimpleQuest.deploy();

  // console.log("Deployed address:", simpleQuest.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
