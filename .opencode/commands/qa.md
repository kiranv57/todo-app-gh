---
description: Verify acceptance criteria against running code and record evidence
agent: qa-engineer
---

Verify ticket $1.

Read its acceptance criteria in `docs/backlog/sprint-1.md`. For each AC:

1. State the concrete check.
2. Run it: the relevant test command, or a live request against a started service.
3. Record the exact command or request, the observed output, and pass or fail.

Then write `docs/qa/$1.md` with: environment, prerequisites, setup commands, numbered manual reproduction steps, expected versus observed, and the AC evidence table.

Never mark an AC passed without observed output. Never treat a unit test as proof of an authorization rule; exercise the route. Report regressions outside the AC list separately. End with PASS plus the evidence summary, or FAIL with the first failing check and its smallest reproduction.
