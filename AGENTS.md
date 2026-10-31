# Repository Instructions

Todo app monorepo. `apps/web` is the React frontend. `services/api` is the Express/MongoDB backend. `packages/shared` holds Zod schemas both sides import. Turborepo + pnpm workspaces.

## How work proceeds

Ticket first. No branch, commit, or file change without a `TODO-###` key that exists in `docs/backlog/sprint-1.md`.

| Role | Command | Writes |
| --- | --- | --- |
| Product manager | `/backlog <idea>` | `docs/backlog/` |
| Tech lead | `/start TODO-###` | Brief only — no code |
| Implementer | default session | `apps/`, `services/`, `packages/` |
| Reviewer | `/review` | Nothing (read-only adversarial audit) |
| QA | `/qa TODO-###` | `docs/qa/` |
| Release manager | `/ship` | `CHANGELOG.md`, git tag |

## Invariants

1. Branch: `feat|fix|chore|hotfix/TODO-###-slug`, cut from `dev`, PR into `dev`. `main` only moves through a release merge from `dev`.
2. Commit: `type(scope): [TODO-###] summary`
3. Work inside the ticket's blast radius. Crossing it means stop and mint a dependent ticket.
4. Every endpoint change ships happy path, negative input, and authorization tests in the same commit.
5. `/review` must run before a PR — fresh session, never self-approve.
6. `/qa` must cite observed output. "Should work" is not evidence.
7. Secrets come from environment only — never add a fallback default.
8. Architectural decisions go in `docs/adr/`, not code comments.
9. Merge to `main` only through the release PR from `dev`, only after `/ship` passes.

## Local commands

```bash
pnpm install
node --test services/api/tests/**/*.test.js
node --test packages/shared/tests/**/*.test.js
```

## Package structure

- `packages/shared` — Zod schemas for validation (both sides import this)
- `services/api`   — Express + Mongoose API server
- `apps/web`       — React frontend (Vite)
