/**
 * FreePay – Core credit and payment engine
 *
 * Implements the FreePay credit model described in the QR Store concept:
 *  • Each item generates a FreePay credit that covers its full cost.
 *  • Buyers can add an optional tip on top of the credit.
 *  • Every transaction is recorded in the G.L.S. ledger for logistics tracking.
 */

"use strict";

const { v4: uuidv4 } = require("uuid");
const gls = require("./gls");

// In-memory wallet store (replace with persistent DB in production).
const wallets = new Map();

/**
 * Get or create the FreePay wallet for a given user.
 * @param {string} userId
 * @returns {{ userId: string, credits: number }}
 */
function getWallet(userId) {
  if (!wallets.has(userId)) {
    wallets.set(userId, { userId, credits: 0 });
  }
  return wallets.get(userId);
}

/**
 * Issue FreePay credits to a user equal to the item price.
 * This is the "credit for the item" step in the QR Store flow.
 *
 * @param {string} userId
 * @param {number} amount  - Item price in credits (must be > 0)
 * @param {string} itemId  - Reference to the item being credited
 * @returns {{ transactionId: string, creditedAmount: number, newBalance: number }}
 */
function issueCredit(userId, amount, itemId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("issueCredit: userId must be a non-empty string");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("issueCredit: amount must be a positive number");
  }

  const wallet = getWallet(userId);
  wallet.credits += amount;

  const tx = {
    transactionId: uuidv4(),
    type: "credit",
    userId,
    itemId: itemId || null,
    amount,
    balance: wallet.credits,
    timestamp: new Date().toISOString(),
  };

  gls.record(tx);
  return { transactionId: tx.transactionId, creditedAmount: amount, newBalance: wallet.credits };
}

/**
 * Process a FreePay purchase. Deducts the item price and an optional tip
 * from the user's credit balance.
 *
 * @param {string} userId
 * @param {string} itemId
 * @param {number} price      - Cost of the item in credits (must be > 0)
 * @param {number} [tip=0]    - Optional tip amount (must be >= 0)
 * @returns {{ transactionId: string, price: number, tip: number, total: number, newBalance: number }}
 */
function pay(userId, itemId, price, tip = 0) {
  if (!userId || typeof userId !== "string") {
    throw new Error("pay: userId must be a non-empty string");
  }
  if (typeof price !== "number" || price <= 0) {
    throw new Error("pay: price must be a positive number");
  }
  if (typeof tip !== "number" || tip < 0) {
    throw new Error("pay: tip must be a non-negative number");
  }

  const total = price + tip;
  const wallet = getWallet(userId);

  if (wallet.credits < total) {
    throw new Error(
      `pay: insufficient credits – balance ${wallet.credits}, required ${total}`
    );
  }

  wallet.credits -= total;

  const tx = {
    transactionId: uuidv4(),
    type: "payment",
    userId,
    itemId: itemId || null,
    price,
    tip,
    total,
    balance: wallet.credits,
    timestamp: new Date().toISOString(),
  };

  gls.record(tx);

  return {
    transactionId: tx.transactionId,
    price,
    tip,
    total,
    newBalance: wallet.credits,
  };
}

/**
 * Return the current credit balance for a user.
 * @param {string} userId
 * @returns {number}
 */
function getBalance(userId) {
  return getWallet(userId).credits;
}

/**
 * Reset all wallets (used by tests to get a clean state).
 */
function _resetForTesting() {
  wallets.clear();
}

module.exports = { getWallet, issueCredit, pay, getBalance, _resetForTesting };
