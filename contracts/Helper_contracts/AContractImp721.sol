// SPDX-License-Identifier: None

pragma solidity ^0.8.8;

contract AContractImp721{
    function onERC721Received(
        address, 
        address, 
        uint256, 
        bytes calldata
    )external returns(bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    } 
}