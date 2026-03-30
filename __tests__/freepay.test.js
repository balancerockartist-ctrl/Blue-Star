"use strict";

const freepay = require("../freepay");
const gls = require("../gls");

beforeEach(() => {
  freepay._resetForTesting();
  gls._resetForTesting();
});

// ── getWallet ────────────────────────────────────────────────────────────────

describe("getWallet", () => {
  test("creates a wallet with zero credits for a new user", () => {
    const wallet = freepay.getWallet("alice");
    expect(wallet).toEqual({ userId: "alice", credits: 0 });
  });

  test("returns the same wallet on subsequent calls", () => {
    const w1 = freepay.getWallet("bob");
    const w2 = freepay.getWallet("bob");
    expect(w1).toBe(w2);
  });
});

// ── issueCredit ──────────────────────────────────────────────────────────────

describe("issueCredit", () => {
  test("adds credits to a user wallet", () => {
    freepay.issueCredit("alice", 10, "item-001");
    expect(freepay.getBalance("alice")).toBe(10);
  });

  test("returns a transaction receipt", () => {
    const result = freepay.issueCredit("alice", 5, "item-002");
    expect(result).toMatchObject({ creditedAmount: 5, newBalance: 5 });
    expect(typeof result.transactionId).toBe("string");
  });

  test("accumulates multiple credits", () => {
    freepay.issueCredit("alice", 5, "item-001");
    freepay.issueCredit("alice", 7, "item-002");
    expect(freepay.getBalance("alice")).toBe(12);
  });

  test("records the transaction in the G.L.S. ledger", () => {
    freepay.issueCredit("alice", 20, "item-003");
    const txs = gls.getTransactions("alice");
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ type: "credit", amount: 20, itemId: "item-003" });
  });

  test("throws if userId is missing", () => {
    expect(() => freepay.issueCredit("", 10, "item")).toThrow();
  });

  test("throws if amount is zero or negative", () => {
    expect(() => freepay.issueCredit("alice", 0, "item")).toThrow();
    expect(() => freepay.issueCredit("alice", -5, "item")).toThrow();
  });
});

// ── pay ──────────────────────────────────────────────────────────────────────

describe("pay", () => {
  beforeEach(() => {
    freepay.issueCredit("alice", 100, "seed");
  });

  test("deducts the item price from the wallet", () => {
    freepay.pay("alice", "item-001", 20);
    expect(freepay.getBalance("alice")).toBe(80);
  });

  test("deducts price + tip from the wallet", () => {
    freepay.pay("alice", "item-001", 20, 5);
    expect(freepay.getBalance("alice")).toBe(75);
  });

  test("returns a full payment receipt", () => {
    const result = freepay.pay("alice", "item-001", 20, 3);
    expect(result).toMatchObject({ price: 20, tip: 3, total: 23, newBalance: 77 });
    expect(typeof result.transactionId).toBe("string");
  });

  test("records the payment in the G.L.S. ledger", () => {
    freepay.pay("alice", "item-001", 20, 2);
    const txs = gls.getTransactions("alice").filter((t) => t.type === "payment");
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ type: "payment", price: 20, tip: 2, total: 22 });
  });

  test("throws if balance is insufficient", () => {
    expect(() => freepay.pay("alice", "item-001", 200)).toThrow(/insufficient/);
  });

  test("tip defaults to zero when omitted", () => {
    freepay.pay("alice", "item-001", 10);
    expect(freepay.getBalance("alice")).toBe(90);
  });

  test("throws if price is zero or negative", () => {
    expect(() => freepay.pay("alice", "item-001", 0)).toThrow();
    expect(() => freepay.pay("alice", "item-001", -10)).toThrow();
  });

  test("throws if tip is negative", () => {
    expect(() => freepay.pay("alice", "item-001", 10, -1)).toThrow();
  });
});

// ── getBalance ───────────────────────────────────────────────────────────────

describe("getBalance", () => {
  test("returns 0 for a brand-new user", () => {
    expect(freepay.getBalance("nobody")).toBe(0);
  });

  test("reflects credit and payment operations", () => {
    freepay.issueCredit("carol", 50, "x");
    freepay.pay("carol", "y", 15, 5);
    expect(freepay.getBalance("carol")).toBe(30);
  });
});
