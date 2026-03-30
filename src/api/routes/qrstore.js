/**
 * QR Store API Routes
 *
 * The QR Store scans a product image via Google Lens data, issues a credit
 * for the item purchase, and records the transaction in the G.L.S. chain.
 *
 *   POST /api/qrstore/scan        – submit scanned item data (image metadata)
 *   POST /api/qrstore/tip         – add a tip to an existing transaction
 *   GET  /api/qrstore/transaction/:txId – fetch a QR Store transaction
 *   GET  /api/qrstore/inventory   – list items available via the QR Store
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');

const glsService = require('../../services/glsService');
const economicService = require('../../services/economicService');

const router = express.Router();

// POST /api/qrstore/scan
router.post(
  '/scan',
  [
    body('imageUrl').notEmpty().withMessage('imageUrl is required'),
    body('recipientAddress').notEmpty().withMessage('recipientAddress is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { imageUrl, recipientAddress, metadata } = req.body;

      // 1. Store scan data in the GLS logistics chain
      const glsRecord = await glsService.recordScan({ imageUrl, metadata });

      // 2. Issue a credit for the scanned item
      const credit = await economicService.issueCredit({
        itemId: glsRecord.itemId,
        itemValue: glsRecord.estimatedValue,
        recipientAddress,
        tipAmount: 0,
      });

      res.status(201).json({
        success: true,
        data: {
          glsRecord,
          credit,
          qrStoreUrl: `${process.env.QR_STORE_BASE_URL || 'https://qrstore.example.com'}/item/${glsRecord.itemId}`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/qrstore/tip
router.post(
  '/tip',
  [
    body('transactionId').notEmpty().withMessage('transactionId is required'),
    body('tipAmount').isFloat({ min: 0.01 }).withMessage('tipAmount must be greater than 0'),
    body('tipper').notEmpty().withMessage('tipper address is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { transactionId, tipAmount, tipper } = req.body;
      const result = await economicService.recordTip({ transactionId, tipAmount, tipper });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/qrstore/transaction/:txId
router.get(
  '/transaction/:txId',
  [param('txId').notEmpty()],
  async (req, res, next) => {
    try {
      const tx = await glsService.getTransaction(req.params.txId);
      if (!tx) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      res.json({ success: true, data: tx });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/qrstore/inventory
router.get('/inventory', async (req, res, next) => {
  try {
    const { category, region, page = 1, limit = 20 } = req.query;
    const inventory = await glsService.listInventory({
      category,
      region,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    res.json({ success: true, data: inventory });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
