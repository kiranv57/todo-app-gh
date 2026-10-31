const test = require('node:test');
const assert = require('node:assert/strict');
const {
  registerSchema,
  loginSchema,
  createTodoSchema,
  updateTodoSchema,
  todoFilterSchema,
  paginationMetaSchema,
  listResponseSchema,
  errorResponseSchema
} = require('../src/index.js');

test('TODO-101: Auth Schemas', async (t) => {
  await t.test('validates clean registration payload', () => {
    const valid = registerSchema.safeParse({
      username: 'alice_99',
      email: 'alice@example.com',
      password: 'password123'
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.username, 'alice_99');
  });

  await t.test('rejects registration with invalid email', () => {
    const invalid = registerSchema.safeParse({
      username: 'alice_99',
      email: 'invalid-email',
      password: 'password123'
    });
    assert.equal(invalid.success, false);
  });

  await t.test('rejects registration with short password (<6 chars)', () => {
    const invalid = registerSchema.safeParse({
      username: 'alice_99',
      email: 'alice@example.com',
      password: '123'
    });
    assert.equal(invalid.success, false);
  });

  await t.test('rejects registration with invalid username characters', () => {
    const invalid = registerSchema.safeParse({
      username: 'alice@hacked!',
      email: 'alice@example.com',
      password: 'password123'
    });
    assert.equal(invalid.success, false);
  });

  await t.test('validates clean login payload', () => {
    const valid = loginSchema.safeParse({
      email: 'bob@example.com',
      password: 'secretpassword'
    });
    assert.equal(valid.success, true);
  });

  await t.test('rejects empty password in login', () => {
    const invalid = loginSchema.safeParse({
      email: 'bob@example.com',
      password: ''
    });
    assert.equal(invalid.success, false);
  });
});

test('TODO-101: Todo Schemas', async (t) => {
  await t.test('validates clean createTodo payload', () => {
    const valid = createTodoSchema.safeParse({
      title: 'Buy groceries',
      description: 'Milk, eggs, coffee'
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.title, 'Buy groceries');
  });

  await t.test('defaults description to empty string if omitted', () => {
    const valid = createTodoSchema.safeParse({
      title: 'Walk the dog'
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.description, '');
  });

  await t.test('rejects empty or whitespace-only title', () => {
    const invalid = createTodoSchema.safeParse({
      title: '   '
    });
    assert.equal(invalid.success, false);
  });

  await t.test('rejects title exceeding 140 chars', () => {
    const invalid = createTodoSchema.safeParse({
      title: 'a'.repeat(141)
    });
    assert.equal(invalid.success, false);
  });

  await t.test('validates updateTodo with partial fields', () => {
    const valid = updateTodoSchema.safeParse({
      completed: true
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.completed, true);
  });

  await t.test('rejects updateTodo when no fields are passed', () => {
    const invalid = updateTodoSchema.safeParse({});
    assert.equal(invalid.success, false);
  });
});

test('TODO-101: Todo Filter & Pagination Query Schema', async (t) => {
  await t.test('applies default page and limit on empty query', () => {
    const result = todoFilterSchema.safeParse({});
    assert.equal(result.success, true);
    assert.deepEqual(result.data, {
      page: 1,
      limit: 10
    });
    assert.equal(result.data.completed, undefined);
  });

  await t.test('coerces string page and limit parameters', () => {
    const result = todoFilterSchema.safeParse({
      page: '2',
      limit: '25'
    });
    assert.equal(result.success, true);
    assert.equal(result.data.page, 2);
    assert.equal(result.data.limit, 25);
  });

  await t.test('preprocesses string "true" and "false" to boolean for completed', () => {
    const completedTrue = todoFilterSchema.safeParse({ completed: 'true' });
    assert.equal(completedTrue.success, true);
    assert.equal(completedTrue.data.completed, true);

    const completedFalse = todoFilterSchema.safeParse({ completed: 'false' });
    assert.equal(completedFalse.success, true);
    assert.equal(completedFalse.data.completed, false);
  });

  await t.test('rejects invalid completed query value', () => {
    const invalid = todoFilterSchema.safeParse({ completed: 'not-a-bool' });
    assert.equal(invalid.success, false);
  });

  await t.test('rejects negative or zero page', () => {
    const negative = todoFilterSchema.safeParse({ page: -1 });
    assert.equal(negative.success, false);

    const zero = todoFilterSchema.safeParse({ page: 0 });
    assert.equal(zero.success, false);
  });

  await t.test('rejects limit exceeding 100', () => {
    const exceed = todoFilterSchema.safeParse({ limit: 101 });
    assert.equal(exceed.success, false);
  });
});

test('TODO-101: Response Envelopes', async (t) => {
  await t.test('validates list response envelope', () => {
    const payload = {
      success: true,
      data: [{ id: '1', title: 'Task 1', completed: false }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    };
    const result = listResponseSchema.safeParse(payload);
    assert.equal(result.success, true);
  });

  await t.test('rejects list response when success is false', () => {
    const payload = {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
    const result = listResponseSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  await t.test('validates error response with code and structured issues', () => {
    const payload = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: [{ field: 'title', message: 'Title cannot be empty' }]
    };
    const result = errorResponseSchema.safeParse(payload);
    assert.equal(result.success, true);
  });
});
