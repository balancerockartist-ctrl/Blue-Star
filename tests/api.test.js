const request = require('supertest');
const app     = require('../src/api/app');

describe('Health check', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Economic API', () => {
  it('GET /api/economic/model returns model description', async () => {
    const res = await request(app).get('/api/economic/model');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('features');
  });

  it('GET /api/economic/metrics returns metrics', async () => {
    const res = await request(app).get('/api/economic/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalTransactions');
  });

  it('POST /api/economic/credit/issue issues a credit', async () => {
    const res = await request(app)
      .post('/api/economic/credit/issue')
      .send({
        itemId:           'item-abc-123',
        itemValue:        49.99,
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        tipAmount:        5,
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('creditId');
    expect(res.body.data.creditAmount).toBe(49.99);
    expect(res.body.data.tipAmount).toBe(5);
  });

  it('POST /api/economic/credit/issue validates required fields', async () => {
    const res = await request(app)
      .post('/api/economic/credit/issue')
      .send({ itemValue: 10 }); // missing itemId and recipientAddress
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/economic/supply-demand returns a snapshot', async () => {
    const res = await request(app)
      .post('/api/economic/supply-demand')
      .send({ category: 'food', region: 'north-america' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('supplyUnits');
    expect(res.body.data).toHaveProperty('demandRequests');
  });
});

describe('QR Store API', () => {
  it('POST /api/qrstore/scan records a scan and issues credit', async () => {
    const res = await request(app)
      .post('/api/qrstore/scan')
      .send({
        imageUrl:         'https://example.com/item.jpg',
        recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        metadata:         { category: 'clothing', estimatedValue: 25 },
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('glsRecord');
    expect(res.body.data).toHaveProperty('credit');
    expect(res.body.data).toHaveProperty('qrStoreUrl');
  });

  it('GET /api/qrstore/inventory returns inventory list', async () => {
    const res = await request(app).get('/api/qrstore/inventory');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
  });
});

describe('Contracts API', () => {
  it('GET /api/contracts/list returns supported contracts', async () => {
    const res = await request(app).get('/api/contracts/list');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contracts).toContain('QRStore');
    expect(res.body.data.contracts).toContain('CreditSystem');
    expect(res.body.data.contracts).toContain('GLSLogistics');
  });

  it('POST /api/contracts/deploy validates contractName', async () => {
    const res = await request(app)
      .post('/api/contracts/deploy')
      .send({ contractName: 'UnknownContract' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Agent API', () => {
  it('GET /api/agent/tasks returns task list', async () => {
    const res = await request(app).get('/api/agent/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('tasks');
  });

  it('POST /api/agent/run validates prompt requirement', async () => {
    const res = await request(app)
      .post('/api/agent/run')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/agent/scaffold validates type', async () => {
    const res = await request(app)
      .post('/api/agent/scaffold')
      .send({ type: 'invalid-type', description: 'something' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
