import { ethers } from "hardhat";
import { expect } from "chai";

describe("RewardToken", function () {
  let owner: any, user: any;
  let token: any;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();
    const RewardToken = await ethers.getContractFactory("RewardToken");
    token = await RewardToken.deploy(ethers.parseUnits("1000", 18));
    await token.waitForDeployment();
  });

  it("should assign initial supply to owner", async () => {
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000", 18));
  });

  it("should allow owner to mint", async () => {
    await expect(token.mint(user.address, ethers.parseUnits("100", 18))).to.not.be.reverted;
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseUnits("100", 18));
  });

  it("should not allow non-owner to mint", async () => {
    await expect(token.connect(user).mint(user.address, 1)).to.be.revertedWith("Only owner can mint");
  });
});
