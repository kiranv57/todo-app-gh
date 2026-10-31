# Architecture Record: Frozen Inode Physics, the 6-Step Checklist & the 3-Trigger Pipeline

**Status:** Accepted  
**Skills Reference:**  
- `/frozen-inode-mental-model`  
- `/six-step-checklist-precursor`  
- `/devops-file-authoring`  
- `/three-trigger-cicd-pipeline`  
- `/variable-design-tokens`  

---

## 1. The Core Axiom: Nothing Mutates in Place

In modern software engineering, files and binaries do not "change." Instead:
1. **The Payload**: Data is written into immutable, content-addressed blocks on disk called **Frozen Inodes**. Once written, their bytes are concrete, immutable, and read-only forever.
2. **The Name Tag (Pointer)**: Directory tables, Git branches (`main`, `dev`), build caches, and container tags are lightweight **mutable pointers** referencing specific frozen inodes.

```
┌────────────────────────────────────────────────────────────────────────┐
│ POINTER / NAME TAG (Mutable dictionary entry)                          │
│ "main"  |  "dev"  |  "v1.1.0"  |  Cache Key: [sha256-hash]             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (points to)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FROZEN INODE (Permanent, content-addressed, immutable data payload)    │
│ - Inode #418290: [0x8A1, 0x8A2] ── "export const authService..."       │
│ - Never altered. Never overwritten. Read-only forever.                 │
└────────────────────────────────────────────────────────────────────────┘
```

When code is edited, a bundle built, or a container updated, the system **never mutates an existing frozen inode**. It writes a **brand-new frozen inode** and slides the pointer dictionary to point to it. The predecessor inode simply becomes immutable history or reusable cache.

---

## 2. The 4 Layers of Inode Physics in TaskSphere

### Layer 1: Code Editing & Git Version Tracking
- Git is not an abstract "diff tracker"—it is a content-addressed database of frozen filesystem inodes stored inside `.git/objects/`.
- Every `git commit` freezes a **tree inode** (a mapping of file paths to blob inode hashes) wrapped in a **commit inode** (metadata pointing to the tree and parent commit).
- Branch pointers (`dev`, `main`) simply slide across frozen commit inodes. Fast-forward merges move the dictionary pointer without rewriting history.

### Layer 2: Compilers, Bundlers, and Turborepo Delta Caching
- Compilers are mathematical transformers converting source text inodes into runnable output inodes:
  $$\text{Input Inodes (Source)} \xrightarrow{\text{Turborepo / Compiler}} \text{Output Inodes (Binaries / JS / CSS)}$$
- Turborepo calculates a hash of the package directory's input inodes.
- **Cache Hit**: If input inode hashes are unchanged, compilation is bypassed (0ms), and pre-compiled output inodes are hardlinked.
- **Cache Miss (Delta)**: Turborepo compiles only the delta package, minting a new output inode and assembling it alongside cached inodes.

### Layer 3: Docker & OverlayFS Container Layer Physics
- Docker containers are literally **hierarchical stacks of read-only frozen inodes** mounted together using Linux `OverlayFS`:
  ```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ CONTAINER LAYER (Read-Write scratchpad for running app)              │
  ├──────────────────────────────────────────────────────────────────────┤
  │ LAYER 3: App Code (Frozen Inodes: services/api, apps/web)            │
  ├──────────────────────────────────────────────────────────────────────┤
  │ LAYER 2: Dependency Layer (Frozen Inodes: node_modules, pnpm store)  │
  ├──────────────────────────────────────────────────────────────────────┤
  │ LAYER 1: Base OS & Runtime (Frozen Inodes: node:22-alpine, /sbin/tini)│
  └──────────────────────────────────────────────────────────────────────┘
  ```
- **Layer Cache Invariant**: Because Docker hashes each layer's contents from top to bottom, manifests (`package.json`, `pnpm-workspace.yaml`) are copied **before** source code. Modifying business logic invalidates only Layer 3, keeping Layers 1 and 2 frozen and instantly reusable from cache.

### Layer 4: The Ephemeral Cloud Runner Lifecycle
- Cloud runners (GitHub Actions) spin up and tear down at zero disk I/O overhead because base OS inodes (Ubuntu) and language runtimes (Node.js) exist as **pre-frozen, read-only inodes on host storage**.
- Spinning up a runner simply creates a thin, empty temporary scratch directory (upper layer) mounted over the frozen base inodes.
- When the CI job completes, wiping the temporary directory destroys the environment in milliseconds without moving or copying host data.

---

## 3. The Universal 6-Step Checklist (Terminal Anchor)

Every infrastructure artifact in this repository (Dockerfiles, Docker Compose, CI workflows) executes along this 6-step physical reality:

| Step # | Action | Physical Reality in TaskSphere | Inode Characteristic |
| :---: | :--- | :--- | :--- |
| **[1]** | **Select OS** | `node:22-alpine` userland (MB without kernel) | Frozen base layer |
| **[2]** | **Install Runtime** | Node.js v22 + `tini` PID 1 supervisor | Frozen binary inodes |
| **[3]** | **Create Folder & Perms** | `/app`, unprivileged user `apprunner:nodejs` (UID 1001) | Inode ownership permissions |
| **[4]** | **Ingest Code** | Copy manifests first (`deps`), then code (`builder`) | Delta blobs (Active Delta) |
| **[5]** | **Configure Env** | `NODE_ENV=production`, `PORT=5000`, Zero-Fallback `JWT_SECRET` | Environment metadata |
| **[6]** | **Execute Run** | `ENTRYPOINT ["/sbin/tini", "--"]`, `CMD ["node", "src/server.js"]` | Active running thread |

---

## 4. The 3-Trigger Sequential CI/CD Relay

```
+-----------------------------------------------------------------------------------------------------------+
|                                    THE 3-TRIGGER SEQUENTIAL RELAY                                         |
+-----------------------------------------------------------------------------------------------------------+
|                                                                                                           |
|  [ TRIGGER 1: git commit (Local Laptop Guard - scripts/pre-commit-gate.js) ]                              |
|    ├── Stage 1: Fast formatting & schema verification (Prettier & JSON grammar)                           |
|    └── Stage 2: Precursor Blockers (<1s hard abort on leaked secrets, .env files, or Docker flaws)         |
|         │                                                                                                 |
|         ▼ (Unlocks ONLY when local commit is 100% clean)                                                  |
|                                                                                                           |
|  [ TRIGGER 2: git push (Isolated PR Cloud Gate - .github/workflows/ci.yml) ]                              |
|    ├── Stage 3: Surrogate VM Ingestion & Delta Inode Compile (Turborepo + Contracts/API/Web suites)       |
|    ├── Stage 4: Docker Precursor Gates (check-docker-hygiene.js strict CIS Benchmark audit)               |
|    └── Stage 5: Container Certification (<150MB byte budget & detached /health smoke test)                |
|         │                                                                                                 |
|         ▼ (Unlocks ONLY when PR turns 100% green and is approved)                                         |
|                                                                                                           |
|  [ TRIGGER 3: git merge into main (Integration & Release Gate) ]                                          |
|    ├── Stage 6: The Heavy Integration Matrix (Multi-package end-to-end regression validation)             |
|    └── Stage 7: Immutable Canary Production Deployment (Pinned to ${{ github.sha }}, strictly BANS :latest)|
|                                                                                                           |
+-----------------------------------------------------------------------------------------------------------+
```

### The Immutable Release Rule (Anti-Pattern Defense)
Deploying unpinned tags like `:latest` in production is an architectural defect because `:latest` mutates over time, destroying reproducibility. Trigger 3 enforces that production artifacts are built, tagged, and deployed strictly by their **immutable Git commit SHA** (`task-sphere-api:${{ github.sha }}`).
