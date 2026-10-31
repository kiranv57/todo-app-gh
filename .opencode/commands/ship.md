---
description: Run the release gate and draft the changelog and release PR
agent: release-manager
subagent: true
---

Run the release gate for the current `dev` branch.

1. Tests: affected suites pass. Record commands and results.
2. Review: no open blocker from the latest review pass.
3. QA: `docs/qa/` evidence exists for every ticket in the release, all PASS.
4. Documentation: ADRs and contract schemas updated.
5. Migration and rollback: schema changes are backward compatible with a written rollback. Otherwise block.
6. Exposure: risky behavior is behind a flag.
7. Secrets: no fallback defaults; required variables documented.

Stop at the first failed gate and state which one failed and what closes it.

If every gate passes, produce the ticket list since the last tag, the `CHANGELOG.md` entries grouped by Added, Changed, Fixed, Security, Removed, and the `dev` to `main` release PR body with a risk section taken from the diff.

Finish with the exact tag and deploy commands, then wait for human approval. Do not tag, merge, or deploy on your own.
