/**
 * Enterprise TaskSphere Client Application
 * Follows 6-Tier Reactive State Architecture:
 * - Tier 1: State Storage & Exposure (store.js)
 * - Tier 2: Business Logic & Pure Reducer (reducer.js)
 * - Tier 3: Async Boundary & AbortController Signal Shielding (api.js)
 * - Tier 4: Custom Hooks / Stateful Action Orchestrators (actions.js)
 * - Tier 5: Event Handlers (Explicit DOM triggers)
 * - Tier 6: Declarative UI Projection (Subscribing to Store)
 * Session Storage Token Key: tasksphere_jwt
 */
(function () {
  'use strict';

  const { createStore, rootReducer, createApiClient, createActions, ActionTypes } = window.TaskSphere;

  // Tier 1 & Composition Root for Client
  const store = createStore(rootReducer);
  const api = createApiClient();
  const actions = createActions({
    store,
    api,
    ActionTypes,
    storage: localStorage
  });

  // Expose on window for integration and end-to-end auditability
  window.TaskSphere.storeInstance = store;
  window.TaskSphere.actionsInstance = actions;

  // DOM References
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

  const metricTotal = document.getElementById('metric-total');
  const metricCompleted = document.getElementById('metric-completed');
  const metricIncomplete = document.getElementById('metric-incomplete');
  const metricRate = document.getElementById('metric-rate');

  // =========================================================================
  // Tier 6: Declarative UI Projection (Pure function of State)
  // =========================================================================
  function render(state) {
    // 1. Auth Section vs Dashboard Visibility
    const isAuthenticated = state.auth.status === 'authenticated' && Boolean(state.auth.user);

    if (isAuthenticated) {
      authSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      userProfile.classList.remove('hidden');
      userBadge.textContent = `${state.auth.user.username} (${state.auth.user.email})`;
    } else {
      authSection.classList.remove('hidden');
      dashboardSection.classList.add('hidden');
      userProfile.classList.add('hidden');
    }

    // 2. Alert Rendering
    if (state.ui.alert) {
      authAlert.textContent = state.ui.alert.message || state.ui.alert;
      authAlert.className = `alert alert-${state.ui.alert.type || 'error'}`;
      authAlert.classList.remove('hidden');
    } else {
      authAlert.classList.add('hidden');
    }

    // 3. Tab State
    if (state.ui.activeTab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
    }

    // 4. Metrics Projection
    const stats = state.dashboard.stats;
    metricTotal.textContent = stats.total;
    metricCompleted.textContent = stats.completed;
    metricIncomplete.textContent = stats.incomplete;
    metricRate.textContent = `${stats.completionRate}%`;

    // 5. Filter Buttons Projection
    filterButtons.forEach((btn) => {
      if (btn.dataset.filter === state.todos.filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 6. Pagination Controls Projection
    paginationSummary.textContent = `Showing page ${state.todos.page} of ${state.todos.totalPages} (${state.todos.total} total items)`;
    currentPageLabel.textContent = `Page ${state.todos.page}`;
    btnPrevPage.disabled = state.todos.page <= 1;
    btnNextPage.disabled = state.todos.page >= state.todos.totalPages;

    // 7. Todo List Items Projection
    renderTodoList(state.todos.items);
  }

  function renderTodoList(items) {
    todoList.innerHTML = '';

    if (!items || items.length === 0) {
      todoList.innerHTML = `<div class="empty-state">No tasks found for current filter.</div>`;
      return;
    }

    items.forEach((item) => {
      const itemId = item._id || item.id;
      const card = document.createElement('div');
      card.className = 'todo-item';

      const main = document.createElement('div');
      main.className = 'todo-main';

      // Explicit Trigger: Checkbox Toggle
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = Boolean(item.completed);
      checkbox.addEventListener('change', () => {
        actions.toggleTodo(itemId, item.completed);
      });

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

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'todo-actions';

      // Explicit Trigger: Delete Task
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this task?')) {
          actions.deleteTodo(itemId);
        }
      });

      actionsDiv.appendChild(deleteBtn);

      card.appendChild(main);
      card.appendChild(actionsDiv);
      todoList.appendChild(card);
    });
  }

  // =========================================================================
  // Tier 5: Event Handlers (Explicit Triggers grabbing data from DOM events)
  // =========================================================================

  // Auth Tab Navigation Triggers
  tabLogin.addEventListener('click', () => actions.setTab('login'));
  tabRegister.addEventListener('click', () => actions.setTab('register'));

  // Login Form Submission Trigger
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    actions.clearAlert();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    await actions.login({ email, password });
  });

  // Register Form Submission Trigger
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    actions.clearAlert();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    await actions.register({ username, email, password });
  });

  // Create Todo Submission Trigger
  formCreateTodo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = todoTitle.value.trim();
    const description = todoDesc.value.trim();

    if (!title) return;

    await actions.createTodo({ title, description });
    todoTitle.value = '';
    todoDesc.value = '';
  });

  // Filter Buttons Trigger
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      actions.setFilter(btn.dataset.filter);
    });
  });

  // Pagination Triggers
  btnPrevPage.addEventListener('click', () => {
    const { page } = store.getState().todos;
    if (page > 1) actions.setPage(page - 1);
  });

  btnNextPage.addEventListener('click', () => {
    const { page, totalPages } = store.getState().todos;
    if (page < totalPages) actions.setPage(page + 1);
  });

  // Logout Trigger
  btnLogout.addEventListener('click', () => {
    actions.logout();
  });

  // =========================================================================
  // Reactive Loop Attachment & Hydration
  // =========================================================================
  store.subscribe(() => {
    render(store.getState());
  });

  // Initial render with blank/initial state
  render(store.getState());

  // Attempt automatic session restore from persisted JWT token
  actions.restoreSession();
})();
