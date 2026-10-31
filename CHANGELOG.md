# Changelog

All notable changes to the TaskSphere Todo Platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **CI/CD Quality Gates**:
  - Multi-lane GitHub Actions workflow running contracts, API, and web test suites on pull requests targeting `dev` or `main` (`TODO-108`).

### Security
- Password hashes are never returned by any endpoint.
- Constant-time password and token signature comparisons preventing side-channel timing attacks.
- Strict multi-tenant isolation enforced at the repository layer.
