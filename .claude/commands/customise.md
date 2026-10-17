---
description: "Change fields, policy rules or workflow in plain language"
---
# Make it yours
Read CLAUDE.md, docs/cli.md, the current migration and smoke tests. Ask for the desired outcome and inspect the current data first.
Write a new numbered migration, never edit an applied migration. Keep old evidence and version-specific acknowledgements intact. Update the CLI field allowlist, import mapping, documents and views where needed. Add a meaningful regression check for the new rule. Run npm test and npm run demo on temporary data. Show the migration and its data effect before applying it to business records. Never weaken the independent-approval or historical-evidence checks silently.
