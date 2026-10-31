---
description: Tech Lead readiness brief before implementing a ticket
agent: tech-lead
---

Ticket: $1

Find it in `docs/backlog/sprint-1.md`, then read the code it references.

Return only:

1. **Readiness** — ready, or blocked with the exact missing item.
2. **Branch** — the exact `git switch -c ...` command, cut from a clean `dev`.
3. **Blast radius** — allowed directories and the explicitly out-of-scope directories.
4. **ACs as tests** — each AC restated as a check with an observable outcome. Flag any AC that cannot be verified without a running service.
5. **Order and coupling** — prerequisites, model dependencies, anything that would force a wider change.
6. **First reads** — three files to open first, with the reason for each.

If the work would need files outside the declared blast radius, recommend a dependent ticket rather than widening scope. Do not edit files. Do not create the branch — the implementer runs your command.
