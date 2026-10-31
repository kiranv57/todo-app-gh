const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret-key-32-bytes-long-super-secure';

const app = require('../src/app');
const { UserModel } = require('../src/models/User');
const { TodoModel } = require('../src/models/Todo');

test('TODO-103, 104, 105: Full Todo Lifecycle, Authorization, Filtering & Dashboard Suite', async (t) => {
  UserModel.clear();
  TodoModel.clear();

  let tokenUserA = '';
  let tokenUserB = '';
  let userAId = '';
  let userBId = '';
  let todoA1Id = '';
  let todoA2Id = '';

  // Setup: Register User A and User B
  await t.test('Setup: Register User A & User B', async () => {
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user_a', email: 'usera@corp.com', password: 'password123' });
    assert.equal(resA.status, 201);
    tokenUserA = resA.body.data.token;
    userAId = resA.body.data.user._id;

    const resB = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user_b', email: 'userb@corp.com', password: 'password123' });
    assert.equal(resB.status, 201);
    tokenUserB = resB.body.data.token;
    userBId = resB.body.data.user._id;
  });

  await t.test('POST /api/todos - unauthenticated rejected with 401', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ title: 'Unauthorized Task' });
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/todos - User A creates todos (happy path)', async () => {
    const res1 = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Complete architecture proposal',
        description: 'Prepare diagrams and present to review board'
      });
    assert.equal(res1.status, 201);
    assert.equal(res1.body.success, true);
    assert.equal(res1.body.data.todo.title, 'Complete architecture proposal');
    assert.equal(res1.body.data.todo.completed, false);
    todoA1Id = res1.body.data.todo._id;

    const res2 = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Review team pull requests'
      });
    assert.equal(res2.status, 201);
    todoA2Id = res2.body.data.todo._id;
  });

  await t.test('POST /api/todos - rejects invalid body (empty title)', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ title: '   ' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  await t.test('GET /api/todos - User A lists own todos', async () => {
    const res = await request(app)
      .get('/api/todos')
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.pagination.total, 2);
  });

  await t.test('GET /api/todos - User B sees empty list (tenant isolation)', async () => {
    const res = await request(app)
      .get('/api/todos')
      .set('Authorization', `Bearer ${tokenUserB}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 0);
    assert.equal(res.body.pagination.total, 0);
  });

  await t.test('IDOR Guard: User B cannot access User A todo (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/todos/${todoA1Id}`)
      .set('Authorization', `Bearer ${tokenUserB}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  await t.test('IDOR Guard: User B cannot update User A todo (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/todos/${todoA1Id}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ completed: true });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  await t.test('IDOR Guard: User B cannot delete User A todo (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/todos/${todoA1Id}`)
      .set('Authorization', `Bearer ${tokenUserB}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  await t.test('PATCH /api/todos/:id - User A updates todo to completed', async () => {
    const res = await request(app)
      .patch(`/api/todos/${todoA1Id}`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ completed: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.todo.completed, true);
  });

  await t.test('GET /api/todos?completed=true - filters completed items', async () => {
    const res = await request(app)
      .get('/api/todos?completed=true')
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0]._id, todoA1Id);
    assert.equal(res.body.data[0].completed, true);
  });

  await t.test('GET /api/todos?completed=false - filters incomplete items', async () => {
    const res = await request(app)
      .get('/api/todos?completed=false')
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0]._id, todoA2Id);
    assert.equal(res.body.data[0].completed, false);
  });

  await t.test('GET /api/todos?completed=invalid - rejects invalid filter with 400', async () => {
    const res = await request(app)
      .get('/api/todos?completed=randomString')
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  await t.test('GET /api/todos?page=1&limit=1 - respects pagination bounds', async () => {
    const res = await request(app)
      .get('/api/todos?page=1&limit=1')
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.pagination.page, 1);
    assert.equal(res.body.pagination.limit, 1);
    assert.equal(res.body.pagination.total, 2);
    assert.equal(res.body.pagination.totalPages, 2);
  });

  await t.test('GET /api/dashboard - returns accurate task summary metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, {
      total: 2,
      completed: 1,
      incomplete: 1,
      completionRate: 50 // 1 out of 2 is 50%
    });
  });

  await t.test('DELETE /api/todos/:id - User A deletes todo', async () => {
    const res = await request(app)
      .delete(`/api/todos/${todoA1Id}`)
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify subsequent lookup yields 404 Not Found
    const fetchRes = await request(app)
      .get(`/api/todos/${todoA1Id}`)
      .set('Authorization', `Bearer ${tokenUserA}`);
    assert.equal(fetchRes.status, 404);
  });
});
