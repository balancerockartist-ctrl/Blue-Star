/**
 * Economic Model API Routes
 *
 * Provides endpoints to interact with the quantum economics engine:
 *   GET  /api/economic/model          – describe the current economic model
 *   POST /api/economic/credit/issue   – issue credit for an item transaction
 *   POST /api/economic/supply-demand  – query the live supply/demand state
 *   GET  /api/economic/metrics        – platform-wide economic metrics
 */

const express = require('express');
const { body, validationResult } = require('express-validator');

const economicService = require('../../services/economicService');

const router = express.Router();

// GET /api/economic/model
router.get('/model', async (_req, res, next) => {
  try {
    const model = await economicService.describeModel();
    res.json({ success: true, data: model });
  } catch (err) {
    next(err);
  }
});

// POST /api/economic/credit/issue
router.post(
  '/credit/issue',
  [
    body('itemId').notEmpty().withMessage('itemId is required'),
    body('itemValue').isFloat({ min: 0 }).withMessage('itemValue must be a positive number'),
    body('recipientAddress').notEmpty().withMessage('recipientAddress is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { itemId, itemValue, recipientAddress, tipAmount } = req.body;
      const result = await economicService.issueCredit({
        itemId,
        itemValue,
        recipientAddress,
        tipAmount: tipAmount || 0,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/economic/supply-demand
router.post(
  '/supply-demand',
  [body('category').notEmpty().withMessage('category is required')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { category, region } = req.body;
      const snapshot = await economicService.querySupplyDemand({ category, region });
      res.json({ success: true, data: snapshot });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/economic/metrics
router.get('/metrics', async (_req, res, next) => {
  try {
    const metrics = await economicService.getPlatformMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
