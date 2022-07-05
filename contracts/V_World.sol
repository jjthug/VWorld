// SPDX-License-Identifier: None
pragma solidity ^0.8.8;

import "./Ownable.sol";
import "./Address.sol";
import "./SafeCast.sol";
import "./ERC721.sol";
import "./Treasury.sol";
import "./ERC2981.sol";

error PublicSaleDeactivated();

contract VWorld is Ownable, ERC721, ERC2981, Treasury {
  using Address for address;
  using SafeCast for uint256;
  using Strings for uint256;

  // EVENTS ****************************************************
  event baseURISet(string _uri);
  event PublicSaleActivation(bool _activation);

  // MEMBERS ****************************************************

  struct Holder {
    address holder;
    uint96 purchaseTime;
  }

  // The max supply of land tokens
  uint256 public immutable MAX_SUPPLY;

  // Number of currently supplied tokens
  uint256 public totalSupply = 0;

  // Max number of token reserved by owner
  uint256 public immutable MAX_OWNER_RESERVE;

  // Price of each land token
  uint256 public MINT_PRICE;

  bool public publicSaleOpen;

  string public baseURI;

  address[] private mintPayees = [
    0xa14E2B5534f312a785DbB8137B8889888d684b17
  ];

  uint256[] private mintShares = [100];

  Treasury public royaltyRecipient;

  mapping (uint256 => Holder[]) public holders;

  // CONSTRUCTOR ***************************************************

  constructor(
    uint256 _MAX_SUPPLY,
    uint256 _MINT_PRICE,
    uint256 _MAX_OWNER_RESERVE,
    string memory _baseURI
  )
  ERC721("V-World", "VWORLD")
  Treasury(mintPayees, mintShares)
  {
    // Sets the price for minting a new land
    MINT_PRICE = _MINT_PRICE;

    // Sets the max supply
    MAX_SUPPLY = _MAX_SUPPLY;

    // Sets the number of lands the owner can reserve
    MAX_OWNER_RESERVE = _MAX_OWNER_RESERVE;

    // sets the metadata of the lands
    baseURI = _baseURI;

    // Sets royalty registry address, shares along with the percentage of royalty
    address[] memory royaltyPayees = new address[](1);

    royaltyPayees[0] = 0xa14E2B5534f312a785DbB8137B8889888d684b17;

    uint256[] memory royaltyShares = new uint256[](1);
    royaltyShares[0] = 100;
    
    royaltyRecipient = new Treasury(royaltyPayees, royaltyShares);

    _setRoyalties(address(royaltyRecipient), 1000); // 10% royalties
  }

  // PUBLIC METHODS ****************************************************

  /// @notice Allows users to buy during public sale, once the public sale is open
  /// @dev Preventing contract buys has some downsides, but it seems to be what the NFT market generally wants as a bot mitigation measure
  /// @param numberOfTokens the number of NFTs to buy
  function buyPublic(uint256 numberOfTokens) external payable {

    if(!publicSaleOpen) revert PublicSaleDeactivated();

    // Validations
    require(numberOfTokens > 0, "Should mint atleast 1 NFT");
    require(totalSupply + numberOfTokens <= MAX_SUPPLY, "Total supply maxed out");

    // Disallow contracts from buying
    require(
      (!msg.sender.isContract() && msg.sender == tx.origin),
      "Contract buys not allowed"
    );

    // Calculate the mint payment
    uint256 mintPrice =MINT_PRICE * numberOfTokens;
    require(msg.value >= mintPrice, "Insufficient payment");

    // refund if customer paid more than the cost to mint
    if (msg.value > mintPrice) {
      Address.sendValue(payable(msg.sender), msg.value - mintPrice);
    }

    mint(msg.sender, numberOfTokens);
  }

  /// @inheritdoc ERC165
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC2981)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  //Returns the number of remaining tokens available for mint
  function totalLeftToMint() view external returns(uint256){
    return MAX_SUPPLY - totalSupply;
  }

  /**
  Batch transfers NFTs to users
  @param to : Array of to addresses
  @param tokenIds : Array of corresponding token ids
  @return true if batch transfer succeeds
  */
  function batchTransfer(address[] memory to, uint256[] memory tokenIds) external returns(bool){

    require(to.length > 0, "Minimum one entry");
    require(to.length == tokenIds.length, "Unequal length of to addresses and number of tokens");
    require(tokenIds.length <= balanceOf(msg.sender),"Not enough tokens owned");

    for(uint256 i = 0; i < to.length; i++){
      safeTransferFrom(
        msg.sender,
        to[i],
        tokenIds[i]
      );
    }
    return true;
  }

  // OWNER METHODS *********************************************************

  // Toggles the status of the public sale to ACTIVE/NOT ACTIVE by the smart contract owner
  function setPublicSaleActivation(bool _activation) external onlyOwner{
    publicSaleOpen = _activation;
    emit PublicSaleActivation(_activation);
  }

  /// @notice Allows the contract owner to reserve NFTs for team members or promotional purposes
  /// @dev This should be called before presale or public sales start, as only the first MAX_OWNER_RESERVE tokens can be reserved
  /// @param to address for the reserved NFTs to be minted to
  /// @param numberOfTokens number of NFTs to reserve
  function reserve(address[] memory to, uint256[] memory numberOfTokens) external onlyOwner {
    require(to.length > 0, "Minimum one entry");
    require(to.length == numberOfTokens.length, "Unequal length of to addresses and number of tokens");
    
    uint256 totalNumber;
    uint256 i;

    for(i = 0; i < numberOfTokens.length; i++){
      totalNumber += numberOfTokens[i];
    }

    require((totalSupply + totalNumber) <= MAX_OWNER_RESERVE,"Exceeds owner reserve limit");
    
    for(i = 0; i < to.length; i++){
      mint(to[i], numberOfTokens[i]);
    }
  }

  /**
  @param _baseURI : The base URI string
  @return Boolean value true/false if base URI was successfully set
  Verifies whether the input base URI's hash matches with the set PROVENANCE_HASH and sets the base URI
  */
  function setBaseURI(string calldata _baseURI) external onlyOwner returns(bool) {
    baseURI = _baseURI;
    emit baseURISet(_baseURI);
    return true;
  }

  /**
  @param tokenId : The token id
  Fetches the token URI of token id = tokenId. It will return dummy URI if the base URI has not been set.
  */
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

    return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : '';
  }

  // PRIVATE/INTERNAL METHODS ****************************************************

  function mint(address to, uint256 numberOfTokens) private {
    _safeMint(to, numberOfTokens);
    
    totalSupply += numberOfTokens;
  }

  function _afterTokenTransfers(
      address,
      address to,
      uint256 startTokenId,
      uint256 quantity
  ) internal override virtual {
      Holder memory holderStruct;
      if(quantity == 1){
        holderStruct.holder = to;
        holderStruct.purchaseTime = uint96(block.timestamp);
        holders[startTokenId].push(holderStruct);
      }
      else{
        for(uint256 i=0; i<quantity; i++){
          holderStruct.holder = to;
          holderStruct.purchaseTime = uint96(block.timestamp);
          holders[startTokenId+i].push(holderStruct);
        }
      }
  }

}