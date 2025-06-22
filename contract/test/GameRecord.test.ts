import { ethers } from "hardhat";
import { expect } from "chai";

describe("GameRecord + GameNFT Integration", function () {
  let owner: any, user: any, user2: any;
  let payToken: any, gameRecord: any, gameNFT: any;
  const playFee = ethers.parseUnits("10", 18);

  beforeEach(async () => {
    [owner, user, user2] = await ethers.getSigners();

    // 部署 RewardToken
    const RewardToken = await ethers.getContractFactory("RewardToken");
    payToken = await RewardToken.deploy(ethers.parseUnits("1000000", 18));
    await payToken.waitForDeployment();

    // 給 user 一些 token
    await payToken.transfer(user.address, ethers.parseUnits("1000", 18));

    // 部署 GameNFT（先用 owner 當暫時 gameRecord 地址）
    const GameNFT = await ethers.getContractFactory("GameNFT");
    gameNFT = await GameNFT.deploy(owner.address);
    await gameNFT.waitForDeployment();

    // 部署 GameRecord，並設置 GameNFT 地址
    const GameRecord = await ethers.getContractFactory("GameRecord");
    gameRecord = await GameRecord.deploy(payToken.target, playFee, gameNFT.target);
    await gameRecord.waitForDeployment();

    // 設定 GameNFT 的 gameRecord 地址（必須呼叫 setter）
    await gameNFT.setGameRecord(gameRecord.target);

    // GameRecord 也可更新 GameNFT 地址
    await gameRecord.setGameNFT(gameNFT.target);

    // user approve
    await payToken.connect(user).approve(gameRecord.target, ethers.parseUnits("1000", 18));
  });

  it("should allow first play for free and record data", async () => {
    await expect(gameRecord.connect(user).play("Hope", "TestQuote", "ipfs://test", 100))
      .to.emit(gameRecord, "Played");
    const today = await gameRecord.getTodayDate();
    const rec = await gameRecord.records(user.address, today);
    expect(rec.score).to.equal(100);
    expect(rec.mood).to.equal("Hope");
    expect(rec.quote).to.equal("TestQuote");
    expect(rec.dataURI).to.equal("ipfs://test");
    expect(rec.minted).to.equal(false);
  });

  it("should allow user to mint NFT after play, and set minted=true", async () => {
    await gameRecord.connect(user).play("Joy", "NFTQuote", "ipfs://meta", 123);
    const today = await gameRecord.getTodayDate();

    // mint NFT
    await expect(gameRecord.connect(user).mintTodayNFT("ipfs://meta"))
      .to.emit(gameRecord, "Minted");

    // NFT owner/URI 檢查
    expect(await gameNFT.ownerOf(1)).to.equal(user.address);
    expect(await gameNFT.tokenURI(1)).to.equal("ipfs://meta");

    // minted 欄位應為 true
    const rec = await gameRecord.records(user.address, today);
    expect(rec.minted).to.equal(true);
  });

  it("should not allow double mint for the same day", async () => {
    await gameRecord.connect(user).play("Joy", "NFTQuote", "ipfs://meta", 123);
    await gameRecord.connect(user).mintTodayNFT("ipfs://meta");
    await expect(gameRecord.connect(user).mintTodayNFT("ipfs://meta2"))
      .to.be.revertedWith("Already minted");
  });

  it("should not allow mint NFT if no record today", async () => {
    await expect(gameRecord.connect(user).mintTodayNFT("ipfs://meta"))
      .to.be.revertedWith("No record today");
  });

  it("should only allow GameRecord to mint NFT directly", async () => {
    // 直接用 user 呼叫 GameNFT 的 mint 會失敗
    await expect(gameNFT.connect(user).mint(user.address, 20240622, "ipfs://meta"))
      .to.be.revertedWith("Only GameRecord can mint");
  });

  it("should require payToken for second play and overwrite record", async () => {
    await gameRecord.connect(user).play("Hope", "First", "ipfs://1", 100);
    await expect(gameRecord.connect(user).play("Greed", "Second", "ipfs://2", 200))
      .to.emit(gameRecord, "Played");
    const today = await gameRecord.getTodayDate();
    const rec = await gameRecord.records(user.address, today);
    expect(rec.score).to.equal(200);
    expect(rec.mood).to.equal("Greed");
    expect(rec.quote).to.equal("Second");
    expect(rec.dataURI).to.equal("ipfs://2");
  });

  it("should not allow non-owner to setMinted", async () => {
    const today = await gameRecord.getTodayDate();
    await expect(gameRecord.connect(user).setMinted(user.address, today)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should allow owner to setMinted", async () => {
    await gameRecord.connect(user).play("Hope", "Test", "ipfs://test", 100);
    const today = await gameRecord.getTodayDate();
    await expect(gameRecord.setMinted(user.address, today)).to.not.be.reverted;
    const rec = await gameRecord.records(user.address, today);
    expect(rec.minted).to.equal(true);
  });

  it("should allow owner to withdraw payToken", async () => {
    await gameRecord.connect(user).play("Hope", "First", "ipfs://1", 100);
    await gameRecord.connect(user).play("Greed", "Second", "ipfs://2", 200); // 付費
    const before = await payToken.balanceOf(owner.address);
    await expect(gameRecord.withdraw(owner.address, playFee)).to.not.be.reverted;
    const after = await payToken.balanceOf(owner.address);
    expect(after - before).to.equal(playFee);
  });
});
