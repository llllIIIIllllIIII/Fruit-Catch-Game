import { ethers } from "hardhat";

async function main() {
  const GameScore = await ethers.getContractFactory("GameScore");
  const gameScore = await GameScore.deploy();
  await gameScore.waitForDeployment();
  console.log("GameScore deployed to:", await gameScore.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
