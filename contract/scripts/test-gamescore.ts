import { ethers } from "hardhat";

async function main() {
  // 用已部署的 GameScore 合約地址
  const contractAddress = "0x9C6C9D9848f8b5D5a5104d6537f8E2f754d03682";
  const GameScore = await ethers.getContractAt("GameScore", contractAddress);

  const btcPrice = await GameScore.getBTCPrice();
  const ethPrice = await GameScore.getETHPrice();
  const bnbPrice = await GameScore.getBNBPrice();

  console.log("BTC/USD:", btcPrice.toString());
  console.log("ETH/USD:", ethPrice.toString());
  console.log("BNB/USD:", bnbPrice.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
