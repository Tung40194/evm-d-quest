# CAN EVM DQuest

CAN DQuest smart contracts

## Installation

1. Install packages `npm install`
2. Copy and update  `.env.example` into `.env`

## Getting Start

### Compile
```
npx hardhat compile
```

To force a compilation you can use the `--force` argument, or run `npx hardhat clean` to clear the cache and delete the artifacts.

### Test
```
npx hardhat test
```

### Test coverage
```
npx hardhat coverage
```

### Contract size
```
npx hardhat size-contracts
```

### Contract check
```
npx hardhat check
```

### Correct coding format
```
npm run prettier
```

### Deploy contract
```
npx hardhat run scripts/deploy.js --network <network-name>
```

### Verify contract
```
npx hardhat verify --network <network-name> <address> 
```

