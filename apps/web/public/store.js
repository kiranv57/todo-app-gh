/**
 * Tier 1: State Storage & Exposure
 * Observable Store Container Blueprint
 * Encapsulates immutable state storage, subscription listeners, and pure dispatch loop.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TaskSphere = root.TaskSphere || {};
    root.TaskSphere.createStore = factory().createStore;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStore(reducer, preloadedState) {
    if (typeof reducer !== 'function') {
      throw new Error('Expected reducer to be a function.');
    }

    let state = preloadedState;
    const listeners = new Set();
    let isDispatching = false;

    function getState() {
      if (isDispatching) {
        throw new Error('Cannot call store.getState() while reducer is executing.');
      }
      return state;
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new Error('Expected listener to be a function.');
      }

      listeners.add(listener);

      return function unsubscribe() {
        listeners.delete(listener);
      };
    }

    function dispatch(action) {
      if (!action || typeof action.type !== 'string') {
        throw new Error('Actions must have a valid string type.');
      }

      if (isDispatching) {
        throw new Error('Reducers may not dispatch actions.');
      }

      try {
        isDispatching = true;
        state = reducer(state, action);
      } finally {
        isDispatching = false;
      }

      for (const listener of listeners) {
        listener();
      }

      return action;
    }

    // Initialize state tree via initial action
    dispatch({ type: '@@INIT' });

    return {
      getState,
      dispatch,
      subscribe
    };
  }

  return {
    createStore
  };
});
