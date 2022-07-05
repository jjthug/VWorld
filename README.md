# VWorld

## Initial setup

Install the npm dependencies using the command :
```
npm i
```
Create a .env file
In the 'hardhat.config.js' file the params inherited from process.env should be added in the .env file


## Smart contracts

The smart contracts can be found in the 'contracts' directory.

### ERC721A for maximum gas optimization.

Based on the repo : https://github.com/chiru-labs/ERC721A/blob/main/contracts/ERC721A.sol


## Test cases

The test cases are in the 'test' directory.

To run the test cases, run the command :

```
npx hardhat test
```

## Code coverage

To run the solidity code coverage, run the command :

```
npx hardhat coverage
```

A 'coverage' folder will be created contain all information regarding coverage.
An index.html file in the coverage folder can be used to view the coverage of each smart contract with a UI.

## Deployment

Ensure that the .env file has been setup with the accounts and RPC URL used in hardhat.config.js file.

In deploy.js pass in the constructor arguments:
1. Maximum Supply
    * Example: 6
2. Land token mint price
    * Example: "1000000000000000" == 0.001 ETH
3. Maximum amount reserved for owner
    * Example: 2
4. Land Metadata URI
    * Example: ipfs://QmZuKgAxCDx8nG9QmXhZqg3h1Tn71WVEaEUbthh9NcaLo4/

Deploy script example: 
```
await cd.deploy(6, "1000000000000000", 2, "ipfs://QmZuKgAxCDx8nG9QmXhZqg3h1Tn71WVEaEUbthh9NcaLo4/");
```

To deploy the smart contract to a network, run the command :

```
npx hardhat run --network [enter network (from hardhat.config.js) here] scripts/deploy.js
```