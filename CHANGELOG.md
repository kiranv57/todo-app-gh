# Changelog

All notable changes to the TaskSphere Todo Platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-31

### Added
- **Design System: Variable-Driven Design Tokens (`TODO-112`)**:
  - Implemented a 3-layer design token architecture in `apps/web/public/styles.css`.
  - Layer 1: `:root` base scales for spacing (`--space-2xs` to `--space-2xl`), fluid typography using `clamp()` (`--font-xs` to `--font-hero`), semantic colors, radius scale, and elevation shadows.
  - Layer 2: Mobile-first responsive variable cascade (`@media (min-width: 640px)`, `768px`, `1024px`) overriding layout tokens at each breakpoint without markup class spread.
  - Layer 3: Semantic consumer classes (`.app-layout`, `.surface-card`, `.metrics-grid`, `.btn-primary`) consuming CSS variables.
- **DevOps: CI/CD Pipeline & Layered Container Architecture (`TODO-113`)**:
  - **Pre-commit gate**: Created `scripts/pre-commit-gate.js` enforcing zero-leak credential checks, `.env.example` validation, and Docker hygiene before any commit is created.
  - **Pull-request CI gate**: Upgraded `.github/workflows/ci.yml` with package test suites (Stage 3), Dockerfile audits (Stage 4), and container certification (Stage 5: <150MB image budget & detached boot `/health` smoke test).
  - **Release gate**: Configured the release workflow on push to `main` with monorepo-wide integration verification and release image builds pinned to the Git commit SHA (`task-sphere-api:${{ github.sha }}`), rejecting floating `:latest` tags.
  - **Compose profiles**: Authored `docker-compose.yml` with a development profile (live volume bind-mounts, hot-reloading) and a production profile (pre-built images).
  - **Architecture documentation**: Authored `docs/architecture/0002-immutable-artifacts-and-ci-cd-pipeline.md` explaining Git object storage, dependency delta caching, OverlayFS container layers, and ephemeral runner lifecycles through the lens of immutable, content-addressed artifacts.

## [1.1.0] - 2026-10-31

### Added
- **Backend Architecture & Dependency Injection (`TODO-110`)**:
  - Classes (`UserRepository`, `TodoRepository`, `AuthService`, `TodoService`, `AuthController`, `TodoController`) eliminating module-level singleton state.
  - Composition Root (`createContainer`) assembling the dependency graph bottom-up with configurable storage instances for hermetic, state-leak-free test isolation.
  - Centralized Error Handling architecture (`services/api/src/errors/`, `services/api/src/middleware/errorHandler.js`) with typed `AppError` taxonomy (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`).
  - Elimination of fragmented route-level `try/catch` boilerplate via `asyncHandler`.
- **Frontend Reactive State Architecture (`TODO-111`)**:
  - **Store**: Observable store (`createStore`) with immutable snapshot reading and subscription listeners.
  - **Reducers**: Pure, synchronous state transformations (`auth`, `todos`, `dashboard`, `ui`) with no side effects.
  - **API client**: `createApiClient` with explicit `AbortController` cancellation signal integration on all endpoints.
  - **Action orchestrators**: `createActions` with in-flight `AbortController` request cancellation preventing out-of-order race conditions on rapid filter switching and pagination.
  - **Optimistic UI & rollbacks**: Immediate local task state updates with automated rollback (`TODO_ROLLBACK_TOGGLE`) on server failure.
  - **Rendering & event handling**: Declarative DOM rendering subscribed to store state, paired with thin event handlers extracting DOM data.

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
- **CI/CD Quality Gates & Containerization**:
  - Multi-stage Dockerfiles (`services/api/Dockerfile`, `apps/web/Dockerfile`) copying manifests before source code so dependency layers stay cached (`TODO-109`).
  - Rootless execution: production runner stages drop root; dedicated unprivileged user `apprunner` (UID 1001, GID 1001) with atomic `--chown` (`TODO-109`).
  - Signal handling: `tini` runs as PID 1 entrypoint for graceful shutdown and zombie process harvesting (`TODO-109`).
  - Automated audit script `scripts/check-docker-hygiene.js` enforcing CIS Docker Benchmarks and layer caching invariants (`TODO-109`).
  - Docker smoke test gate (`scripts/docker-smoke.sh`): builds the image, polls `/health`, asserts non-root execution, and cleans up (`TODO-109`).
  - Two-stage CI pipeline with concurrency throttling (`cancel-in-progress: true`) and a fast validation → heavy release waterfall (`TODO-108`, `TODO-109`).

### Security
- Password hashes are never returned by any endpoint.
- Constant-time password and token signature comparisons preventing side-channel timing attacks.
- Strict multi-tenant isolation enforced at the repository layer.
