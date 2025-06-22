import { ethers } from "hardhat";
import { expect } from "chai";

describe("GameNFT", function () {
  let owner: any, gameRecord: any, user: any, nft: any;

  beforeEach(async () => {
    [owner, gameRecord, user] = await ethers.getSigners();
    const GameNFT = await ethers.getContractFactory("GameNFT");
    nft = await GameNFT.deploy(gameRecord.address);
    await nft.waitForDeployment();
  });

  it("should only allow gameRecord to mint", async () => {
    await expect(nft.connect(owner).mint(user.address, 20240622, "ipfs://meta1")).to.be.revertedWith("Only GameRecord can mint");
    await expect(nft.connect(gameRecord).mint(user.address, 20240622, "ipfs://meta1")).to.not.be.reverted;
  });

  it("should mint NFT and set correct URI", async () => {
    await nft.connect(gameRecord).mint(user.address, 20240622, "ipfs://meta1");
    expect(await nft.ownerOf(1)).to.equal(user.address);
    expect(await nft.tokenURI(1)).to.equal("ipfs://meta1");
  });
});
