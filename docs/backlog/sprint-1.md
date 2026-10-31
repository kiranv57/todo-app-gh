# Sprint 1 Backlog

Two-week sprint. One developer plus agent execution. Committed work is 70% of capacity; 30% reserved for review, QA, and hotfixes.

Conventions: keys are stable, never renumbered. Points are Fibonacci; 8 means split. Every ticket lists its blast radius so parallel branches cannot collide.

---

## TODO-100 — Persistence & Tooling Decision (Spike)

- Type: spike, time-boxed to 1 point, half-day
- Story: As the platform owner, I want a documented technology decision so the stack is agreed before code is written.
- Blast radius: `docs/adr/` only
- Out of scope: any application code
- AC:
  - [x] ADR documents MongoDB (Mongoose) as the storage engine with rationale.
  - [x] ADR documents JWT (access token 15m + refresh token 7d) as the auth strategy.
  - [x] ADR names the rollback path if the choice proves wrong.
  - [x] Status is Accepted and linked from TODO-102.
- Output: `docs/adr/0001-stack-decisions.md`

---

## TODO-101 — Freeze the Shared API Contract (Ticket 0)

- Type: story, 2 points
- Story: As a client developer, I want frozen Zod schemas for auth and todo shapes so the API and UI can be built in parallel without contract drift.
- Blast radius: `packages/shared/`
- Out of scope: route handlers, Mongoose models, UI components
- AC:
  - [x] Auth schemas: `registerSchema` (username, email, password), `loginSchema` (email, password).
  - [x] Todo schemas: `createTodoSchema` (title, description?), `updateTodoSchema` (title?, description?, completed?), `todoFilterSchema` (completed?, page, limit).
  - [x] Response envelopes: `successResponseSchema`, `errorResponseSchema`, `paginationMetaSchema`.
  - [x] All schemas exported from `packages/shared/src/index.js`.
  - [x] Unit tests cover valid inputs, invalid inputs, and boundary values.
- Blocks: TODO-102, TODO-103, TODO-104, TODO-105

---

## TODO-102 — Auth Backend (Register, Login, JWT)

- Type: story, 5 points
- Story: As a user, I want to register and log in so I have a personal account that owns my todos.
- Blast radius: `services/api/src/routes/auth.js`, `services/api/src/controllers/authController.js`, `services/api/src/services/authService.js`, `services/api/src/models/User.js`, `services/api/src/middleware/auth.js`, `services/api/tests/auth.test.js`
- Out of scope: todo CRUD, refresh token rotation, password reset
- Depends on: TODO-101
- AC:
  - [x] `POST /api/auth/register` creates a user with hashed password; returns 201 with JWT.
  - [x] Duplicate email returns 409. Duplicate username returns 409.
  - [x] `POST /api/auth/login` returns JWT on valid credentials; 401 on invalid.
  - [x] Password hash is never returned by any endpoint.
  - [x] `GET /api/auth/me` returns the authenticated user; 401 without valid JWT.
  - [x] Service boots and rejects start if `JWT_SECRET` env var is unset.
  - [x] Tests cover happy path, invalid credentials, duplicate registration, missing token.

---

## TODO-103 — Todo Data Model & Repository Layer

- Type: story, 3 points
- Story: As a developer, I want a clean Mongoose model and repository layer for todos so the controller never touches the database directly.
- Blast radius: `services/api/src/models/Todo.js`, `services/api/src/services/todoService.js`, `services/api/tests/todo-service.test.js`
- Out of scope: HTTP routes, auth middleware, frontend
- Depends on: TODO-101, TODO-102 (needs User model for owner reference)
- AC:
  - [x] Todo model has: `title` (string, required), `description` (string, optional), `completed` (boolean, default false), `owner` (ObjectId ref User, required), `createdAt`, `updatedAt`.
  - [x] Repository functions: `createTodo`, `getTodosByOwner`, `getTodoById`, `updateTodo`, `deleteTodo`.
  - [x] `getTodosByOwner` accepts a `filter` object (`completed?: boolean`) and pagination (`page`, `limit`).
  - [x] Ownership is enforced: any mutation function that takes an `ownerId` rejects if `todo.owner !== ownerId`.
  - [x] Unit tests cover create, list with filter, update, delete, and ownership mismatch (403).

---

## TODO-104 — Todo CRUD API Routes

- Type: story, 3 points
- Story: As an authenticated user, I want to create, read, update, and delete my todos via the API.
- Blast radius: `services/api/src/routes/todos.js`, `services/api/src/controllers/todoController.js`, `services/api/tests/todo-routes.test.js`
- Out of scope: filter/pagination endpoint (TODO-105), frontend, dashboard stats
- Depends on: TODO-103
- AC:
  - [x] `POST /api/todos` creates a todo owned by the authenticated user; 401 without token.
  - [x] `GET /api/todos` returns paginated list of the authenticated user's todos only.
  - [x] `GET /api/todos/:id` returns a single todo; 404 if not found; 403 if owned by another user.
  - [x] `PATCH /api/todos/:id` updates allowed fields; 403 if owned by another user.
  - [x] `DELETE /api/todos/:id` deletes; 403 if owned by another user.
  - [x] Invalid body returns 400 with structured field-level issues (from shared schema).
  - [x] Tests cover happy path, auth guard (401), ownership guard (403), and invalid input (400).

---

## TODO-105 — Filter & Dashboard Stats Endpoint

- Type: story, 3 points
- Story: As a user, I want to filter my todos by completion status and see a dashboard summary of my task counts.
- Blast radius: `services/api/src/routes/todos.js` (add query params to GET), `services/api/src/controllers/todoController.js` (add stats action), `services/api/tests/todo-filter.test.js`
- Out of scope: frontend rendering, auth changes
- Depends on: TODO-104
- AC:
  - [x] `GET /api/todos?completed=true` returns only completed todos for the authenticated user.
  - [x] `GET /api/todos?completed=false` returns only incomplete todos.
  - [x] `GET /api/todos?page=2&limit=5` returns correct page slice with pagination metadata.
  - [x] `GET /api/dashboard` returns `{ total, completed, incomplete, completionRate }` for the authenticated user.
  - [x] Invalid `completed` value (not `true`/`false`) returns 400.
  - [x] Tests cover each filter combination, pagination, and dashboard stats.

---

## TODO-106 — React Frontend: Auth Pages

- Type: story, 5 points
- Story: As a visitor, I want to register and log in via a clean UI so I can access my personal todo dashboard.
- Blast radius: `apps/web/src/pages/`, `apps/web/src/components/`, `apps/web/src/store/`, `apps/web/src/hooks/`, `apps/web/src/lib/`
- Out of scope: todo list UI (TODO-107), filter controls, dashboard stats panel
- Depends on: TODO-102 (API must be up)
- AC:
  - [x] Register page: username, email, password fields; validates with shared Zod schemas client-side.
  - [x] Login page: email, password fields; validates client-side.
  - [x] On successful auth, JWT stored in `httpOnly`-simulated in-memory store (not localStorage); user redirected to `/dashboard`.
  - [x] On failed auth, inline error message displayed without page reload.
  - [x] Protected route wrapper: unauthenticated users redirected to `/login`.
  - [x] Auth state persisted across page refresh via `/api/auth/me` call on app mount.

---

## TODO-107 — React Frontend: Todo Dashboard & Filter UI

- Type: story, 5 points
- Story: As an authenticated user, I want to see, create, edit, delete, and filter my todos from a dashboard.
- Blast radius: `apps/web/src/pages/Dashboard.jsx`, `apps/web/src/components/Todo*.jsx`, `apps/web/src/hooks/useTodos.js`, `apps/web/src/store/todoStore.js`
- Out of scope: auth pages (TODO-106), backend, optimistic UI rollback (separate ticket)
- Depends on: TODO-104, TODO-105, TODO-106
- AC:
  - [x] Dashboard shows count cards: Total, Completed, Incomplete, Completion Rate (from `/api/dashboard`).
  - [x] Todo list renders all todos with title, description, completed badge, created date, and edit/delete actions.
  - [x] Filter tabs: All / Active / Completed — updates the list in-place without full page reload.
  - [x] Create todo form: inline form with title and optional description; optimistic add with rollback on failure.
  - [x] Toggle completed: clicking the checkbox calls `PATCH /api/todos/:id` and updates the UI immediately.
  - [x] Delete: confirmation before calling `DELETE /api/todos/:id`; removes from list on success.
  - [x] Pagination controls visible when total > limit.

---

## TODO-108 — CI Gate: Lint + Test Pipeline

- Type: chore, 2 points
- Story: As a maintainer, I want a GitHub Actions workflow that blocks merges when tests or lint fail.
- Blast radius: `.github/workflows/ci.yml`, root tooling configs
- Out of scope: deployment, Docker
- AC:
  - [x] CI runs on every PR targeting `dev` or `main`.
  - [x] CI runs `node --test` for `packages/shared` and `services/api` independently.
  - [x] CI fails the build if any test fails.
  - [x] CI runs prettier check; fails if formatting is inconsistent.

---

## TODO-109 — Docker Containerization & CI Runner Physics

- Type: chore, 3 points
- Story: As an SRE, I want production-grade multi-stage Dockerfiles and a two-stage CI gating pipeline so containers run safely without root privileges and builds execute with optimal layer caching.
- Blast radius: `.dockerignore`, `services/api/Dockerfile`, `apps/web/Dockerfile`, `scripts/`, `.github/workflows/ci.yml`
- Out of scope: application business logic, shared contracts, React components
- AC:
  - [x] `.dockerignore` prevents local incubator leaks (`node_modules`, `.git`, `.env*`, test logs).
  - [x] Multi-stage Dockerfiles implement the Layer Cache Invariant (manifests copied before source code).
  - [x] Production runner stages drop root: dedicated `apprunner` (UID 1001, GID 1001) created and switched to via `USER`.
  - [x] Atomic file ownership via `COPY --chown=apprunner:nodejs`.
  - [x] PID 1 zombie signal handling configured via `tini`.
  - [x] Automated gatekeeper script `scripts/check-docker-hygiene.js` verifies non-root user and layer order.
  - [x] Docker smoke test pattern script `scripts/docker-smoke.sh` verifies boot and `/health` probe.
  - [x] GitHub Actions CI workflow upgraded with concurrency throttling and 2-stage fast/heavy runner waterfall.
