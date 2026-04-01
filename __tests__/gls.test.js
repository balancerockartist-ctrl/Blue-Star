"use strict";

const gls = require("../gls");

beforeEach(() => {
  gls._resetForTesting();
});

const makeTx = (overrides = {}) => ({
  transactionId: "tx-1",
  type: "credit",
  userId: "alice",
  amount: 10,
  balance: 10,
  timestamp: new Date().toISOString(),
  ...overrides,
});

// ── record ────────────────────────────────────────────────────────────────────

describe("gls.record", () => {
  test("stores a transaction", () => {
    gls.record(makeTx());
    expect(gls.getTransactions()).toHaveLength(1);
  });

  test("stored transactions are frozen (immutable)", () => {
    gls.record(makeTx({ amount: 5 }));
    const [tx] = gls.getTransactions();
    expect(() => { tx.amount = 999; }).toThrow();
  });

  test("throws if transaction is not an object", () => {
    expect(() => gls.record(null)).toThrow();
    expect(() => gls.record("string")).toThrow();
  });
});

// ── getTransactions ───────────────────────────────────────────────────────────

describe("gls.getTransactions", () => {
  beforeEach(() => {
    gls.record(makeTx({ userId: "alice", transactionId: "t1" }));
    gls.record(makeTx({ userId: "bob",   transactionId: "t2" }));
    gls.record(makeTx({ userId: "alice", transactionId: "t3" }));
  });

  test("returns all transactions when userId is omitted", () => {
    expect(gls.getTransactions()).toHaveLength(3);
  });

  test("filters by userId", () => {
    const aliceTxs = gls.getTransactions("alice");
    expect(aliceTxs).toHaveLength(2);
    aliceTxs.forEach((tx) => expect(tx.userId).toBe("alice"));
  });

  test("returns empty array for unknown userId", () => {
    expect(gls.getTransactions("nobody")).toHaveLength(0);
  });
});

// ── totalCreditsIssued ────────────────────────────────────────────────────────

describe("gls.totalCreditsIssued", () => {
  beforeEach(() => {
    gls.record(makeTx({ type: "credit", amount: 10, userId: "alice" }));
    gls.record(makeTx({ type: "credit", amount: 20, userId: "alice" }));
    gls.record(makeTx({ type: "payment", total: 5, tip: 0, price: 5, amount: undefined, userId: "alice" }));
    gls.record(makeTx({ type: "credit", amount: 15, userId: "bob" }));
  });

  test("sums credit transactions globally", () => {
    expect(gls.totalCreditsIssued()).toBe(45);
  });

  test("sums credit transactions for a specific user", () => {
    expect(gls.totalCreditsIssued("alice")).toBe(30);
    expect(gls.totalCreditsIssued("bob")).toBe(15);
  });
});

// ── totalTipsCollected ────────────────────────────────────────────────────────

describe("gls.totalTipsCollected", () => {
  beforeEach(() => {
    gls.record(makeTx({ type: "payment", tip: 3, total: 13, price: 10, amount: undefined, userId: "alice" }));
    gls.record(makeTx({ type: "payment", tip: 5, total: 15, price: 10, amount: undefined, userId: "alice" }));
    gls.record(makeTx({ type: "credit", amount: 10, userId: "alice" }));
    gls.record(makeTx({ type: "payment", tip: 7, total: 17, price: 10, amount: undefined, userId: "bob" }));
  });

  test("sums tips globally", () => {
    expect(gls.totalTipsCollected()).toBe(15);
  });

  test("sums tips for a specific user", () => {
    expect(gls.totalTipsCollected("alice")).toBe(8);
    expect(gls.totalTipsCollected("bob")).toBe(7);
  });
});
