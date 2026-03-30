/**
 * G.L.S. – Godworld Logistics Systems
 *
 * Acts as the in-memory transaction ledger described in the QR Store concept.
 * Every FreePay credit issuance and payment is recorded here for supply-chain
 * and demand analytics.  Swap the in-memory store for a database adapter in
 * production without changing the public API.
 */

"use strict";

/** @type {Array<Object>} */
const ledger = [];

/**
 * Record a transaction in the G.L.S. ledger.
 * @param {Object} transaction - A fully-formed transaction object from freepay.js
 */
function record(transaction) {
  if (!transaction || typeof transaction !== "object") {
    throw new Error("gls.record: transaction must be an object");
  }
  ledger.push(Object.freeze({ ...transaction }));
}

/**
 * Return all transactions, optionally filtered by userId.
 * @param {string} [userId]
 * @returns {ReadonlyArray<Object>}
 */
function getTransactions(userId) {
  if (userId) {
    return ledger.filter((tx) => tx.userId === userId);
  }
  return [...ledger];
}

/**
 * Return the total credits issued across all users (or a single user).
 * @param {string} [userId]
 * @returns {number}
 */
function totalCreditsIssued(userId) {
  return getTransactions(userId)
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Return the total value of tips collected across all users (or a single user).
 * @param {string} [userId]
 * @returns {number}
 */
function totalTipsCollected(userId) {
  return getTransactions(userId)
    .filter((tx) => tx.type === "payment")
    .reduce((sum, tx) => sum + (tx.tip || 0), 0);
}

/**
 * Clear the ledger (used by tests to get a clean state).
 */
function _resetForTesting() {
  ledger.length = 0;
}

module.exports = { record, getTransactions, totalCreditsIssued, totalTipsCollected, _resetForTesting };
