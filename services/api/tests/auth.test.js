const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// Set test environment secret before requiring app
process.env.JWT_SECRET = 'test-secret-key-32-bytes-long-super-secure';

const app = require('../src/app');
const { UserModel } = require('../src/models/User');
const { getEnv } = require('../src/config/env');

test('TODO-102: Health Check', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('TODO-102: Authentication & Identity Flow', async (t) => {
  UserModel.clear();

  let authToken = '';
  let userId = '';

  await t.test('POST /api/auth/register - happy path', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice_dev',
        email: 'alice@company.com',
        password: 'securePassword123'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.username, 'alice_dev');
    assert.equal(res.body.data.user.email, 'alice@company.com');
    assert.equal(res.body.data.user.passwordHash, undefined); // Invariant: password never returned!
    assert.ok(res.body.data.token, 'Token must be present in response');

    authToken = res.body.data.token;
    userId = res.body.data.user._id;
  });

  await t.test('POST /api/auth/register - duplicate email returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice_different',
        email: 'alice@company.com', // Duplicate
        password: 'securePassword123'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'CONFLICT');
  });

  await t.test('POST /api/auth/register - duplicate username returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice_dev', // Duplicate
        email: 'different@company.com',
        password: 'securePassword123'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'CONFLICT');
  });

  await t.test('POST /api/auth/register - invalid email returns 400 with structured issues', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'bob_dev',
        email: 'not-an-email',
        password: 'securePassword123'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.issues));
    assert.equal(res.body.issues[0].field, 'email');
  });

  await t.test('POST /api/auth/login - valid credentials returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@company.com',
        password: 'securePassword123'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'alice@company.com');
  });

  await t.test('POST /api/auth/login - wrong password returns 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@company.com',
        password: 'wrongPassword'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  await t.test('GET /api/auth/me - without token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/auth/me - with valid token returns current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user._id, userId);
    assert.equal(res.body.data.user.username, 'alice_dev');
  });

  await t.test('Zero-Fallback Secret Invariant - throws on unset JWT_SECRET', () => {
    const saved = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      assert.throws(() => getEnv(), /FATAL: JWT_SECRET environment variable is required/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});
