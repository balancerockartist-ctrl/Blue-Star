const express = require('express');

const economicRoutes = require('./routes/economic');
const contractRoutes = require('./routes/contracts');
const qrStoreRoutes = require('./routes/qrstore');
const agentRoutes = require('./routes/agent');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'blue-star-quantum-economics' });
});

// API routes
app.use('/api/economic', economicRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/qrstore', qrStoreRoutes);
app.use('/api/agent', agentRoutes);

// Centralised error handler
app.use(errorHandler);

module.exports = app;
