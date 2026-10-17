---
description: "Record an acknowledgement from external evidence"
---
# Record an acknowledgement from external evidence

Run `npm run policy -- acknowledge <assignment> --evidence=<reference> --actor=<operator>`. Use `--json` for structured results.
Resolve names from the register before a write. If ambiguous, list candidates and stop for a selection. Never invent records or evidence.

Read the assignment and current version first. Require evidence from the named recipient. You are recording an external acknowledgement, not signing as that person. The recorded actor is an operator label, not authenticated identity.

Present the result in plain words, citing the record reference. Do not email, distribute policies or connect an external service.
