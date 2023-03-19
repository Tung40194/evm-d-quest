### On-chain upgrades
- This group of scripts aim to combine take the best out of 
1) HARDHAT UPGRADES PLUGGIN and 
2) DQUEST UPGRADES SYSTEM

### Abstract

1. On-chain Dquest contract has enough at its interface to deploy proxy contracts and to upgrade contracts.
2. But on-chain Dquest contract lacks of a tool to check storage layout compatibility for succeeding implementations of Quest.
3. To take the most out of hardhat, we can import each implementation of Quest right into this project's hardhat upgrades management system.
4. TO DO THAT:
    4.1. feed 
        - 1) proxy contract address(that we will upgrade) and 
        - 2) the implementation for the proxy
        to `force_import_proxy.js`

        In future upgrades, take the new implementation at 2) and and feed it to the script

    4.2. As long as every single upgrades on the proxy is imported to this project's hardhat upgrade management system,
        we can always check for the storage layout compatibility of succeeding new contracts by executing `prepare_upgrade_quest.js`