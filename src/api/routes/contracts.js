/**
 * Smart Contract Management API Routes
 *
 * Provides endpoints to deploy and interact with the GOS smart contract layer:
 *   GET  /api/contracts/list           – list known deployed contracts
 *   POST /api/contracts/deploy         – deploy a named contract
 *   POST /api/contracts/call           – call a read-only contract method
 *   POST /api/contracts/send           – send a state-changing transaction
 *   GET  /api/contracts/:name/abi      – fetch the ABI of a named contract
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');

const contractService = require('../../services/contractService');

const router = express.Router();

const SUPPORTED_CONTRACTS = ['QRStore', 'CreditSystem', 'GLSLogistics'];

// GET /api/contracts/list
router.get('/list', (_req, res) => {
  res.json({ success: true, data: { contracts: SUPPORTED_CONTRACTS } });
});

// POST /api/contracts/deploy
router.post(
  '/deploy',
  [
    body('contractName')
      .isIn(SUPPORTED_CONTRACTS)
      .withMessage(`contractName must be one of: ${SUPPORTED_CONTRACTS.join(', ')}`),
    body('constructorArgs').optional().isArray(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { contractName, constructorArgs = [] } = req.body;
      const deployment = await contractService.deploy(contractName, constructorArgs);
      res.status(201).json({ success: true, data: deployment });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/contracts/call
router.post(
  '/call',
  [
    body('contractName').isIn(SUPPORTED_CONTRACTS),
    body('method').notEmpty().withMessage('method is required'),
    body('args').optional().isArray(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { contractName, method, args = [] } = req.body;
      const result = await contractService.call(contractName, method, args);
      res.json({ success: true, data: { result } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/contracts/send
router.post(
  '/send',
  [
    body('contractName').isIn(SUPPORTED_CONTRACTS),
    body('method').notEmpty().withMessage('method is required'),
    body('args').optional().isArray(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { contractName, method, args = [] } = req.body;
      const receipt = await contractService.send(contractName, method, args);
      res.json({ success: true, data: { receipt } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/contracts/:name/abi
router.get(
  '/:name/abi',
  [param('name').isIn(SUPPORTED_CONTRACTS).withMessage('Unknown contract name')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const abi = await contractService.getAbi(req.params.name);
      res.json({ success: true, data: { abi } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
