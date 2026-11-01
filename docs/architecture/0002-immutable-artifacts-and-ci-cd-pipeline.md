# Architecture Record: Immutable Content-Addressed Artifacts & the CI/CD Pipeline

**Status:** Accepted

---

## 1. The Core Axiom: Nothing Mutates in Place

In modern software engineering, files and binaries do not "change." Instead:
1. **The Payload**: Data is written into immutable, content-addressed blocks on disk. Once written, their bytes are concrete, immutable, and read-only forever.
2. **The Name (Pointer)**: Directory tables, Git branches (`main`, `dev`), build caches, and container tags are lightweight **mutable pointers** referencing specific immutable, content-addressed blocks.

```
┌────────────────────────────────────────────────────────────────────────┐
│ NAME / POINTER (Mutable dictionary entry)                              │
│ "main"  |  "dev"  |  "v1.1.0"  |  Cache Key: [sha256-hash]             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (points to)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ IMMUTABLE ARTIFACT (Permanent, content-addressed data payload)         │
│ - Object #418290: [0x8A1, 0x8A2] ── "export const authService..."      │
│ - Never altered. Never overwritten. Read-only forever.                 │
└────────────────────────────────────────────────────────────────────────┘
```

When code is edited, a bundle built, or a container updated, the system **never mutates an existing artifact**. It writes a **brand-new immutable artifact** and slides the pointer to reference it. The predecessor artifact simply becomes immutable history or reusable cache.

---

## 2. The 4 Layers of Immutable-Artifact Behavior in TaskSphere

### Layer 1: Code Editing & Git Version Tracking
- Git is not an abstract "diff tracker"—it is a content-addressed object database stored inside `.git/objects/`.
- Every `git commit` freezes a **tree object** (a mapping of file paths to blob hashes) wrapped in a **commit object** (metadata pointing to the tree and parent commit).
- Branch pointers (`dev`, `main`) simply slide across immutable commit objects. Fast-forward merges move the pointer without rewriting history.

### Layer 2: Compilers, Bundlers, and Turborepo Delta Caching
- Compilers are transforms converting source files into runnable output artifacts:
  $$\text{Input Files (Source)} \xrightarrow{\text{Turborepo / Compiler}} \text{Output Artifacts (Binaries / JS / CSS)}$$
- Turborepo calculates a hash of the package directory's inputs.
- **Cache Hit**: If input hashes are unchanged, compilation is bypassed (0ms), and pre-compiled outputs are hardlinked.
- **Cache Miss (Delta)**: Turborepo compiles only the changed package, producing a new output artifact assembled alongside cached ones.

### Layer 3: Docker & OverlayFS Container Layering
- Docker containers are literally **hierarchical stacks of read-only immutable layers** mounted together using Linux `OverlayFS`:
  ```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ CONTAINER LAYER (Read-Write scratchpad for running app)              │
  ├──────────────────────────────────────────────────────────────────────┤
  │ LAYER 3: App Code (services/api, apps/web)                           │
  ├──────────────────────────────────────────────────────────────────────┤
  │ LAYER 2: Dependency Layer (node_modules, pnpm store)                 │
  ├──────────────────────────────────────────────────────────────────────┤
  │ LAYER 1: Base OS & Runtime (node:22-alpine, /sbin/tini)              │
  └──────────────────────────────────────────────────────────────────────┘
  ```
- **Layer caching invariant**: Because Docker hashes each layer's contents from top to bottom, manifests (`package.json`, `pnpm-workspace.yaml`) are copied **before** source code. Modifying business logic invalidates only Layer 3, keeping Layers 1 and 2 reusable from cache.

### Layer 4: The Ephemeral Cloud Runner Lifecycle
- Cloud runners (GitHub Actions) spin up and tear down at near-zero disk I/O overhead because base OS images (Ubuntu) and language runtimes (Node.js) exist as **pre-built, read-only artifacts on host storage**.
- Spinning up a runner simply creates a thin, empty temporary overlay directory on top of the frozen base artifacts.
- When the CI job completes, wiping the temporary directory destroys the environment in milliseconds without moving or copying host data.

---

## 3. Container Image Structure (Six-Step Build Convention)

Every infrastructure artifact in this repository (Dockerfiles, Docker Compose, CI workflows) follows this six-step build structure:

| Step # | Action | Physical Reality in TaskSphere | Characteristic |
| :---: | :--- | :--- | :--- |
| **[1]** | **Select OS** | `node:22-alpine` userland (MB without kernel) | Frozen base layer |
| **[2]** | **Install Runtime** | Node.js v22 + `tini` PID 1 supervisor | Frozen binary artifacts |
| **[3]** | **Create Folder & Perms** | `/app`, unprivileged user `apprunner:nodejs` (UID 1001) | Ownership permissions |
| **[4]** | **Ingest Code** | Copy manifests first (`deps`), then code (`builder`) | Delta blobs (Active Delta) |
| **[5]** | **Configure Env** | `NODE_ENV=production`, `PORT=5000`, no-fallback `JWT_SECRET` | Environment metadata |
| **[6]** | **Execute Run** | `ENTRYPOINT ["/sbin/tini", "--"]`, `CMD ["node", "src/server.js"]` | Active running process |

---

## 4. The Three-Phase Sequential CI/CD Pipeline

```
+-----------------------------------------------------------------------------------------------------------+
|                                  THREE-PHASE SEQUENTIAL CI/CD PIPELINE                                                     |
+-----------------------------------------------------------------------------------------------------------+
|                                                                                                           |
|  [ PHASE A: git commit (pre-commit gate - scripts/pre-commit-gate.js) ]                                   |
|    ├── Stage 1: Fast formatting & schema verification (Prettier & JSON grammar)                           |
|    └── Stage 2: Commit blockers (<1s hard abort on leaked secrets, .env files, or Docker flaws)           |
|         │                                                                                                 |
|         ▼ (Unlocks ONLY when the local commit is 100% clean)                                              |
|                                                                                                           |
|  [ PHASE B: git push (pull-request cloud gate - .github/workflows/ci.yml) ]                               |
|    ├── Stage 3: Runner ingestion & package test suites (Turborepo + Contracts/API/Web suites)             |
|    ├── Stage 4: Dockerfile hygiene gates (check-docker-hygiene.js strict CIS Benchmark audit)             |
|    └── Stage 5: Container certification (<150MB size budget & detached /health smoke test)                |
|         │                                                                                                 |
|         ▼ (Unlocks ONLY when the PR turns 100% green and is approved)                                     |
|                                                                                                           |
|  [ PHASE C: git merge into main (integration & release gate) ]                                            |
|    ├── Stage 6: Full integration matrix (monorepo end-to-end regression validation)                       |
|    └── Stage 7: Release image build (pinned to ${{ github.sha }}, strictly BANS :latest)                  |
|                                                                                                           |
+-----------------------------------------------------------------------------------------------------------+
```

### The Immutable Release Rule
Deploying unpinned tags like `:latest` in production is an architectural defect because `:latest` mutates over time, destroying reproducibility. Phase C enforces that production artifacts are built, tagged, and released strictly by their **immutable Git commit SHA** (`task-sphere-api:${{ github.sha }}`).
