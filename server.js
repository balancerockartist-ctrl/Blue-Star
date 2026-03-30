/**
 * FreePay – Express HTTP server
 *
 * Exposes the FreePay payment engine and QR code generator over a simple REST API.
 * Serves the storefront UI from /public.
 *
 * Routes
 * ------
 * POST /api/credit              – issue credits to a user
 * POST /api/pay                 – process a FreePay purchase (with optional tip)
 * GET  /api/balance/:userId     – get a user's credit balance
 * GET  /api/transactions/:userId – list a user's G.L.S. transactions
 * GET  /api/qr                  – generate a QR code for a product
 * GET  /api/stats               – aggregate G.L.S. statistics
 */

"use strict";

const path = require("path");
const express = require("express");
const freepay = require("./freepay");
const glsLedger = require("./gls");
const { generateQRCode } = require("./qr");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Credit issuance ──────────────────────────────────────────────────────────

app.post("/api/credit", (req, res) => {
  const { userId, amount, itemId } = req.body;
  if (!userId || amount == null) {
    return res.status(400).json({ error: "userId and amount are required" });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  try {
    const result = freepay.issueCredit(userId, numericAmount, itemId);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ── Payment ───────────────────────────────────────────────────────────────────

app.post("/api/pay", (req, res) => {
  const { userId, itemId, price, tip } = req.body;
  if (!userId || price == null) {
    return res.status(400).json({ error: "userId and price are required" });
  }
  const numericPrice = Number(price);
  const numericTip = tip != null ? Number(tip) : 0;
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }
  if (!Number.isFinite(numericTip) || numericTip < 0) {
    return res.status(400).json({ error: "tip must be a non-negative number" });
  }
  try {
    const result = freepay.pay(userId, itemId, numericPrice, numericTip);
    return res.json(result);
  } catch (err) {
    const status = err.message.includes("insufficient") ? 402 : 400;
    return res.status(status).json({ error: err.message });
  }
});

// ── Balance ───────────────────────────────────────────────────────────────────

app.get("/api/balance/:userId", (req, res) => {
  const { userId } = req.params;
  const balance = freepay.getBalance(userId);
  return res.json({ userId, balance });
});

// ── Transactions ──────────────────────────────────────────────────────────────

app.get("/api/transactions/:userId", (req, res) => {
  const { userId } = req.params;
  const transactions = glsLedger.getTransactions(userId);
  return res.json({ userId, transactions });
});

// ── QR code generation ────────────────────────────────────────────────────────

app.get("/api/qr", async (req, res) => {
  const { itemId, name, price, imageUrl } = req.query;
  if (!itemId || !name || price == null) {
    return res
      .status(400)
      .json({ error: "itemId, name, and price query parameters are required" });
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const dataUrl = await generateQRCode(
      { itemId, name, price: numericPrice, imageUrl },
      baseUrl
    );
    return res.json({ qrCode: dataUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── G.L.S. statistics ─────────────────────────────────────────────────────────

app.get("/api/stats", (req, res) => {
  const { userId } = req.query;
  return res.json({
    totalCreditsIssued: glsLedger.totalCreditsIssued(userId || undefined),
    totalTipsCollected: glsLedger.totalTipsCollected(userId || undefined),
    transactionCount: glsLedger.getTransactions(userId || undefined).length,
  });
});

// ── Checkout page (SPA fallback) ──────────────────────────────────────────────

app.get("/checkout", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FreePay server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
