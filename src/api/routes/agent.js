/**
 * AI Agent API Routes
 *
 * Exposes the Claude-powered agentic workflow engine:
 *   POST /api/agent/run        – run an agentic task (free-form prompt)
 *   POST /api/agent/scaffold   – scaffold a smart contract or API layer
 *   GET  /api/agent/tasks      – list recent agent task results
 *   GET  /api/agent/tasks/:id  – fetch a specific task result
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');

const workflowAgent = require('../../agents/workflowAgent');

const router = express.Router();

// In-memory task store (replace with a persistent store in production)
const taskStore = new Map();

// POST /api/agent/run
router.post(
  '/run',
  [body('prompt').notEmpty().withMessage('prompt is required')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { prompt, context } = req.body;
      const task = await workflowAgent.run({ prompt, context });
      taskStore.set(task.id, task);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/agent/scaffold
router.post(
  '/scaffold',
  [
    body('type')
      .isIn(['smart-contract', 'api-endpoints', 'economic-model'])
      .withMessage('type must be one of: smart-contract, api-endpoints, economic-model'),
    body('description').notEmpty().withMessage('description is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { type, description, options } = req.body;
      const task = await workflowAgent.scaffold({ type, description, options });
      taskStore.set(task.id, task);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/agent/tasks
router.get('/tasks', (_req, res) => {
  const tasks = Array.from(taskStore.values()).slice(-50);
  res.json({ success: true, data: { tasks } });
});

// GET /api/agent/tasks/:id
router.get(
  '/tasks/:id',
  [param('id').notEmpty()],
  (req, res) => {
    const task = taskStore.get(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  }
);

module.exports = router;
