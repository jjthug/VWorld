const ProjectName = artifacts.require("VWorld");
const { expect, assert } = require("chai");
const { ethers, web3 } = require("hardhat");
const truffleAssert = require('truffle-assertions');
let list = require("./addressesAndTokens");

/* Uncomment after transferring AContract.sol and AContractImp721.sol from Helper contracts ==> contracts directory */
/* For the 'can transfer tokens to contract' test */
const AContract = artifacts.require("Helper_contracts/AContract");
const AContractImp721 = artifacts.require("Helper_contracts/AContractImp721");

describe("ProjectName Public Sale", function () {

  let projectName, balance;
  let provider;
  let leftToMint;
  let reserveAmount;
  let max_supply

  before(async function () {
    accounts = await web3.eth.getAccounts();
    projectName = await ProjectName.new(1000, "10000000000", 200, "efgh");

    provider = ethers.getDefaultProvider();

    /* Uncomment for the 'can transfer tokens to contract' test  */
    aContract = await AContract.new();
    aContractImpl721 = await AContractImp721.new();

  });

  it("check name, symbol", async()=>{
    let name = await projectName.name();
    let symbol = await projectName.symbol();
    console.log("name =", name , " ,symbol = ",symbol);
  })

  it("public sale works correctly", async()=>{

    let mintFee;
    let n; //number of nfts

    n=10;
    mintFee = await projectName.MINT_PRICE();

    // sale not active
    await truffleAssert.reverts( projectName.buyPublic(n, {value: mintFee * n}),
    "VM Exception while processing transaction: reverted with custom error 'PublicSaleDeactivated()'");

    await projectName.setPublicSaleActivation(true);

    await truffleAssert.reverts( projectName.buyPublic(0, {value: 0}),
    "VM Exception while processing transaction: reverted with reason string 'Should mint atleast 1 NFT'");

    await truffleAssert.passes( projectName.buyPublic(n, {value: mintFee * n}));

    let leftToMint = await projectName.totalLeftToMint();
    max_supply = await projectName.MAX_SUPPLY();

    assert.equal(leftToMint.toString(), (max_supply-n));

    let minted = await projectName._totalMinted();
    assert.equal(minted, max_supply-leftToMint);

    let owner = await projectName.ownerOf(n);
    assert.equal(owner, accounts[0]);

    await truffleAssert.reverts( projectName.ownerOf(n+1),
    "VM Exception while processing transaction: reverted with custom error 'OwnerQueryForNonexistentToken()'");

    //insufficient payment
    await truffleAssert.reverts( projectName.buyPublic(n, {value: mintFee * (n-1)}));

    //supply maxed out
    await truffleAssert.reverts( projectName.buyPublic(max_supply, {value: mintFee * max_supply}));

    n = 100;
    await truffleAssert.passes( projectName.buyPublic(n, {value: mintFee * (n+1)}));

  })

  it("can track holders", async()=>{
    let holder = await projectName.holders(7,0);

    assert.equal(holder[0], accounts[0]);

    await projectName.transferFrom(accounts[0], accounts[1], 7, {from:accounts[0]});

    holder = await projectName.holders(7,1);

    assert.equal(holder[0], accounts[1]);

    await projectName.transferFrom(accounts[1], accounts[0], 7, {from:accounts[1]});


  })

  it("owner can reserve land", async()=>{
    await projectName.setPublicSaleActivation(false);

    reserveAmount = 10 + 10;

    await truffleAssert.reverts( projectName.reserve([], []),
    "VM Exception while processing transaction: reverted with reason string 'Minimum one entry'");

    await truffleAssert.reverts( projectName.reserve([ accounts[1] ], [10,10]),
    "VM Exception while processing transaction: reverted with reason string 'Unequal length of to addresses and number of tokens'");

    await truffleAssert.reverts( projectName.reserve([ accounts[1], accounts[2] ], [max_supply,10]),
    "VM Exception while processing transaction: reverted with reason string 'Exceeds owner reserve limit'");

    // can reserve before sale starts or during
    await projectName.reserve([ accounts[1], accounts[2] ], [10,10]);

    await projectName.setPublicSaleActivation(true);

    // can reserve before sale starts or during sale until the total supplied is less than or equal to reserve limit
    await projectName.reserve([ accounts[1], accounts[2] ], [10,10]);

  })

  it("sets correct base uri", async()=>{
    let abcd = "abcd";
    await truffleAssert.passes(projectName.setBaseURI(abcd));
    let tokenUri = await projectName.tokenURI(1);
    assert.equal(tokenUri, abcd+"1");

    await truffleAssert.reverts( projectName.tokenURI(0),
    "VM Exception while processing transaction: reverted with reason string 'ERC721Metadata: URI query for nonexistent token'");
  })

  it("sets owners correctly after transferring tokens", async()=>{
    
    for(let i = 10; i<50; i += 10){
      await projectName.transferFrom(accounts[0], accounts[1], i);
    }

    for(let i = 50; i<=100; i += 10){
      await projectName.transferFrom(accounts[0],accounts[1], i);
    }

    for(let i = 1; i<= 100; i++){
      if(i%10 == 0) {
        owner = await projectName.ownerOf(i);
        assert.equal(owner, accounts[1]);
        continue
      }

      owner = await projectName.ownerOf(i);
      assert.equal(owner, accounts[0]);
    }
  })

  it("can batch transfer", async() =>{
    await truffleAssert.reverts( projectName.batchTransfer([], []),
    "VM Exception while processing transaction: reverted with reason string 'Minimum one entry'");

    await truffleAssert.reverts( projectName.batchTransfer(list.addresses10, [1,2,3,4,11]),
    "VM Exception while processing transaction: reverted with reason string 'Unequal length of to addresses and number of tokens'");

    await truffleAssert.reverts( projectName.batchTransfer(list.addresses10, [1,2,3,4,5,6,7,8,9,11], {from: accounts[9]}),
    "VM Exception while processing transaction: reverted with reason string 'Not enough tokens owned'");

    await projectName.batchTransfer(list.addresses10, [1,2,3,4,5,6,7,8,9,11]);
  })

  it("supports ERC2981", async()=>{
    let check = await projectName.supportsInterface("0x2a55205a"); // IERC2981
    assert.equal(check, true);

    check = await projectName.supportsInterface("0x80ac58cd");  //IERC721
    assert.equal(check, true);
  })

  it("can approve and transfer tokens", async()=>{
    // let theion = await projectName.ownerOf(15);
    // console.log("owner of 15=",theion);
    // console.log("accounts[0]=",accounts[0]);

    await projectName.approve(accounts[2], 17);
    await projectName.transferFrom(accounts[0], accounts[3], 17, {from:accounts[2]});
    let owner = await projectName.ownerOf(17);
    assert.equal(owner, accounts[3]);

    await projectName.setApprovalForAll(accounts[2], true); // from accounts[0] (owner)
    await projectName.transferFrom(accounts[0], accounts[3], 59, {from:accounts[2]});
    owner = await projectName.ownerOf(59);
    assert.equal(owner, accounts[3]);

  })

  it("can burn tokens", async()=>{

    await truffleAssert.reverts( projectName.burn(17, {from:accounts[2]}),
  "VM Exception while processing transaction: reverted with custom error 'TransferCallerNotOwnerNorApproved()'");

    await projectName.burn(17, {from:accounts[3]});

    // await projectName.burn(59, {from:accounts[1]});
    await projectName.approve(accounts[2], 59, {from:accounts[3]});

    await truffleAssert.passes( projectName.burn(59, {from:accounts[2]}));

    let numberBurned = await projectName._numberBurned(accounts[3]);
    assert.equal(numberBurned, 2);

    numberBurned = await projectName._numberBurned(accounts[2]);
    assert.equal(numberBurned, 0);

    let numberMinted = await projectName._numberMinted(accounts[2]);
    assert.equal(numberMinted.toString(), "20");

  })

  /* Uncomment after uncommenting AContract and AContractImpl721 on line 3,4*/

  it("can transfer tokens to contract", async()=>{

    await truffleAssert.reverts( projectName.safeTransferFrom(accounts[0], aContract.address, 18, "0xff"),
    "VM Exception while processing transaction: reverted with custom error 'TransferToNonERC721ReceiverImplementer()'");

    await projectName.safeTransferFrom(accounts[0], aContractImpl721.address, 18, "0xff");

    // let totalMinted = await projectName._totalMinted();
    // assert.equal(totalMinted,500);
  })

})