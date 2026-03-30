/**
 * Economic Service
 *
 * Core business logic for the quantum economics model:
 *   - Credit issuance and tip recording
 *   - Supply/demand snapshot queries
 *   - Platform-wide metrics
 */

const { v4: uuidv4 } = require('uuid');

// In-memory stores (swap for a database in production)
const creditLedger = new Map();
const tipLedger    = new Map();

/**
 * Describe the active economic model configuration.
 * @returns {object}
 */
async function describeModel() {
  return {
    name: 'Blue-Star Quantum Economics Model v1',
    description:
      'A credit-based model where scanning items via the QR Store issues credits ' +
      'to recipients. Credits are redeemable or transferable on the CreditSystem smart contract. ' +
      'Tips are optional additions collected alongside purchases and routed to service providers.',
    creditUnit: 'BSC',            // Blue-Star Credit token
    decimals: 18,
    features: [
      'item-credit-issuance',
      'tipping',
      'supply-demand-tracking',
      'gls-logistics-integration',
      'smart-contract-settlement',
    ],
  };
}

/**
 * Issue a credit for a scanned / purchased item.
 *
 * @param {object} params
 * @param {string} params.itemId
 * @param {number} params.itemValue       - item value in platform units
 * @param {string} params.recipientAddress
 * @param {number} [params.tipAmount=0]
 * @returns {Promise<object>} credit record
 */
async function issueCredit({ itemId, itemValue, recipientAddress, tipAmount = 0 }) {
  const creditId    = uuidv4();
  const creditAmount = Number(itemValue);
  const tip          = Number(tipAmount);

  const record = {
    creditId,
    itemId,
    recipientAddress,
    creditAmount,
    tipAmount:   tip,
    totalIssued: creditAmount + tip,
    issuedAt:    new Date().toISOString(),
    status:      'issued',
  };

  creditLedger.set(creditId, record);

  return record;
}

/**
 * Record a tip against an existing transaction.
 *
 * @param {object} params
 * @param {string} params.transactionId
 * @param {number} params.tipAmount
 * @param {string} params.tipper
 * @returns {Promise<object>} tip record
 */
async function recordTip({ transactionId, tipAmount, tipper }) {
  const tipId = uuidv4();

  const record = {
    tipId,
    transactionId,
    tipper,
    tipAmount: Number(tipAmount),
    recordedAt: new Date().toISOString(),
  };

  tipLedger.set(tipId, record);

  return record;
}

/**
 * Query the current supply/demand snapshot for a category.
 *
 * @param {object} params
 * @param {string} params.category
 * @param {string} [params.region]
 * @returns {Promise<object>} supply/demand snapshot
 *
 * @note STUB — values are randomly generated placeholders.
 *   Replace with a real query against the GLSLogistics smart contract
 *   or a database before using in production.
 */
async function querySupplyDemand({ category, region }) {
  // Placeholder: replace with on-chain GLS data or a database query.
  const snapshot = {
    category,
    region:          region || 'global',
    supplyUnits:     Math.floor(Math.random() * 10000),
    demandRequests:  Math.floor(Math.random() * 15000),
    equilibriumPrice: (Math.random() * 100).toFixed(2),
    timestamp:       new Date().toISOString(),
  };

  return snapshot;
}

/**
 * Aggregate platform-wide economic metrics.
 * @returns {Promise<object>}
 */
async function getPlatformMetrics() {
  const totalCredits = Array.from(creditLedger.values()).reduce(
    (sum, r) => sum + r.totalIssued,
    0
  );
  const totalTips = Array.from(tipLedger.values()).reduce(
    (sum, r) => sum + r.tipAmount,
    0
  );

  return {
    totalTransactions: creditLedger.size,
    totalCreditIssued: totalCredits,
    totalTipsRecorded: totalTips,
    totalTipCount:     tipLedger.size,
    generatedAt:       new Date().toISOString(),
  };
}

module.exports = {
  describeModel,
  issueCredit,
  recordTip,
  querySupplyDemand,
  getPlatformMetrics,
};
