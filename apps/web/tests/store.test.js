const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../src/store/createStore');
const { rootReducer, ActionTypes, initialState } = require('../src/store/reducer');
const { createApiClient } = require('../src/lib/api');
const { createActions } = require('../src/hooks/actions');

test('TODO-111: observable store & pure reducers', async (t) => {
  await t.test('Store adheres to observable subscription contract and initial state', () => {
    const store = createStore(rootReducer);
    const state = store.getState();

    assert.equal(state.auth.status, 'idle');
    assert.equal(state.todos.items.length, 0);
    assert.equal(state.todos.filter, 'all');
    assert.equal(state.dashboard.stats.total, 0);
    assert.equal(state.ui.activeTab, 'login');

    let notifiedCount = 0;
    const unsubscribe = store.subscribe(() => {
      notifiedCount++;
    });

    store.dispatch({ type: ActionTypes.UI_SET_TAB, payload: 'register' });
    assert.equal(store.getState().ui.activeTab, 'register');
    assert.equal(notifiedCount, 1);

    unsubscribe();
    store.dispatch({ type: ActionTypes.UI_SET_TAB, payload: 'login' });
    assert.equal(store.getState().ui.activeTab, 'login');
    assert.equal(notifiedCount, 1, 'Unsubscribed listener must not be notified');
  });

  await t.test('Reducers execute pure deterministic mutations without mutating previous state', () => {
    const s0 = rootReducer(undefined, { type: '@@INIT' });
    const s1 = rootReducer(s0, {
      type: ActionTypes.AUTH_SUCCESS,
      payload: { user: { username: 'test_user', email: 'test@corp.com' }, token: 'jwt-token-123' }
    });

    assert.notEqual(s0, s1);
    assert.equal(s0.auth.status, 'idle');
    assert.equal(s1.auth.status, 'authenticated');
    assert.equal(s1.auth.user.username, 'test_user');
    assert.equal(s1.auth.token, 'jwt-token-123');

    // Optimistic item add
    const s2 = rootReducer(s1, {
      type: ActionTypes.TODO_OPTIMISTIC_ADD,
      payload: { id: 'task-1', title: 'Test Task', completed: false }
    });
    assert.equal(s2.todos.items.length, 1);
    assert.equal(s2.todos.items[0].title, 'Test Task');

    // Optimistic toggle
    const s3 = rootReducer(s2, {
      type: ActionTypes.TODO_OPTIMISTIC_TOGGLE,
      payload: { id: 'task-1', completed: true }
    });
    assert.equal(s3.todos.items[0].completed, true);

    // Rollback toggle
    const s4 = rootReducer(s3, {
      type: ActionTypes.TODO_ROLLBACK_TOGGLE,
      payload: { id: 'task-1', completed: false }
    });
    assert.equal(s4.todos.items[0].completed, false);

    // Optimistic remove
    const s5 = rootReducer(s4, {
      type: ActionTypes.TODO_OPTIMISTIC_REMOVE,
      payload: 'task-1'
    });
    assert.equal(s5.todos.items.length, 0);
  });
});

test('TODO-111: async boundary, AbortController cancellation & optimistic rollbacks', async (t) => {
  function createMockStorage() {
    const map = new Map();
    return {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k)
    };
  }

  await t.test('Optimistic Todo Toggle rolls back cleanly on server error', async () => {
    const store = createStore(rootReducer);
    const mockStorage = createMockStorage();

    // Mock API failing on update
    const mockApi = {
      auth: {},
      todos: {
        update: async () => {
          throw new Error('Database write error');
        }
      },
      dashboard: {}
    };

    // Pre-populate authenticated state with one task
    store.dispatch({
      type: ActionTypes.AUTH_SUCCESS,
      payload: { user: { username: 'test_dev' }, token: 'mock-jwt' }
    });
    store.dispatch({
      type: ActionTypes.TODOS_FETCH_SUCCESS,
      payload: {
        items: [{ _id: 'todo-99', title: 'Critical Task', completed: false }],
        total: 1,
        totalPages: 1,
        page: 1
      }
    });

    const actions = createActions({
      store,
      api: mockApi,
      storage: mockStorage,
      ActionTypes
    });

    // Initial state: incomplete
    assert.equal(store.getState().todos.items[0].completed, false);

    // Toggle a todo: update is attempted, then rolled back after the server error
    await actions.toggleTodo('todo-99', false);

    // Final state must be rolled back to false
    assert.equal(store.getState().todos.items[0].completed, false);
    assert.ok(store.getState().ui.alert);
    assert.ok(store.getState().ui.alert.message.includes('Database write error'));
  });

  await t.test('AbortController cancels in-flight query when filter switches rapidly', async () => {
    const store = createStore(rootReducer);
    const mockStorage = createMockStorage();

    const fetchSignals = [];
    let resolveFirstFetch;
    let resolveSecondFetch;

    const mockApi = {
      auth: {},
      todos: {
        list: ({ filter }, signal) => {
          fetchSignals.push({ filter, signal });
          if (filter === 'active') {
            return new Promise((resolve, reject) => {
              signal.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
              resolveFirstFetch = resolve;
            });
          }
          return new Promise((resolve) => {
            resolveSecondFetch = resolve;
          });
        }
      },
      dashboard: {
        getStats: async () => ({ success: true, data: { total: 0, completed: 0, incomplete: 0, completionRate: 0 } })
      }
    };

    store.dispatch({
      type: ActionTypes.AUTH_SUCCESS,
      payload: { user: { username: 'alice' }, token: 'jwt-alice' }
    });

    const actions = createActions({
      store,
      api: mockApi,
      storage: mockStorage,
      ActionTypes
    });

    // User rapidly switches filter from 'all' to 'active' then to 'completed'
    actions.setFilter('active');
    assert.equal(fetchSignals.length, 1);
    assert.equal(fetchSignals[0].filter, 'active');
    assert.equal(fetchSignals[0].signal.aborted, false);

    // Second rapid switch: immediately triggers 'completed'
    actions.setFilter('completed');
    assert.equal(fetchSignals.length, 2);
    assert.equal(fetchSignals[1].filter, 'completed');

    // First request must have been aborted by the AbortController!
    assert.equal(fetchSignals[0].signal.aborted, true, 'First in-flight query must be aborted');
    assert.equal(fetchSignals[1].signal.aborted, false, 'Latest query must remain active');

    // Resolve second request
    resolveSecondFetch({
      success: true,
      data: [{ _id: 'completed-1', title: 'Done task', completed: true }],
      pagination: { total: 1, totalPages: 1, page: 1 }
    });

    // Allow promise tick
    await new Promise((r) => setTimeout(r, 10));

    // Store state must accurately reflect the 'completed' query, not the cancelled 'active' query
    const state = store.getState();
    assert.equal(state.todos.filter, 'completed');
    assert.equal(state.todos.items.length, 1);
    assert.equal(state.todos.items[0]._id, 'completed-1');
  });
});
