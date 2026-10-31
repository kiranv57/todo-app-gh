---
description: Independent adversarial review of the current branch against its ticket
agent: reviewer
---

Review the current branch against its merge base.

Ticket: $1. If no key is given, infer it from the branch name and confirm it exists in `docs/backlog/sprint-1.md`.

Read the ticket and its acceptance criteria first, then the diff. Check, in order: AC coverage, authorization and ownership on every mutating route, input trust, secret handling, failure behavior, unbounded queries and concurrency, test quality, and scope creep outside the blast radius.

Output only findings, ordered blocker, major, minor. Each finding: file:line, the concrete failure it causes, and the smallest fix that closes it. Do not include praise. If there are no findings, say so and list what you verified.

Do not edit files. Do not suggest a merge decision; that is the human's call after QA.
