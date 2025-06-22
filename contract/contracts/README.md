# 智能合約設計說明（hk4g4）

## 1. GameRecord.sol
- **用途**：記錄玩家每日（東八區）遊玩紀錄、分數、心情、名言、IPFS 資料，並限制同一錢包同一天只能玩一次。
- **付費邏輯**：第一次免費，第二次（含之後）需支付指定 BEP20 代幣（RewardToken）。
- **資料結構**：
  - `mapping(address => mapping(uint32 => Record)) public records;` 記錄每位玩家每天的紀錄。
  - `mapping(address => mapping(uint32 => bool)) public played;` 標記是否已玩。
  - `struct Record` 包含日期、分數、心情、名言、IPFS URI、是否已 mint NFT。
- **主要函式**：
  - `play(...)`：遊玩並記錄資料，若已玩過則需付費，紀錄永遠以最新一次為主。
  - `getTodayDate()`：自動以東八區計算 yyyymmdd。
  - `setMinted(...)`：標記該日紀錄已 mint NFT。
  - `withdraw(...)`：owner 可提領合約內代幣。
- **事件**：
  - `Played`：每次遊玩時發出，方便鏈下統計。
  - `Minted`：mint NFT 時發出。

## 2. GameNFT.sol
- **用途**：將 GameRecord 合約授權的遊戲紀錄鑄造成 NFT，metadata 可包含分數、心情、名言等。
- **權限**：僅允許 GameRecord 合約呼叫 mint。
- **主要函式**：
  - `mint(address player, uint32 date, string memory uri)`：鑄造 NFT，uri 為 metadata（建議上 IPFS）。
- **繼承**：OpenZeppelin ERC721URIStorage。

## 3. RewardToken.sol
- **用途**：BEP20/ERC20 標準代幣，作為遊戲付費、空投獎勵、claim 用 token。
- **權限**：僅 owner 可 mint 新代幣。
- **主要函式**：
  - `mint(address to, uint256 amount)`：owner 可發行新代幣。
- **初始供應**：部署時由 constructor 指定。

## 4. 每週排行與空投建議
- 合約本身不直接排序與自動空投，建議鏈下統計分數後由 owner 透過 RewardToken 合約發獎。
- 若需完全鏈上自動排行與空投，需額外設計，建議另建 AirdropManager 合約。

---

**本專案合約設計重點：**
- 公平性：每日限制、付費邏輯皆由鏈上驗證。
- 擴充性：NFT 與空投皆可根據紀錄授權。
- 成本考量：排行榜與空投建議鏈下統計，鏈上僅做驗證與發獎。

如需更詳細的合約互動流程或前端串接建議，請再告知！
