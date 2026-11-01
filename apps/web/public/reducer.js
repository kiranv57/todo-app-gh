/**
 * Business logic: pure reducers
 * Invariant: pure synchronous state transformations. No async, no side effects, no fetch.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TaskSphere = root.TaskSphere || {};
    const exported = factory();
    root.TaskSphere.ActionTypes = exported.ActionTypes;
    root.TaskSphere.initialState = exported.initialState;
    root.TaskSphere.rootReducer = exported.rootReducer;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ActionTypes = {
    // Auth Lifecycle
    AUTH_START: 'AUTH_START',
    AUTH_SUCCESS: 'AUTH_SUCCESS',
    AUTH_FAILURE: 'AUTH_FAILURE',
    AUTH_LOGOUT: 'AUTH_LOGOUT',
    AUTH_RESTORE_SESSION: 'AUTH_RESTORE_SESSION',

    // Todo Query Lifecycle & Filters
    TODOS_FETCH_START: 'TODOS_FETCH_START',
    TODOS_FETCH_SUCCESS: 'TODOS_FETCH_SUCCESS',
    TODOS_FETCH_FAILURE: 'TODOS_FETCH_FAILURE',
    TODOS_SET_FILTER: 'TODOS_SET_FILTER',
    TODOS_SET_PAGE: 'TODOS_SET_PAGE',

    // Todo Optimistic Mutations & Rollbacks
    TODO_OPTIMISTIC_ADD: 'TODO_OPTIMISTIC_ADD',
    TODO_OPTIMISTIC_TOGGLE: 'TODO_OPTIMISTIC_TOGGLE',
    TODO_ROLLBACK_TOGGLE: 'TODO_ROLLBACK_TOGGLE',
    TODO_OPTIMISTIC_REMOVE: 'TODO_OPTIMISTIC_REMOVE',

    // Dashboard Metrics
    DASHBOARD_FETCH_START: 'DASHBOARD_FETCH_START',
    DASHBOARD_FETCH_SUCCESS: 'DASHBOARD_FETCH_SUCCESS',
    DASHBOARD_FETCH_FAILURE: 'DASHBOARD_FETCH_FAILURE',

    // UI State
    UI_SET_TAB: 'UI_SET_TAB',
    UI_SET_ALERT: 'UI_SET_ALERT',
    UI_CLEAR_ALERT: 'UI_CLEAR_ALERT'
  };

  const initialState = {
    auth: {
      user: null,
      token: null,
      status: 'idle', // 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
      error: null
    },
    todos: {
      items: [],
      filter: 'all', // 'all' | 'active' | 'completed'
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 1,
      status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
      error: null
    },
    dashboard: {
      stats: {
        total: 0,
        completed: 0,
        incomplete: 0,
        completionRate: 0
      },
      status: 'idle',
      error: null
    },
    ui: {
      activeTab: 'login', // 'login' | 'register'
      alert: null // { type: 'error' | 'success', message: string }
    }
  };

  function authReducer(state = initialState.auth, action) {
    switch (action.type) {
      case ActionTypes.AUTH_START:
        return {
          ...state,
          status: 'loading',
          error: null
        };
      case ActionTypes.AUTH_SUCCESS:
        return {
          ...state,
          status: 'authenticated',
          user: action.payload.user,
          token: action.payload.token,
          error: null
        };
      case ActionTypes.AUTH_FAILURE:
        return {
          ...state,
          status: 'unauthenticated',
          error: action.payload
        };
      case ActionTypes.AUTH_LOGOUT:
        return {
          ...initialState.auth,
          status: 'unauthenticated'
        };
      case ActionTypes.AUTH_RESTORE_SESSION:
        return {
          ...state,
          status: 'authenticated',
          user: action.payload.user,
          token: action.payload.token,
          error: null
        };
      default:
        return state;
    }
  }

  function todosReducer(state = initialState.todos, action) {
    switch (action.type) {
      case ActionTypes.TODOS_FETCH_START:
        return {
          ...state,
          status: 'loading',
          error: null
        };
      case ActionTypes.TODOS_FETCH_SUCCESS:
        return {
          ...state,
          status: 'succeeded',
          items: action.payload.items,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
          page: action.payload.page,
          error: null
        };
      case ActionTypes.TODOS_FETCH_FAILURE:
        return {
          ...state,
          status: 'failed',
          error: action.payload
        };
      case ActionTypes.TODOS_SET_FILTER:
        return {
          ...state,
          filter: action.payload,
          page: 1 // Reset pagination upon filter change
        };
      case ActionTypes.TODOS_SET_PAGE:
        return {
          ...state,
          page: action.payload
        };
      case ActionTypes.TODO_OPTIMISTIC_ADD:
        return {
          ...state,
          items: [action.payload, ...state.items],
          total: state.total + 1
        };
      case ActionTypes.TODO_OPTIMISTIC_TOGGLE: {
        const { id, completed } = action.payload;
        return {
          ...state,
          items: state.items.map((item) =>
            item._id === id || item.id === id ? { ...item, completed } : item
          )
        };
      }
      case ActionTypes.TODO_ROLLBACK_TOGGLE: {
        const { id, completed } = action.payload;
        return {
          ...state,
          items: state.items.map((item) =>
            item._id === id || item.id === id ? { ...item, completed } : item
          )
        };
      }
      case ActionTypes.TODO_OPTIMISTIC_REMOVE: {
        const id = action.payload;
        return {
          ...state,
          items: state.items.filter((item) => item._id !== id && item.id !== id),
          total: Math.max(0, state.total - 1)
        };
      }
      case ActionTypes.AUTH_LOGOUT:
        return { ...initialState.todos };
      default:
        return state;
    }
  }

  function dashboardReducer(state = initialState.dashboard, action) {
    switch (action.type) {
      case ActionTypes.DASHBOARD_FETCH_START:
        return {
          ...state,
          status: 'loading',
          error: null
        };
      case ActionTypes.DASHBOARD_FETCH_SUCCESS:
        return {
          ...state,
          status: 'succeeded',
          stats: action.payload,
          error: null
        };
      case ActionTypes.DASHBOARD_FETCH_FAILURE:
        return {
          ...state,
          status: 'failed',
          error: action.payload
        };
      case ActionTypes.AUTH_LOGOUT:
        return { ...initialState.dashboard };
      default:
        return state;
    }
  }

  function uiReducer(state = initialState.ui, action) {
    switch (action.type) {
      case ActionTypes.UI_SET_TAB:
        return {
          ...state,
          activeTab: action.payload,
          alert: null
        };
      case ActionTypes.UI_SET_ALERT:
        return {
          ...state,
          alert: action.payload
        };
      case ActionTypes.UI_CLEAR_ALERT:
      case ActionTypes.AUTH_SUCCESS:
        return {
          ...state,
          alert: null
        };
      case ActionTypes.AUTH_LOGOUT:
        return { ...initialState.ui };
      default:
        return state;
    }
  }

  function rootReducer(state = initialState, action) {
    if (!action) return state;

    return {
      auth: authReducer(state.auth, action),
      todos: todosReducer(state.todos, action),
      dashboard: dashboardReducer(state.dashboard, action),
      ui: uiReducer(state.ui, action)
    };
  }

  return {
    ActionTypes,
    initialState,
    rootReducer
  };
});
