# Changelog

All notable changes to the TaskSphere Todo Platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-31

### Added
- **Backend Architecture & DI Composition Root (`TODO-110`)**:
  - Container Blueprints (`UserRepository`, `TodoRepository`, `AuthService`, `TodoService`, `AuthController`, `TodoController`) eliminating module-level singleton state.
  - Composition Root (`createContainer`) assembling the dependency graph bottom-up with configurable storage instances for hermetic, state-leak-free test isolation.
  - Centralized Error Handling architecture (`services/api/src/errors/`, `services/api/src/middleware/errorHandler.js`) with typed `AppError` taxonomy (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`).
  - Elimination of fragmented route-level `try/catch` boilerplate via `asyncHandler`.
- **Frontend 6-Tier Reactive Architecture (`TODO-111`)**:
  - **Tier 1 (Store)**: Observable Store blueprint (`createStore`) with immutable snapshot reading and subscription listeners.
  - **Tier 2 (Reducers)**: Pure, synchronous state transformation reducers (`auth`, `todos`, `dashboard`, `ui`) with no-backend side-effect isolation.
  - **Tier 3 (Async Boundary)**: API client (`createApiClient`) with explicit `AbortController` cancellation signal integration on all endpoints.
  - **Tier 4 (Actions & Hooks)**: Stateful action orchestrators (`createActions`) with in-flight `AbortController` request cancellation preventing out-of-order race conditions on rapid filter switching and pagination.
  - **Optimistic UI & Rollbacks**: Immediate local task state updates with automated rollback (`TODO_ROLLBACK_TOGGLE`) on server failure.
  - **Tier 5 & 6 (UI Projection & Explicit Triggers)**: Declarative DOM rendering subscribed to store state, paired with thin event handlers extracting DOM data.

## [1.0.0] - 2026-10-31

### Added
- **Architecture & Contracts**:
  - `docs/adr/0001-stack-decisions.md`: Documented MongoDB and Dual-Token JWT strategy with rollback path (`TODO-100`).
  - `@repo/shared`: Zod schemas for user authentication (`registerSchema`, `loginSchema`), todo CRUD (`createTodoSchema`, `updateTodoSchema`), filtering & pagination (`todoFilterSchema`), and standardized response envelopes (`TODO-101`).
- **Backend API (`services/api`)**:
  - User authentication with salted key derivation (`crypto.scryptSync`), timing-safe password verification, and JWT bearer token issuance (`TODO-102`).
  - Strict zero-fallback secret invariant: API boot fails immediately if `JWT_SECRET` is unset (`TODO-102`).
  - Todo data model and repository with compound indexing `{ owner: 1, completed: 1, createdAt: -1 }` (`TODO-103`).
  - Insecure Direct Object Reference (IDOR) defense: mutating or fetching another user's task strictly returns 403 Forbidden (`TODO-103`, `TODO-104`).
  - Bounded pagination and completion status filtering (`completed=true/false`) (`TODO-105`).
  - Dashboard aggregate statistics endpoint (`/api/dashboard`) computing total, completed, incomplete, and completion rate velocity (`TODO-105`).
- **Web Frontend (`apps/web`)**:
  - Enterprise single-page application dashboard with real-time metric cards, inline task creation, checkmark toggling, deletion confirmation, and filter tabs (`TODO-106`, `TODO-107`).
  - Session recovery and protected route handling (`TODO-106`).
- **CI/CD Quality Gates & Docker Physics**:
  - Multi-stage Dockerfiles (`services/api/Dockerfile`, `apps/web/Dockerfile`) implementing the Layer Cache Invariant (manifests copied before source code) (`TODO-109`).
  - Kernel escape protection: Production runner stages drop root; dedicated unprivileged user `apprunner` (UID 1001, GID 1001) with atomic `--chown` (`TODO-109`).
  - Signal physics: `tini` configured as PID 1 entrypoint for graceful shutdown and zombie process harvesting (`TODO-109`).
  - Automated gatekeeper script `scripts/check-docker-hygiene.js` enforcing CIS Docker Benchmarks and layer invariants (`TODO-109`).
  - Docker Smoke Test gate (`scripts/docker-smoke.sh`) implementing the LibreChat pattern: builds image, polls `/health`, asserts non-root execution, and cleanly unmounts (`TODO-109`).
  - Two-stage CI pipeline with FinOps concurrency throttling (`cancel-in-progress: true`) and Fast Runner $\rightarrow$ Heavy VM waterfall (`TODO-108`, `TODO-109`).

### Security
- Password hashes are never returned by any endpoint.
- Constant-time password and token signature comparisons preventing side-channel timing attacks.
- Strict multi-tenant isolation enforced at the repository layer.
