// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./GameNFT.sol";


import "@openzeppelin/contracts/access/Ownable.sol";

contract GameRecord is Ownable {
    IERC20 public payToken;
    uint256 public playFee;
    GameNFT public gameNFT;

    struct Record {
        uint32 date; // yyyymmdd (東八區)
        uint256 score;
        string mood;
        string quote;
        string dataURI; // IPFS link or hash
        bool minted;
    }

    // address => date => Record
    mapping(address => mapping(uint32 => Record)) public records;
    // address => date => played
    mapping(address => mapping(uint32 => bool)) public played;

    event Played(address indexed player, uint32 date, uint256 score, string mood, string quote, string dataURI);
    event Minted(address indexed player, uint32 date, uint256 tokenId);


    constructor(address _payToken, uint256 _playFee, address _gameNFT) {
        payToken = IERC20(_payToken);
        playFee = _playFee;
        gameNFT = GameNFT(_gameNFT);
        _transferOwnership(msg.sender);
    }

    // 允許 owner 設定或更新 GameNFT 合約地址
    function setGameNFT(address _gameNFT) external onlyOwner {
        gameNFT = GameNFT(_gameNFT);
    }
    // 玩家可呼叫，將今日紀錄 mint 成 NFT，metadata uri 由前端組成
    function mintTodayNFT(string memory uri) external returns (uint256) {
        uint32 today = getTodayDate();
        require(records[msg.sender][today].score > 0, "No record today");
        require(!records[msg.sender][today].minted, "Already minted");
        uint256 tokenId = gameNFT.mint(msg.sender, today, uri);
        records[msg.sender][today].minted = true;
        emit Minted(msg.sender, today, tokenId);
        return tokenId;
    }

    function getTodayDate() public view returns (uint32) {
        // UTC+8
        uint256 ts = block.timestamp + 8 * 3600;
        (uint year, uint month, uint day) = timestampToDate(ts);
        return uint32(year * 10000 + month * 100 + day);
    }

    function play(string memory mood, string memory quote, string memory dataURI, uint256 score) external {
        uint32 today = getTodayDate();
        // 第一次免費，第二次需付費
        if (played[msg.sender][today]) {
            require(payToken.transferFrom(msg.sender, address(this), playFee), "Pay token failed");
        }
        // 無論免費或付費，總是以最新一次紀錄覆蓋
        records[msg.sender][today] = Record(today, score, mood, quote, dataURI, false);
        played[msg.sender][today] = true;
        emit Played(msg.sender, today, score, mood, quote, dataURI);
    }

    // 只存紀錄，不直接 mint NFT，需由前端觸發
    function setMinted(address player, uint32 date) external onlyOwner {
        records[player][date].minted = true;
    }

    // Helper: timestamp to date (year, month, day)
    function timestampToDate(uint256 timestamp) public pure returns (uint year, uint month, uint day) {
        uint z = timestamp / 86400 + 719468;
        uint era = (z >= 0 ? z : z - 146096) / 146097;
        uint doe = z - era * 146097;
        uint yoe = (doe - doe/1460 + doe/36524 - doe/146096) / 365;
        year = yoe + era * 400;
        uint doy = doe - (365*yoe + yoe/4 - yoe/100);
        uint mp = (5*doy + 2)/153;
        day = doy - (153*mp+2)/5 + 1;
        month = mp < 10 ? mp+3 : mp-9;
        year += (month <= 2) ? 1 : 0;
    }

    // Owner 可提領合約內 token
    function withdraw(address to, uint256 amount) external onlyOwner {
        payToken.transfer(to, amount);
    }
}
