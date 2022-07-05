const { ethers } = require("hardhat");

async function main() {

    const CD = await ethers.getContractFactory("VWorld");

    const cd = await CD.deploy(6, "1000000000000000", 2, "ipfs://QmZuKgAxCDx8nG9QmXhZqg3h1Tn71WVEaEUbthh9NcaLo4/"); 

    await cd.deployed();
    console.log("Deployed to : ", cd.address);

  }

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });