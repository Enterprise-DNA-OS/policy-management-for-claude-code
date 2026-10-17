# Policy Management for Claude Code

Operate a policy register for a trusted policy coordinator. Read the database before answering. Never invent a policy, approval, signature or source fact. Read docs/cli.md for exact inputs and docs/compliance.md for check limits.

## Routing

- /people: Review the people register.
- /register: Review current policies and ownership.
- /review-due: Prepare the policy review calendar.
- /approval-desk: Review draft decisions and missing approvals.
- /acknowledgements: Read version-specific acknowledgement history.
- /acknowledgements-due: Find current acknowledgements still outstanding.
- /exceptions: Review open and expired policy exceptions.
- /attention: Read overdue work and evidence gaps.
- /compliance: Check record evidence against documented rules.
- /history: Read the recorded changes and actors.
- /insights: Answer ten cross-record policy questions.
- /weekly-review: Write the Monday policy review.
- /policy: Read a policy and its version history.
- /add: Add a record from an explicit JSON file.
- /make-effective: Record an independently approved policy as effective.
- /acknowledge: Record an acknowledgement from external evidence.
- /close-exception: Record how an exception was resolved.
- /review-policy: Record a completed review and its next date.
- /log: Add an evidence note to a policy.
- /draft-weekly-review: Draft the weekly governance brief.
- /draft-review-brief: Draft a policy review pack.
- /draft-reminders: Draft a list of acknowledgement follow-ups.
- /import: Import mapped VComply export records.
- /export: Export all records and audit evidence.
- /customise: add a migration and update the workflow with regression checks.
- /new-view: add a read-only report from existing records.

## Rules

Use the one CLI: npm run policy -- <command>. Match names and IDs from real records; an ambiguous match lists candidates and stops. Writes need the operator's request, an actor label and real evidence. Approvals must come from an independent reviewer. Record external acknowledgements, never sign on another person's behalf. Making effective changes the local register only. Never distribute a policy, email, delete records or connect a service without specific authorisation. Drafts stay in drafts/.

Use npm test and npm run demo for changes; both use temporary data. Never seed a business database. Database credentials and private imports stay out of git. Do not expose the owner database connection to browsers. New fields or rules require a new migration; never rewrite applied migrations. Evidence and historical versions stay intact.

scripts/policy.mjs is the CLI; scripts/lib/domain.mjs holds allowed fields and queries; supabase/migrations contains the schema. views.json and documents.json drive read-only HTML artefacts. brand.json is the single branding file.

Built and maintained for you through Omni by Enterprise DNA: https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=vcomply-policyops
