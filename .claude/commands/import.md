---
description: "Import mapped VComply export records"
---
# Import mapped VComply export records

Run `npm run policy -- import vcomply <folder> --mapping=<mapping.json> --dry-run`. Use `--json` for structured results.
Resolve names from the register before a write. If ambiguous, list candidates and stop for a selection. Never invent records or evidence.

Read docs/replace-vcomply-policyops.md first. Map the actual export columns to the supported staging format, preserving IDs. Run the preview, reconcile all counts and ignored columns, then repeat without --dry-run only when the operator requests import. Imported versions remain drafts. The examples are fictional mapped records, not a vendor export contract.

Present the result in plain words, citing the record reference. Do not email, distribute policies or connect an external service.
