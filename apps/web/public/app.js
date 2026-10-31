// Enterprise TaskSphere Frontend Application
(function () {
  'use strict';

  // State Store
  const state = {
    token: localStorage.getItem('tasksphere_jwt') || null,
    user: null,
    filter: 'all', // 'all' | 'active' | 'completed'
    page: 1,
    limit: 5,
    totalPages: 1,
    totalItems: 0
  };

  // DOM Elements
  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const userProfile = document.getElementById('user-profile');
  const userBadge = document.getElementById('user-badge');
  const btnLogout = document.getElementById('btn-logout');

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authAlert = document.getElementById('auth-alert');

  const formCreateTodo = document.getElementById('form-create-todo');
  const todoTitle = document.getElementById('todo-title');
  const todoDesc = document.getElementById('todo-desc');

  const todoList = document.getElementById('todo-list');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const paginationSummary = document.getElementById('pagination-summary');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  const currentPageLabel = document.getElementById('current-page-label');

  // Metrics Elements
  const metricTotal = document.getElementById('metric-total');
  const metricCompleted = document.getElementById('metric-completed');
  const metricIncomplete = document.getElementById('metric-incomplete');
  const metricRate = document.getElementById('metric-rate');

  // API Client Helper
  async function apiCall(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(`/api/proxy${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.error || 'API Request failed');
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // Auth UI Helpers
  function showAlert(msg) {
    authAlert.textContent = msg;
    authAlert.className = 'alert alert-error';
    authAlert.classList.remove('hidden');
  }

  function hideAlert() {
    authAlert.classList.add('hidden');
  }

  function setAuthenticated(token, user) {
    state.token = token;
    state.user = user;
    if (token) {
      localStorage.setItem('tasksphere_jwt', token);
    } else {
      localStorage.removeItem('tasksphere_jwt');
    }

    renderView();
  }

  function renderView() {
    if (state.token && state.user) {
      authSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      userProfile.classList.remove('hidden');
      userBadge.textContent = `${state.user.username} (${state.user.email})`;

      fetchDashboardStats();
      fetchTodos();
    } else {
      authSection.classList.remove('hidden');
      dashboardSection.classList.add('hidden');
      userProfile.classList.add('hidden');
    }
  }

  // Dashboard Data Fetching
  async function fetchDashboardStats() {
    try {
      const res = await apiCall('/dashboard');
      if (res.success && res.data) {
        metricTotal.textContent = res.data.total;
        metricCompleted.textContent = res.data.completed;
        metricIncomplete.textContent = res.data.incomplete;
        metricRate.textContent = `${res.data.completionRate}%`;
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  }

  async function fetchTodos() {
    let url = `/todos?page=${state.page}&limit=${state.limit}`;
    if (state.filter === 'active') {
      url += '&completed=false';
    } else if (state.filter === 'completed') {
      url += '&completed=true';
    }

    try {
      const res = await apiCall(url);
      renderTodoList(res.data || []);
      renderPagination(res.pagination || {});
    } catch (err) {
      console.error('Failed to load todos:', err);
      if (err.status === 401) {
        setAuthenticated(null, null);
      }
    }
  }

  function renderTodoList(items) {
    todoList.innerHTML = '';

    if (!items.length) {
      todoList.innerHTML = `<div class="empty-state">No tasks found for current filter.</div>`;
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'todo-item';

      const main = document.createElement('div');
      main.className = 'todo-main';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = Boolean(item.completed);
      checkbox.addEventListener('change', () => toggleTodo(item._id, checkbox.checked));

      const textContainer = document.createElement('div');
      textContainer.className = 'todo-text';

      const title = document.createElement('span');
      title.className = `todo-title ${item.completed ? 'completed' : ''}`;
      title.textContent = item.title;

      textContainer.appendChild(title);
      if (item.description) {
        const desc = document.createElement('span');
        desc.className = 'todo-desc';
        desc.textContent = item.description;
        textContainer.appendChild(desc);
      }

      main.appendChild(checkbox);
      main.appendChild(textContainer);

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteTodo(item._id));

      actions.appendChild(deleteBtn);

      card.appendChild(main);
      card.appendChild(actions);

      todoList.appendChild(card);
    });
  }

  function renderPagination(meta) {
    state.totalPages = meta.totalPages || 1;
    state.totalItems = meta.total || 0;

    paginationSummary.textContent = `Showing page ${meta.page || 1} of ${state.totalPages} (${state.totalItems} total items)`;
    currentPageLabel.textContent = `Page ${meta.page || 1}`;

    btnPrevPage.disabled = state.page <= 1;
    btnNextPage.disabled = state.page >= state.totalPages;
  }

  // Mutation Handlers
  async function toggleTodo(id, newStatus) {
    try {
      await apiCall(`/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: newStatus })
      });
      fetchDashboardStats();
      fetchTodos();
    } catch (err) {
      alert(`Failed to update task: ${err.message}`);
      fetchTodos();
    }
  }

  async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await apiCall(`/todos/${id}`, {
        method: 'DELETE'
      });
      fetchDashboardStats();
      fetchTodos();
    } catch (err) {
      alert(`Failed to delete task: ${err.message}`);
    }
  }

  // Event Listeners: Tabs
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    hideAlert();
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
    hideAlert();
  });

  // Event Listeners: Login Submit
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setAuthenticated(res.data.token, res.data.user);
    } catch (err) {
      showAlert(err.message || 'Login failed');
    }
  });

  // Event Listeners: Register Submit
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
      const res = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });
      setAuthenticated(res.data.token, res.data.user);
    } catch (err) {
      showAlert(err.message || 'Registration failed');
    }
  });

  // Event Listeners: Create Todo Submit
  formCreateTodo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = todoTitle.value.trim();
    const description = todoDesc.value.trim();

    if (!title) return;

    try {
      await apiCall('/todos', {
        method: 'POST',
        body: JSON.stringify({ title, description })
      });
      todoTitle.value = '';
      todoDesc.value = '';
      fetchDashboardStats();
      fetchTodos();
    } catch (err) {
      alert(`Error creating task: ${err.message}`);
    }
  });

  // Event Listeners: Filters
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      state.page = 1;
      fetchTodos();
    });
  });

  // Event Listeners: Pagination
  btnPrevPage.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      fetchTodos();
    }
  });

  btnNextPage.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      fetchTodos();
    }
  });

  // Event Listeners: Logout
  btnLogout.addEventListener('click', () => {
    setAuthenticated(null, null);
  });

  // App Initialization: Attempt session restore
  async function init() {
    if (state.token) {
      try {
        const res = await apiCall('/auth/me');
        if (res.success && res.data) {
          setAuthenticated(state.token, res.data.user);
          return;
        }
      } catch (err) {
        console.warn('Session expired or invalid, signing out.');
      }
      setAuthenticated(null, null);
    } else {
      renderView();
    }
  }

  init();
})();
