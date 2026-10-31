/**
 * Tier 3: Async Boundary (Side Effects & API Client)
 * Invariant: Raw HTTP requests with AbortController signal support for network race-condition prevention.
 * No direct store mutation; returns raw responses or throws structured errors.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TaskSphere = root.TaskSphere || {};
    root.TaskSphere.createApiClient = factory().createApiClient;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createApiClient(options = {}) {
    const baseUrl = options.baseUrl || '/api/proxy';
    const customFetch = options.fetch || globalThis.fetch;

    if (!customFetch) {
      throw new Error('createApiClient requires a valid fetch implementation.');
    }

    async function request(endpoint, reqOptions = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...(reqOptions.headers || {})
      };

      if (reqOptions.token) {
        headers.Authorization = `Bearer ${reqOptions.token}`;
      }

      const fetchConfig = {
        method: reqOptions.method || 'GET',
        headers
      };

      if (reqOptions.signal) {
        fetchConfig.signal = reqOptions.signal;
      }

      if (reqOptions.body) {
        fetchConfig.body = typeof reqOptions.body === 'string' ? reqOptions.body : JSON.stringify(reqOptions.body);
      }

      const url = `${baseUrl}${endpoint}`;
      const response = await customFetch(url, fetchConfig);
      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status} Request Failed`);
        error.status = response.status;
        error.code = data.code || 'API_ERROR';
        error.issues = data.issues || null;
        throw error;
      }

      return data;
    }

    return {
      auth: {
        login: (credentials, signal) =>
          request('/auth/login', { method: 'POST', body: credentials, signal }),
        register: (userData, signal) =>
          request('/auth/register', { method: 'POST', body: userData, signal }),
        me: (token, signal) =>
          request('/auth/me', { method: 'GET', token, signal })
      },
      todos: {
        list: ({ filter = 'all', page = 1, limit = 5, token }, signal) => {
          let query = `?page=${page}&limit=${limit}`;
          if (filter === 'active') {
            query += '&completed=false';
          } else if (filter === 'completed') {
            query += '&completed=true';
          }
          return request(`/todos${query}`, { method: 'GET', token, signal });
        },
        create: (todoData, token, signal) =>
          request('/todos', { method: 'POST', body: todoData, token, signal }),
        update: (id, updates, token, signal) =>
          request(`/todos/${id}`, { method: 'PATCH', body: updates, token, signal }),
        delete: (id, token, signal) =>
          request(`/todos/${id}`, { method: 'DELETE', token, signal })
      },
      dashboard: {
        getStats: (token, signal) =>
          request('/dashboard', { method: 'GET', token, signal })
      }
    };
  }

  return {
    createApiClient
  };
});
