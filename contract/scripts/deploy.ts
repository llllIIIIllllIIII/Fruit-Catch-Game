import { ethers } from "hardhat";


async function main() {
  // 1. 部署 RewardToken
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy(ethers.parseUnits("1000000", 18));
  await rewardToken.waitForDeployment();
  console.log("RewardToken deployed to:", await rewardToken.getAddress());

  // 2. 部署 GameNFT（先用 deployer 當暫時 gameRecord 地址）
  const [deployer] = await ethers.getSigners();
  const GameNFT = await ethers.getContractFactory("GameNFT");
  const gameNFT = await GameNFT.deploy(deployer.address);
  await gameNFT.waitForDeployment();
  console.log("GameNFT deployed to:", await gameNFT.getAddress());

  // 3. 部署 GameRecord，傳入 rewardToken, playFee, gameNFT
  const playFee = ethers.parseUnits("10", 18);
  const GameRecord = await ethers.getContractFactory("GameRecord");
  const gameRecord = await GameRecord.deploy(rewardToken.getAddress(), playFee, gameNFT.getAddress());
  await gameRecord.waitForDeployment();
  console.log("GameRecord deployed to:", await gameRecord.getAddress());

  // 4. 設定 GameNFT 的 gameRecord 權限
  await gameNFT.setGameRecord(gameRecord.getAddress());
  console.log("GameNFT setGameRecord done");

  // 5. (可選) 部署 GameScore
  const GameScore = await ethers.getContractFactory("GameScore");
  const gameScore = await GameScore.deploy();
  await gameScore.waitForDeployment();
  console.log("GameScore deployed to:", await gameScore.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
