"use strict";

const request = require("supertest");
const app = require("../server");
const freepay = require("../freepay");
const gls = require("../gls");

beforeEach(() => {
  freepay._resetForTesting();
  gls._resetForTesting();
});

// ── POST /api/credit ──────────────────────────────────────────────────────────

describe("POST /api/credit", () => {
  test("201 – issues credits and returns receipt", async () => {
    const res = await request(app)
      .post("/api/credit")
      .send({ userId: "alice", amount: 25, itemId: "item-001" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ creditedAmount: 25, newBalance: 25 });
    expect(typeof res.body.transactionId).toBe("string");
  });

  test("400 – missing userId", async () => {
    const res = await request(app).post("/api/credit").send({ amount: 10 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("400 – missing amount", async () => {
    const res = await request(app).post("/api/credit").send({ userId: "alice" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("400 – non-positive amount", async () => {
    const res = await request(app).post("/api/credit").send({ userId: "alice", amount: -5 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

// ── POST /api/pay ─────────────────────────────────────────────────────────────

describe("POST /api/pay", () => {
  beforeEach(async () => {
    await request(app).post("/api/credit").send({ userId: "alice", amount: 100 });
  });

  test("200 – processes payment without tip", async () => {
    const res = await request(app)
      .post("/api/pay")
      .send({ userId: "alice", itemId: "item-001", price: 30 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ price: 30, tip: 0, total: 30, newBalance: 70 });
  });

  test("200 – processes payment with tip", async () => {
    const res = await request(app)
      .post("/api/pay")
      .send({ userId: "alice", itemId: "item-001", price: 30, tip: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ price: 30, tip: 10, total: 40, newBalance: 60 });
  });

  test("402 – insufficient credits", async () => {
    const res = await request(app)
      .post("/api/pay")
      .send({ userId: "alice", itemId: "item-001", price: 999 });
    expect(res.status).toBe(402);
    expect(res.body).toHaveProperty("error");
  });

  test("400 – missing userId", async () => {
    const res = await request(app).post("/api/pay").send({ price: 10 });
    expect(res.status).toBe(400);
  });

  test("400 – negative tip", async () => {
    const res = await request(app)
      .post("/api/pay")
      .send({ userId: "alice", price: 10, tip: -5 });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/balance/:userId ──────────────────────────────────────────────────

describe("GET /api/balance/:userId", () => {
  test("returns 0 for a new user", async () => {
    const res = await request(app).get("/api/balance/nobody");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: "nobody", balance: 0 });
  });

  test("reflects issued credits", async () => {
    await request(app).post("/api/credit").send({ userId: "carol", amount: 42 });
    const res = await request(app).get("/api/balance/carol");
    expect(res.body.balance).toBe(42);
  });
});

// ── GET /api/transactions/:userId ─────────────────────────────────────────────

describe("GET /api/transactions/:userId", () => {
  test("returns an array of transactions", async () => {
    await request(app).post("/api/credit").send({ userId: "dave", amount: 50 });
    const res = await request(app).get("/api/transactions/dave");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.transactions).toHaveLength(1);
  });

  test("returns empty array for unknown user", async () => {
    const res = await request(app).get("/api/transactions/ghost");
    expect(res.body.transactions).toHaveLength(0);
  });
});

// ── GET /api/qr ───────────────────────────────────────────────────────────────

describe("GET /api/qr", () => {
  test("returns a base-64 data URL", async () => {
    const res = await request(app)
      .get("/api/qr")
      .query({ itemId: "item-001", name: "Bread", price: "2" });
    expect(res.status).toBe(200);
    expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  test("400 – missing required query params", async () => {
    const res = await request(app).get("/api/qr").query({ name: "Bread" });
    expect(res.status).toBe(400);
  });

  test("400 – non-positive price", async () => {
    const res = await request(app)
      .get("/api/qr")
      .query({ itemId: "x", name: "X", price: "0" });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/stats ────────────────────────────────────────────────────────────

describe("GET /api/stats", () => {
  test("returns aggregate statistics", async () => {
    await request(app).post("/api/credit").send({ userId: "alice", amount: 20 });
    await request(app).post("/api/pay").send({ userId: "alice", price: 10, tip: 2 });
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalCreditsIssued).toBe(20);
    expect(res.body.totalTipsCollected).toBe(2);
    expect(res.body.transactionCount).toBe(2);
  });

  test("filters by userId query parameter", async () => {
    await request(app).post("/api/credit").send({ userId: "alice", amount: 20 });
    await request(app).post("/api/credit").send({ userId: "bob", amount: 30 });
    const res = await request(app).get("/api/stats").query({ userId: "alice" });
    expect(res.body.totalCreditsIssued).toBe(20);
  });
});
