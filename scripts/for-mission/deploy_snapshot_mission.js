// scripts/deploy_snapshot_mission.js
const { ethers, upgrades } = require("hardhat");

async function main() {
    // Snapshot deployment needs a Quest deployment prior to it
    const dQuest = "0x43dCe33c057b4e38718eD99B28621A7737Ee929C";
    const linkAddr = "0xb0897686c545045aFc77CF20eC7A532E3120E0F1";
    const oracleAddr = "0xF71128a7601D0A8a86fA79F74f6F0a3F35F8f2bC";
    const jobId = "0x3437626136633532363338323431323538366432396531626134666131626338";

    const snapshot = await ethers.getContractFactory("SnapshotMission");
    const deployedSnapshot = await snapshot.deploy(dQuest, linkAddr, oracleAddr, jobId);
    await deployedSnapshot.deployed();
    console.log("| - Snapshot implementation address at:", deployedSnapshot.address);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  