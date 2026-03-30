/**
 * GLS (Godworld Logistics Systems) Service
 *
 * Records and retrieves item scan data from the G.L.S. logistics chain.
 * In production this would write to the GLSLogistics smart contract and/or
 * a backing database / IPFS store.
 */

const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');

// In-memory store (replace with a database + on-chain writes in production)
const scanStore      = new Map();
const inventoryStore = new Map();

/**
 * Record a QR scan in the G.L.S. chain.
 *
 * @param {object} params
 * @param {string} params.imageUrl  - URL of the scanned image
 * @param {object} [params.metadata] - additional scan metadata
 * @returns {Promise<object>} GLS scan record
 */
async function recordScan({ imageUrl, metadata = {} }) {
  const itemId        = uuidv4();
  const transactionId = uuidv4();

  // Derive a rough estimated value from metadata or default to 10
  const estimatedValue = metadata.estimatedValue || 10;

  const record = {
    transactionId,
    itemId,
    imageUrl,
    metadata,
    estimatedValue,
    recordedAt: new Date().toISOString(),
    // In production: glsTxHash comes from the on-chain GLSLogistics contract call.
    // For now we derive a deterministic placeholder from the UUID's character codes.
    glsTxHash: '0x' + Buffer.from(transactionId.replace(/-/g, ''), 'utf8')
      .toString('hex')
      .slice(0, 64)
      .padEnd(64, '0'),
  };

  scanStore.set(transactionId, record);

  // Auto-register item in inventory if not already present
  if (!inventoryStore.has(itemId)) {
    inventoryStore.set(itemId, {
      itemId,
      name:     metadata.name     || `Item-${itemId.slice(0, 8)}`,
      category: metadata.category || 'uncategorized',
      region:   metadata.region   || 'global',
      supply:   metadata.supply   || 0,
      demand:   1,
      estimatedValue,
      imageUrl,
      registeredAt: new Date().toISOString(),
    });
  } else {
    // Increment demand
    const item = inventoryStore.get(itemId);
    item.demand += 1;
  }

  return record;
}

/**
 * Fetch a scan transaction by ID.
 * @param {string} txId
 * @returns {Promise<object|null>}
 */
async function getTransaction(txId) {
  return scanStore.get(txId) || null;
}

/**
 * List inventory with optional filtering and pagination.
 *
 * @param {object} params
 * @param {string} [params.category]
 * @param {string} [params.region]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<object>} paginated inventory list
 */
async function listInventory({ category, region, page = 1, limit = 20 }) {
  let items = Array.from(inventoryStore.values());

  if (category) {
    items = items.filter((i) => i.category === category);
  }
  if (region) {
    items = items.filter((i) => i.region === region);
  }

  const total = items.length;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return {
    items:      paged,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { recordScan, getTransaction, listInventory };
