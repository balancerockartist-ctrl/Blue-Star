// test/QRStore.test.js
// Hardhat/ethers unit tests for QRStore.sol

const { expect }   = require("chai");
const { ethers }   = require("hardhat");

describe("QRStore", function () {
  let qrStore;
  let owner, seller, buyer, other;

  const ITEM_QR_HASH    = ethers.keccak256(ethers.toUtf8Bytes("item-001"));
  const METADATA_URI    = "ipfs://QmExampleHash";
  const CREDIT_AMOUNT   = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, seller, buyer, other] = await ethers.getSigners();

    const QRStore = await ethers.getContractFactory("QRStore");
    qrStore = await QRStore.deploy();
  });

  // ── scanItem ───────────────────────────────────────────────────────────────

  describe("scanItem", function () {
    it("registers an item and emits ItemScanned", async function () {
      const tx = await qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(qrStore, "ItemScanned")
        .withArgs(ITEM_QR_HASH, seller.address, METADATA_URI, CREDIT_AMOUNT, block.timestamp);
    });

    it("reverts when registering the same qrHash twice", async function () {
      await qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT);
      await expect(
        qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT)
      ).to.be.revertedWithCustomError(qrStore, "ItemAlreadyRegistered");
    });

    it("reverts when creditAmount is zero", async function () {
      await expect(
        qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, 0n)
      ).to.be.revertedWithCustomError(qrStore, "ZeroCreditAmount");
    });
  });

  // ── issueCredit ────────────────────────────────────────────────────────────

  describe("issueCredit", function () {
    beforeEach(async function () {
      await qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT);
    });

    it("increments buyer creditBalance and emits CreditIssued", async function () {
      await expect(
        qrStore.connect(other).issueCredit(ITEM_QR_HASH, buyer.address, {
          value: CREDIT_AMOUNT,
        })
      )
        .to.emit(qrStore, "CreditIssued")
        .withArgs(ITEM_QR_HASH, buyer.address, CREDIT_AMOUNT);

      expect(await qrStore.creditBalance(buyer.address)).to.equal(CREDIT_AMOUNT);
    });

    it("refunds excess ETH to the caller", async function () {
      const extra        = ethers.parseEther("0.05");
      const totalSent    = CREDIT_AMOUNT + extra;
      const balanceBefore = await ethers.provider.getBalance(other.address);

      const tx      = await qrStore.connect(other).issueCredit(ITEM_QR_HASH, buyer.address, { value: totalSent });
      const receipt  = await tx.wait();
      const gasUsed  = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(other.address);
      // other paid CREDIT_AMOUNT + gas, got extra back
      expect(balanceBefore - balanceAfter).to.be.closeTo(CREDIT_AMOUNT + gasUsed, ethers.parseEther("0.001"));
    });

    it("reverts when item not found", async function () {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(
        qrStore.connect(other).issueCredit(unknownHash, buyer.address, { value: CREDIT_AMOUNT })
      ).to.be.revertedWithCustomError(qrStore, "ItemNotFound");
    });

    it("reverts when ETH sent is less than creditAmount", async function () {
      await expect(
        qrStore.connect(other).issueCredit(ITEM_QR_HASH, buyer.address, {
          value: CREDIT_AMOUNT - 1n,
        })
      ).to.be.revertedWithCustomError(qrStore, "InsufficientCredit");
    });
  });

  // ── tipSeller ──────────────────────────────────────────────────────────────

  describe("tipSeller", function () {
    const TIP = ethers.parseEther("0.005");

    beforeEach(async function () {
      await qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT);
    });

    it("forwards ETH to seller and emits TipSent", async function () {
      const sellerBefore = await ethers.provider.getBalance(seller.address);

      await expect(
        qrStore.connect(buyer).tipSeller(ITEM_QR_HASH, { value: TIP })
      )
        .to.emit(qrStore, "TipSent")
        .withArgs(ITEM_QR_HASH, buyer.address, seller.address, TIP);

      const sellerAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerAfter - sellerBefore).to.equal(TIP);
    });

    it("reverts with zero value", async function () {
      await expect(
        qrStore.connect(buyer).tipSeller(ITEM_QR_HASH, { value: 0n })
      ).to.be.revertedWithCustomError(qrStore, "ZeroTipAmount");
    });

    it("reverts when item not found", async function () {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("ghost"));
      await expect(
        qrStore.connect(buyer).tipSeller(unknownHash, { value: TIP })
      ).to.be.revertedWithCustomError(qrStore, "ItemNotFound");
    });
  });

  // ── redeemCredit ──────────────────────────────────────────────────────────

  describe("redeemCredit", function () {
    beforeEach(async function () {
      await qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT);
      // Fund the contract so it can pay out
      await qrStore.connect(other).issueCredit(ITEM_QR_HASH, buyer.address, { value: CREDIT_AMOUNT });
    });

    it("reduces creditBalance and transfers ETH to redeemer", async function () {
      const balBefore = await ethers.provider.getBalance(buyer.address);
      const tx        = await qrStore.connect(buyer).redeemCredit(CREDIT_AMOUNT);
      const receipt   = await tx.wait();
      const gasUsed   = receipt.gasUsed * receipt.gasPrice;
      const balAfter  = await ethers.provider.getBalance(buyer.address);

      expect(balAfter - balBefore + gasUsed).to.equal(CREDIT_AMOUNT);
      expect(await qrStore.creditBalance(buyer.address)).to.equal(0n);
    });

    it("reverts when balance is insufficient", async function () {
      await expect(
        qrStore.connect(buyer).redeemCredit(CREDIT_AMOUNT + 1n)
      ).to.be.revertedWithCustomError(qrStore, "InsufficientCredit");
    });
  });

  // ── getItemRecord ─────────────────────────────────────────────────────────

  describe("getItemRecord", function () {
    it("returns the stored record", async function () {
      await qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT);
      const record = await qrStore.getItemRecord(ITEM_QR_HASH);
      expect(record.seller).to.equal(seller.address);
      expect(record.metadataURI).to.equal(METADATA_URI);
      expect(record.creditAmount).to.equal(CREDIT_AMOUNT);
    });

    it("reverts for unknown qrHash", async function () {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("nope"));
      await expect(qrStore.getItemRecord(unknownHash))
        .to.be.revertedWithCustomError(qrStore, "ItemNotFound");
    });
  });

  // ── withdraw (owner only) ─────────────────────────────────────────────────

  describe("withdraw", function () {
    it("allows owner to withdraw contract balance", async function () {
      // fund contract
      await qrStore.connect(seller).scanItem(ITEM_QR_HASH, METADATA_URI, CREDIT_AMOUNT);
      await qrStore.connect(other).issueCredit(ITEM_QR_HASH, buyer.address, { value: CREDIT_AMOUNT });

      const ownerBefore = await ethers.provider.getBalance(owner.address);
      const tx          = await qrStore.connect(owner).withdraw();
      const receipt     = await tx.wait();
      const gasUsed     = receipt.gasUsed * receipt.gasPrice;
      const ownerAfter  = await ethers.provider.getBalance(owner.address);

      expect(ownerAfter - ownerBefore + gasUsed).to.equal(CREDIT_AMOUNT);
    });

    it("reverts when called by non-owner", async function () {
      await expect(qrStore.connect(other).withdraw()).to.be.revertedWith(
        "QRStore: caller is not owner"
      );
    });
  });
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function blockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
