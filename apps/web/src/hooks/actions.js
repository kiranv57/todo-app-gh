/**
 * Stateful action orchestrators
 * Composes the store, pure reducers, and the async boundary into one facade.
 * Guards against network race conditions via AbortController, manages optimistic
 * rollbacks, and handles session persistence.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TaskSphere = root.TaskSphere || {};
    root.TaskSphere.createActions = factory().createActions;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createActions({ store, api, storage = globalThis.localStorage, ActionTypes }) {
    if (!store || !api || !ActionTypes) {
      throw new Error('createActions requires store, api client, and ActionTypes.');
    }

    let inFlightTodosController = null;
    let inFlightStatsController = null;

    const TOKEN_KEY = 'tasksphere_jwt';

    function getToken() {
      const state = store.getState();
      return state.auth.token || (storage ? storage.getItem(TOKEN_KEY) : null);
    }

    // --- Auth Actions ---
    async function login({ email, password }) {
      store.dispatch({ type: ActionTypes.AUTH_START });
      try {
        const res = await api.auth.login({ email, password });
        if (storage) {
          storage.setItem(TOKEN_KEY, res.data.token);
        }
        store.dispatch({
          type: ActionTypes.AUTH_SUCCESS,
          payload: { user: res.data.user, token: res.data.token }
        });
        // Initial data hydration on login
        await Promise.all([fetchDashboardStats(), fetchTodos()]);
      } catch (err) {
        store.dispatch({
          type: ActionTypes.AUTH_FAILURE,
          payload: err.message || 'Login failed'
        });
      }
    }

    async function register({ username, email, password }) {
      store.dispatch({ type: ActionTypes.AUTH_START });
      try {
        const res = await api.auth.register({ username, email, password });
        if (storage) {
          storage.setItem(TOKEN_KEY, res.data.token);
        }
        store.dispatch({
          type: ActionTypes.AUTH_SUCCESS,
          payload: { user: res.data.user, token: res.data.token }
        });
        // Initial data hydration on register
        await Promise.all([fetchDashboardStats(), fetchTodos()]);
      } catch (err) {
        store.dispatch({
          type: ActionTypes.AUTH_FAILURE,
          payload: err.message || 'Registration failed'
        });
      }
    }

    function logout() {
      if (inFlightTodosController) inFlightTodosController.abort();
      if (inFlightStatsController) inFlightStatsController.abort();
      if (storage) {
        storage.removeItem(TOKEN_KEY);
      }
      store.dispatch({ type: ActionTypes.AUTH_LOGOUT });
    }

    async function restoreSession() {
      const token = storage ? storage.getItem(TOKEN_KEY) : null;
      if (!token) {
        store.dispatch({ type: ActionTypes.AUTH_LOGOUT });
        return;
      }

      store.dispatch({ type: ActionTypes.AUTH_START });
      try {
        const res = await api.auth.me(token);
        store.dispatch({
          type: ActionTypes.AUTH_RESTORE_SESSION,
          payload: { user: res.data.user, token }
        });
        await Promise.all([fetchDashboardStats(), fetchTodos()]);
      } catch (err) {
        if (storage) storage.removeItem(TOKEN_KEY);
        store.dispatch({
          type: ActionTypes.AUTH_FAILURE,
          payload: 'Session expired'
        });
      }
    }

    // --- Todo Query Actions (with AbortController Race Shielding) ---
    async function fetchTodos() {
      const state = store.getState();
      const token = getToken();
      if (!token) return;

      // Abort any in-flight todo fetch to prevent stale out-of-order race conditions
      if (inFlightTodosController) {
        inFlightTodosController.abort();
      }
      inFlightTodosController = new AbortController();
      const { signal } = inFlightTodosController;

      store.dispatch({ type: ActionTypes.TODOS_FETCH_START });

      try {
        const res = await api.todos.list(
          {
            filter: state.todos.filter,
            page: state.todos.page,
            limit: state.todos.limit,
            token
          },
          signal
        );

        store.dispatch({
          type: ActionTypes.TODOS_FETCH_SUCCESS,
          payload: {
            items: res.data || [],
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
            page: res.pagination.page
          }
        });
      } catch (err) {
        if (err.name === 'AbortError') {
          // Intentionally superseded by a newer query; do not treat as failure
          return;
        }
        store.dispatch({
          type: ActionTypes.TODOS_FETCH_FAILURE,
          payload: err.message
        });
        if (err.status === 401) {
          logout();
        }
      }
    }

    function setFilter(filter) {
      store.dispatch({ type: ActionTypes.TODOS_SET_FILTER, payload: filter });
      fetchTodos();
    }

    function setPage(page) {
      store.dispatch({ type: ActionTypes.TODOS_SET_PAGE, payload: page });
      fetchTodos();
    }

    // --- Todo Mutation Actions (with Optimistic Updates & Rollbacks) ---
    async function createTodo({ title, description = '' }) {
      const token = getToken();
      if (!token) return;

      try {
        await api.todos.create({ title, description }, token);
        // Refresh items and metrics
        await Promise.all([fetchTodos(), fetchDashboardStats()]);
      } catch (err) {
        store.dispatch({
          type: ActionTypes.UI_SET_ALERT,
          payload: { type: 'error', message: `Create task failed: ${err.message}` }
        });
      }
    }

    async function toggleTodo(id, currentCompletedStatus) {
      const token = getToken();
      if (!token) return;

      const nextCompleted = !currentCompletedStatus;

      // Optimistic update
      store.dispatch({
        type: ActionTypes.TODO_OPTIMISTIC_TOGGLE,
        payload: { id, completed: nextCompleted }
      });

      try {
        await api.todos.update(id, { completed: nextCompleted }, token);
        fetchDashboardStats();
      } catch (err) {
        // Rollback on network or server error
        store.dispatch({
          type: ActionTypes.TODO_ROLLBACK_TOGGLE,
          payload: { id, completed: currentCompletedStatus }
        });
        store.dispatch({
          type: ActionTypes.UI_SET_ALERT,
          payload: { type: 'error', message: `Update task failed: ${err.message}` }
        });
      }
    }

    async function deleteTodo(id) {
      const token = getToken();
      if (!token) return;

      try {
        await api.todos.delete(id, token);
        store.dispatch({
          type: ActionTypes.TODO_OPTIMISTIC_REMOVE,
          payload: id
        });
        await Promise.all([fetchTodos(), fetchDashboardStats()]);
      } catch (err) {
        store.dispatch({
          type: ActionTypes.UI_SET_ALERT,
          payload: { type: 'error', message: `Delete task failed: ${err.message}` }
        });
      }
    }

    // --- Dashboard Actions ---
    async function fetchDashboardStats() {
      const token = getToken();
      if (!token) return;

      if (inFlightStatsController) {
        inFlightStatsController.abort();
      }
      inFlightStatsController = new AbortController();
      const { signal } = inFlightStatsController;

      store.dispatch({ type: ActionTypes.DASHBOARD_FETCH_START });

      try {
        const res = await api.dashboard.getStats(token, signal);
        store.dispatch({
          type: ActionTypes.DASHBOARD_FETCH_SUCCESS,
          payload: res.data
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        store.dispatch({
          type: ActionTypes.DASHBOARD_FETCH_FAILURE,
          payload: err.message
        });
      }
    }

    // --- UI Actions ---
    function setTab(tab) {
      store.dispatch({ type: ActionTypes.UI_SET_TAB, payload: tab });
    }

    function clearAlert() {
      store.dispatch({ type: ActionTypes.UI_CLEAR_ALERT });
    }

    return {
      login,
      register,
      logout,
      restoreSession,
      fetchTodos,
      setFilter,
      setPage,
      createTodo,
      toggleTodo,
      deleteTodo,
      fetchDashboardStats,
      setTab,
      clearAlert
    };
  }

  return {
    createActions
  };
});
