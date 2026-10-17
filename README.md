# Policy Management for Claude Code

Own your policy versions, approval evidence, review dates and acknowledgements. Built for an operator who manages the policy register for a professional firm or other small organisation.

## Three ways to run it

- **Do it yourself:** free under the MIT licence. Install it, map your exported records and run the commands with Claude Code, Codex, OpenCode or Cursor.
- **We customise it:** Enterprise DNA brings your VComply records across and builds your fields, rules, documents, connections and a team screen if needed. One setup fee, then a retainer.
- **We run it for you:** installed, maintained and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=vcomply-policyops&utm_medium=github).

## Try it

Node 22.15 or newer. Windows, macOS or Linux. No database server needed for a local trial.

```bash
npm install
npm test
npm run demo
npm run migrate
npm run seed
npm run policy -- weekly-review
npm run policy -- insights --json
npm run view
npm run docs
```

The GitHub workflow tests Windows and Linux, with a separate PostgreSQL job. `npm run test:postgres` requires TEST_DATABASE_URL pointing to a disposable local database.

Tests and demo use disposable fictional databases and never use DATABASE_URL. `seed` is fictional demonstration data; do not run it in your business database. To start empty, run migrate only. DATA_DIR selects a local PGlite database. DATABASE_URL selects a PostgreSQL 15+ database with invoker-rights views. See .env.example. Never commit credentials or private exports.

## What this base does

26 slash commands cover the weekly register, review queue, approval desk, acknowledgement chase, exception review, evidence checks, documents, drafts and customisation. Eight business record types hold people, policies, revisions, decisions, assignments, acknowledgements, exceptions and notes. Every write records its actor label and before/after values.

An independent reviewer must approve a version before it becomes effective. Approved content is locked. Safety policy versions also require consultation evidence. A replacement version supersedes the old version atomically. Old acknowledgements remain attached to the version the person actually saw. Assign the new version explicitly; a previous signature does not follow it.

`npm run docs` writes controlled policy packs and acknowledgement registers as branded HTML. `npm run view` writes three read-only reports. Change business name, logo and colours in brand.json. Generated material remains local. No messages are sent.

This is an operator workspace, not a self-service employee portal or signature service. An operator records external acknowledgement evidence. The actor is a label, not authenticated proof of who used the terminal. Shared deployments require a trusted database role, authentication, backups and an agreed access model. Row security is enabled with no public access; the local database owner can still administer the database and its controls. Audit rows are append-only through normal database writes, not tamper-proof against the database owner.

## Bring your VComply records

```bash
npm run policy -- import vcomply ./imports/mapped --mapping=./imports/mapping.json --dry-run
npm run policy -- import vcomply ./imports/mapped --mapping=./imports/mapping.json --actor=Operator
npm run policy -- export
```

Read [the switch guide](docs/replace-vcomply-policyops.md). The import accepts mapped CSV records for people, policies, revisions, approvals and exceptions. It validates relationships in one transaction, preserves source IDs, and refuses changed records instead of overwriting historical evidence. Imported revisions stay drafts until checked and made effective. Original documents and historical acknowledgement exports remain archived separately. No universal VComply CSV layout has been verified; mapping and reconciliation are required before the one-command import.

## Ten questions to ask today

These cross-record checks run in `npm run policy -- insights`. They are useful questions beyond a single summary chart, not a claim that VComply cannot build equivalent reports.

1. Which overdue policies also have overdue acknowledgements?
2. Which departments still owe acknowledgement of current versions?
3. Which people hold expired exceptions and outstanding acknowledgements?
4. Which draft safety changes lack consultation evidence?
5. Which policy owners are inactive while reviews are overdue?
6. Which active policies have no effective version?
7. Which draft revisions have no independent decision?
8. Which current policies are unassigned to active people?
9. Which people need retention review and still own policies?
10. Which reviews fall due in the next month while acknowledgements remain open?

## Your first hour: ten things to ask for

1. Show policies due for review and the owner of each.
2. Find current acknowledgements that are overdue.
3. Prepare the Monday review from reviews, acknowledgements and exceptions.
4. Show a policy and all its versions before changing it.
5. Draft a review brief without sending it.
6. Explain why a proposed version cannot take effect.
7. Map a sample export and run an import preview.
8. Put our business name and logo on the policy pack.
9. Add a read-only report for department heads with /new-view.
10. Add an extra policy classification with /customise and a new migration.

## Evidence and limits

[Compliance checks](docs/compliance.md) distinguish source-backed obligations from internal review choices. [CLI reference](docs/cli.md) lists fields and commands. [Research](docs/research.md) records pricing and scope. [Why no front end](docs/why-no-front-end.md) explains the operating model.

The base covers policy administration. Enterprise DNA scopes employee access, Office document editing, distribution and integrations as part of a custom version. It does not certify compliance, decide lawful retention periods or replace the full VComply suite.
