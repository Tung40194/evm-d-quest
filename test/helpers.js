const { ethers } = require("hardhat");

const getCurrentBlockTimestamp = async () => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
};

const advanceBlockTimestamp = async (units) => {
  // Get the current block timestamp
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  const currentTimestamp = block.timestamp;

  // Set the next block timestamp to the specified number of units ahead of the current timestamp
  const nextTimestamp = currentTimestamp + units;
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);

  // Mine a new block to finalize the timestamp change
  await ethers.provider.send("evm_mine", []);
};

module.exports = {
  getCurrentBlockTimestamp: getCurrentBlockTimestamp,
  advanceBlockTimestamp: advanceBlockTimestamp
};
