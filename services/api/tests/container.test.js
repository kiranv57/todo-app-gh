const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-32-bytes-long-super-secure';

const { createContainer } = require('../src/container');
const { createApp } = require('../src/app');
const {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} = require('../src/errors');

test('TODO-110: dependency injection & composition root isolation', async (t) => {
  const secretA = 'container-secret-alpha-32-chars-long';
  const secretB = 'container-secret-beta-32-chars-long';

  const containerA = createContainer({ jwtSecret: secretA, isolated: true });
  const containerB = createContainer({ jwtSecret: secretB, isolated: true });

  await t.test('Containers possess strictly isolated storage instances', () => {
    assert.notEqual(containerA.userStore, containerB.userStore);
    assert.notEqual(containerA.todoStore, containerB.todoStore);

    // Seed container A
    const userA = containerA.userRepository.create({
      username: 'agent_alpha',
      email: 'alpha@corp.internal',
      passwordHash: 'hash-alpha'
    });

    // Verify container A has the user, but container B is empty
    assert.equal(containerA.userRepository.findById(userA.id).username, 'agent_alpha');
    assert.equal(containerB.userRepository.findById(userA.id), null);
    assert.equal(containerB.userRepository.findByEmail('alpha@corp.internal'), null);
  });

  await t.test('Domain Services and Controllers correctly receive injected dependencies', () => {
    assert.ok(containerA.authService);
    assert.ok(containerA.todoService);
    assert.ok(containerA.authController);
    assert.ok(containerA.todoController);

    // Register user via container A's service
    const authResult = containerA.authService.registerUser({
      username: 'service_user',
      email: 'service@corp.internal',
      password: 'password123'
    });

    assert.equal(authResult.user.username, 'service_user');
    assert.ok(authResult.token);

    // Container B's repository must have no awareness of this user
    assert.equal(containerB.userRepository.findByEmail('service@corp.internal'), null);
  });

  await t.test('createApp accepts custom container for clean isolated HTTP testing', async () => {
    const customContainer = createContainer({
      jwtSecret: 'test-isolated-key-32-chars-min',
      isolated: true
    });
    const customApp = createApp(customContainer);

    const res = await request(customApp)
      .post('/api/auth/register')
      .send({
        username: 'isolated_user',
        email: 'isolated@test.local',
        password: 'password123'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.username, 'isolated_user');

    // Confirm it exists only in customContainer.userStore
    assert.equal(customContainer.userStore.size, 1);
  });
});

test('TODO-110: Centralized Error Middleware & AppError Taxonomy', async (t) => {
  const customContainer = createContainer({
    jwtSecret: 'test-err-secret-32-characters-min',
    isolated: true
  });
  const app = createApp(customContainer);

  await t.test('ValidationError serializes structured issues array', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad' }); // missing username & password, invalid email

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.issues));
    assert.ok(res.body.issues.length > 0);
  });

  await t.test('ConflictError returns HTTP 409 CONFLICT', async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'sam', email: 'sam@corp.internal', password: 'password123' });

    // Register again with same email
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'samuel', email: 'sam@corp.internal', password: 'password123' });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'CONFLICT');
    assert.equal(res.body.error, 'Email already registered');
  });

  await t.test('UnauthorizedError returns HTTP 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@corp.internal', password: 'password123' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  await t.test('Route not found returns HTTP 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/unregistered/route');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'NOT_FOUND');
  });
});
