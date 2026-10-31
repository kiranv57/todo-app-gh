const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/server');

test('TODO-106, 107: Web Frontend Server & SPA Delivery', async (t) => {
  await t.test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  await t.test('GET / serves HTML index markup with TaskSphere branding', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('TaskSphere Enterprise'));
    assert.ok(res.text.includes('id="auth-section"'));
    assert.ok(res.text.includes('id="dashboard-section"'));
  });

  await t.test('GET /dashboard fallback serves SPA index.html', async () => {
    const res = await request(app).get('/dashboard');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('TaskSphere Enterprise'));
  });

  await t.test('GET /styles.css serves 3-layer precursor tokens, clamp() typography and responsive cascade', async () => {
    const res = await request(app).get('/styles.css');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('--space-2xs'), 'Must define spacing precursor scale');
    assert.ok(res.text.includes('clamp('), 'Must define fluid typography via clamp()');
    assert.ok(res.text.includes('--metrics-grid-cols'), 'Must define dynamic layout precursors');
    assert.ok(res.text.includes('@media (min-width: 640px)'), 'Must define mobile-first tablet cascade');
    assert.ok(res.text.includes('@media (min-width: 768px)'), 'Must define mobile-first desktop cascade');
    assert.ok(res.text.includes('.metrics-grid'), 'Must include semantic layout consumer');
    assert.ok(res.text.includes('.todo-item'), 'Must include semantic component consumer');
  });

  await t.test('GET /app.js serves client side SPA script', async () => {
    const res = await request(app).get('/app.js');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('tasksphere_jwt'));
  });

  await t.test('GET /store.js, /reducer.js, /api.js, /actions.js deliver tier architecture modules', async () => {
    const resStore = await request(app).get('/store.js');
    assert.equal(resStore.status, 200);
    assert.ok(resStore.text.includes('createStore'));

    const resReducer = await request(app).get('/reducer.js');
    assert.equal(resReducer.status, 200);
    assert.ok(resReducer.text.includes('ActionTypes'));

    const resApi = await request(app).get('/api.js');
    assert.equal(resApi.status, 200);
    assert.ok(resApi.text.includes('createApiClient'));

    const resActions = await request(app).get('/actions.js');
    assert.equal(resActions.status, 200);
    assert.ok(resActions.text.includes('createActions'));
  });
});

