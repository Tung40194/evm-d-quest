# CAN EVM DQuest

###### Version: 2.0.0

On-chain D.Quest is a set of smart contracts that allows Community admins to define Quests consisting of Missions and Rewards and Users to fulfill Missions and claim Rewards, on on-chain.

This project applies beacon proxy Factory upgradable pattern for creating & upgrading Quest contracts while the Dquest factory itself is upgraded following Transparent upgradable pattern

CAN DQuest smart contracts

###### Installation

1. Install packages `npm install`
2. Make your own `.env` file and update it referring to `.env.example`
3. Execute some test cases `npx hardhat test`

# I. Dquest factory contract interface

For the details please refer: `can-evm-dquest/contracts/interface/IDQuest.sol`

# II. Deploy/create & upgrade Quest contract
### 1. Deploy/create Quest proxy contract (we do this on-chain with Dquest factory contract)
Use Dquest factory contract, function `createQuest(...)` to create and deploy quests contracts (proxy contract)

### 2. Import the address of the proxy created in step 1.

Quest proxy created on-chain via Dquest factory is outside of hardhat upgrades pluggin and we can not use the pluggin to verify our new Quest contract. To take the most out of hardhat upgrades pluggin, we can import our newly created proxy address in step 1 to the pluggin. First check & edit the proxy address in `script/for-quest/force-import-proxy.js` and execute the following:

`npx hardhat run --network localhost scripts/for-quest/force-import-proxy.js`

### 3. Writing an upgraded version of the current contract
Be sure to strictly follow [contract upgrade rules](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#modifying-your-contracts) in writing a new implementation contract or new upgrade will bring bugs and unexpected issues. Here are 5 rules to help writing an upgraded contract easier:

```
1) Inherit the previous version.
2) Only append state/variable.
3) Override functions if needed.
4) Never remove function, only replace a function's body with `revert("Warning: This function is deprecated!")` when it's no longer used.
5) You can break these rules but you will likely have to handle the copy-paste to maintain contract storage layout.
6) Use `prepare_upgrade_quest.js` to verify before upgrading with Dquest factory.
```

### 4. Verify if newly written upgraded contract is OK
To verify new implementation's compatibility and return the current implementation contract address, check and adapt & edit the proxy address in `script/for-quest/prepare_upgrade_quest.js` and execute the following:

`npx hardhat run --network localhost scripts/for-quest/prepare_upgrade_quest.js`

### 5. Deploy new implementation contract individually

We might use truffle, hardhat or remix to deploy our new logic/implementation contract as normal.

### 6. Upgrading all Quest proxy contracts (we do this on-chain with Dquest factory)
Use Dquest factory contract, function `upgradeQuest(address new_quest_impl_contract)` and give it new implementation/logic contract address in step4(prepare does automatically deploy a new implementation contract) Or in step5(where you deploy your implementation contract manually) to upgrade all quest proxy contracts

# III. Deploy and upgrade Dquest factory contract
### 1. Deploy Dquest factory contract

Check and adapt `script/for-dquest/deploy_dquest_factory.js` for your deployment and execute the following:

`npx hardhat run --network localhost script/for-dquest/deploy_dquest_factory.js`

### 2. Mind transfering upgradership to a Gnosis wallet for better security?

Check and adapt & edit the new owner address and execute the following script:

`npx hardhat run --network localhost scripts/for-dquest/transfer_upgradeship_dquest_factory.js`

### 3. Prepare to upgrade the Dqueset factory contract

To verify new implementation's compatibility and return the current implementation contract address, check and adapt & edit the proxy address in `prepare_upgrade_dquest_factory.js` and execute the following:

`npx hardhat run --network localhost scripts/for-dquest/prepare_upgrade_dquest_factory.js`
### 4. Upgrade Dquest factory contract
Check and adapt & edit the proxy address in `scripts/for-dquest/upgrade_dquest_factory.js` and execute the following script:

`npx hardhat run --network localhost scripts/for-dquest/upgrade_dquest_factory.js`

### 5. Details on how to upgrade a contract with Gnosis
- https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580

# IV. Note:

- All network after option --network in this file is an example. Change accordingly to your network choice.

- To verify contract(mostly implementation contracts):
    `npx hardhat verify <contract address> --network <network> <constructor param 1> <constructor param 2>`

- Network options(check hardhat.config.js):
    - local
    - goerli
    - mumbai
    - polygon

- Follow strictly II. 2. to upgrade any contract (both quest or Dquest factory)
