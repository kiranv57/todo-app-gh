# ADR 0001: Technology Stack & Persistence Architecture

**Status**: Accepted  
**Date**: 2026-10-31  
**Deciders**: Platform Lead, Architecture Squad  
**Links**: `TODO-102`, `TODO-103`

---

## 1. Context & Problem Statement

The platform requires a persistent data store for user-owned tasks and an identity verification mechanism. The system must support flexible document schemas (tags, metadata, nested completion events) while providing strict per-user tenant isolation to eliminate Insecure Direct Object References (IDOR).

---

## 2. Decision: MongoDB + Mongoose & Dual-Token JWT

### Persistence: MongoDB (via Mongoose)
- **Rationale**:
  - Tasks in personal productivity have polymorphic metadata (subtasks, future recurrence rules, flexible priority attributes).
  - MongoDB's BSON structure maps directly to JSON API transport shapes without impedance mismatch.
  - Compound indexes on `{ owner: 1, completed: 1, createdAt: -1 }` enable sub-millisecond filtered queries even as volume scales.
- **Connection Strategy**:
  - Connection pooling with `maxPoolSize: 50` and graceful shutdown handlers on `SIGINT`/`SIGTERM`.
  - For development and automated testing environments, support connection to local instance or in-memory runner (`mongodb-memory-server` / fallback memory store).

### Authentication: Dual-Token JWT (Signed via HMAC-SHA256)
- **Access Token**: Short-lived (15 minutes), containing `{ sub: user._id, email: user.email }`. Transmitted via `Authorization: Bearer <token>`.
- **Refresh Token**: Long-lived (7 days), stored securely and revocable.
- **Zero Fallback Secret Invariant**: `JWT_SECRET` must be injected via environment. Boot sequence terminates immediately if `process.env.JWT_SECRET` is unset.

---

## 3. Consequences

### Positive:
- High write throughput for rapid task updates and toggle states.
- Clean JSON interchange across client and server.
- Decoupled stateless authentication eliminates sticky sessions and scales horizontally across multiple API container instances.

### Negative / Trade-offs:
- Lack of multi-document ACID transactions across un-sharded collections unless using replica sets.
- Strict schema enforcement must be managed at the application layer via Mongoose schemas + Zod boundary contracts.

---

## 4. Rollback Plan

If relational constraints (e.g. cross-organization audit tables) are required in the future:
1. The repository pattern (`services/api/src/services/todoService.js`) abstracts database queries from Express route controllers.
2. The data layer can be migrated to PostgreSQL via Prisma ORM by swapping repository adapter implementations without touching API contracts or UI components.
