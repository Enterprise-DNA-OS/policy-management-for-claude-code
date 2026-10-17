# CLI reference

Run npm run policy -- help. Reads support --json. Record writes need --actor. Draft and export files are local and never sent. --dry-run is for import only. Exact source ID or UUID wins, then case-insensitive name, then partial UUID or name. Multiple matches are listed and exit 1. Unknown commands and flags fail.

## Record fields

Use add <entity> --file=<record.json> --actor=<operator>. Every record requires a unique source_id. Fields ending in _id accept an exact source ID or a matching record reference; imported relationships require exact IDs. All dates are YYYY-MM-DD. Foreign keys and required fields are validated by the database.

- people: source_id, name, department, email, active, retention_review_on.
- policies: source_id, name, owner_id, category, review_on, archived.
- revisions: source_id, policy_id, name, version, author_id, body, consultation_evidence.
- approvals: source_id, revision_id, approver_id, decision, evidence, decided_on.
- assignments: source_id, revision_id, person_id, due_on.
- acknowledgements: source_id, assignment_id, acknowledged_on, evidence, recorded_by.
- exceptions: source_id, policy_id, person_id, name, reason, expires_on.
- notes: source_id, policy_id, body, author.

people requires name and department; active defaults true. policies requires name, owner_id, category and review_on; archived defaults false. Categories: safety, privacy, operations, conduct. revisions requires policy_id, name, version, author_id and body; status is always draft on creation. approvals requires an independent active approver, decision approved or rejected and nonblank evidence; decided_on defaults today. assignments requires an effective revision, active person and due_on. Use acknowledge instead of add for acknowledgements. exceptions requires policy, person, name, reason and expires_on. notes requires policy, body and author.

make-effective <revision> changes local status only. It requires an independent approval with no rejection and consultation evidence for safety policies. It supersedes the current version in the same transaction. acknowledge <assignment> --evidence=<reference> records an external acknowledgement for today's date and records the operator. close-exception <reference> --resolution=<text> closes an open exception. review-policy <policy> --date=<future-date> --evidence=<reference> records a review note and next date. log <policy> --text=<note> records a note.

Import accepts people, policies, revisions, approvals and exceptions staging CSV files. Add --mapping=<file> for custom headings; inspect ignored_columns. The source_id header or its mapped equivalent is mandatory. Imports never update a previously imported record. Original assignments and acknowledgements are not imported; preserve historic evidence separately and assign the checked current version locally. Export writes all record types and audit history as JSON, a full archival snapshot rather than a CSV round-trip importer.

Use draft-weekly-review, draft-review-brief <policy> or draft-reminders for local drafts. OUTPUT_DIR redirects drafts, exports and generated HTML for testing. DATA_DIR selects the local database. Generated files and private import staging are gitignored.

Read commands: people, register, review-due, approval-desk, acknowledgements, acknowledgements-due, exceptions, attention, compliance, history, insights, weekly-review and policy <reference>.
