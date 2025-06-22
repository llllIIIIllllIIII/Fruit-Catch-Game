// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract GameNFT is ERC721URIStorage, Ownable {
    address public gameRecord;
    uint256 public nextTokenId;

    constructor(address _gameRecord) ERC721("GameRecordNFT", "GRNFT") {
        gameRecord = _gameRecord;
        _transferOwnership(msg.sender);
    }

    function setGameRecord(address _gameRecord) external onlyOwner {
        gameRecord = _gameRecord;
    }

    function mint(address player, uint32 date, string memory uri) external returns (uint256) {
        require(msg.sender == gameRecord, "Only GameRecord can mint");
        uint256 tokenId = ++nextTokenId;
        _mint(player, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }
}
