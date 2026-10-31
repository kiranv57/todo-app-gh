# QA Evidence Record: [TODO-110] Backend Containerised Architecture, DI & Centralized Error Handling

**Ticket:** TODO-110  
**Title:** Refactor Backend to Container Blueprints, Composition Root DI, and Centralized Error Handling  
**Date:** 2026-10-31  
**Target Environment:** Node.js v24.21.0 / Express 5.x / Linux  
**Status:** PASS  

---

## 1. Scope of Implementation
1. **Container Blueprints (`UserRepository`, `TodoRepository`, `AuthService`, `TodoService`, `AuthController`, `TodoController`)**:
   - Eliminated module-level mutable singleton storage traps.
   - Enforced constructor Dependency Injection (`#store`, `#userRepo`, `#todoRepo`, `#jwtSecret`).
   - Clean class blueprints instantiated at the Composition Root.
2. **Composition Root (`services/api/src/container.js`)**:
   - `createContainer(options)` assembles the dependency graph bottom-up.
   - Strict Zero-Fallback Secret Discipline (`getEnv().JWT_SECRET`).
   - Supports isolated storage instances (`isolated: true`) for hermetic, deterministic testing without inter-test state leaks.
3. **Application Factory (`services/api/src/app.js`)**:
   - `createApp(container)` parameterizes routes with container-injected controllers.
   - Standardizes route registration via `createAuthRouter` and `createTodoRouter`.
4. **Centralized Error Handling Architecture (`services/api/src/errors/`, `services/api/src/middleware/errorHandler.js`)**:
   - Replaced fragmented controller-level `try/catch` boilerplate with `asyncHandler`.
   - Domain typed error hierarchy: `AppError`, `ValidationError` (with structured issues array), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409).
   - Uniform error response envelope: `{ success: false, error: string, code: string, issues?: array }`.

---

## 2. Verification Battery

### Test Execution Command
```bash
JWT_SECRET="test-secret-key-32-bytes-long-super-secure" node --test 'tests/**/*.test.js'
```

### Observed Output
```
✔ TODO-102: Health Check (34.707776ms)
▶ TODO-102: Authentication & Identity Flow
  ✔ POST /api/auth/register - happy path (70.341917ms)
  ✔ POST /api/auth/register - duplicate email returns 409 Conflict (47.644916ms)
  ✔ POST /api/auth/register - duplicate username returns 409 Conflict (48.273065ms)
  ✔ POST /api/auth/register - invalid email returns 400 with structured issues (6.440792ms)
  ✔ POST /api/auth/login - valid credentials returns JWT (69.025088ms)
  ✔ POST /api/auth/login - wrong password returns 401 Unauthorized (49.176405ms)
  ✔ GET /api/auth/me - without token returns 401 Unauthorized (5.705789ms)
  ✔ GET /api/auth/me - with valid token returns current user (11.472764ms)
  ✔ Zero-Fallback Secret Invariant - throws on unset JWT_SECRET (1.522064ms)
✔ TODO-102: Authentication & Identity Flow (312.597575ms)
▶ TODO-110: Container Blueprints, Dependency Injection & Composition Root Isolation
  ✔ Containers possess strictly isolated storage instances (1.648065ms)
  ✔ Domain Services and Controllers correctly receive injected dependencies (46.047315ms)
  ✔ createApp accepts custom container for clean isolated HTTP testing (101.237023ms)
✔ TODO-110: Container Blueprints, Dependency Injection & Composition Root Isolation (150.853314ms)
▶ TODO-110: Centralized Error Middleware & AppError Taxonomy
  ✔ ValidationError serializes structured issues array (8.203244ms)
  ✔ ConflictError returns HTTP 409 CONFLICT (106.772448ms)
  ✔ UnauthorizedError returns HTTP 401 UNAUTHORIZED (10.360859ms)
  ✔ Route not found returns HTTP 404 NOT_FOUND (4.126037ms)
✔ TODO-110: Centralized Error Middleware & AppError Taxonomy (131.898092ms)
▶ TODO-103, 104, 105: Full Todo Lifecycle, Authorization, Filtering & Dashboard Suite
  ✔ Setup: Register User A & User B (142.408326ms)
  ✔ POST /api/todos - unauthenticated rejected with 401 (4.351651ms)
  ✔ POST /api/todos - User A creates todos (happy path) (9.055051ms)
  ✔ POST /api/todos - rejects invalid body (empty title) (5.369883ms)
  ✔ GET /api/todos - User A lists own todos (6.817655ms)
  ✔ GET /api/todos - User B sees empty list (tenant isolation) (4.157645ms)
  ✔ IDOR Guard: User B cannot access User A todo (403 Forbidden) (4.919909ms)
  ✔ IDOR Guard: User B cannot update User A todo (403 Forbidden) (6.340454ms)
  ✔ IDOR Guard: User B cannot delete User A todo (403 Forbidden) (3.474978ms)
  ✔ PATCH /api/todos/:id - User A updates todo to completed (3.487228ms)
  ✔ GET /api/todos?completed=true - filters completed items (3.768851ms)
  ✔ GET /api/todos?completed=false - filters incomplete items (3.294179ms)
  ✔ GET /api/todos?completed=invalid - rejects invalid filter with 400 (3.932622ms)
  ✔ GET /api/todos?page=1&limit=1 - respects pagination bounds (3.141614ms)
  ✔ GET /api/dashboard - returns accurate task summary metrics (4.891309ms)
  ✔ DELETE /api/todos/:id - User A deletes todo (6.39211ms)
✔ TODO-103, 104, 105: Full Todo Lifecycle, Authorization, Filtering & Dashboard Suite (221.292998ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 711.904427
```

---

## 3. Production Readiness Sign-off
- **Architectural Isolation**: Passed. Multiple containers operate completely independently without cross-tenant memory corruption.
- **Error Propagation**: Passed. Domain exceptions flow into `errorHandler` middleware producing deterministic JSON responses.
- **Backwards Compatibility**: Passed. Existing test suites pass seamlessly without regression.
