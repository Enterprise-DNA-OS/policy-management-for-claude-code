# Move policy administration from VComply PolicyOps

## Obtain and preserve the source records

Keep VComply active during reconciliation. Ask your administrator for policy metadata, people, original policy versions, decision evidence and exception records. Preserve original identifiers and the source documents in a controlled archive. VComply describes exportable audit evidence on its [policy product page](https://www.v-comply.com/policy-management-software/). Its public material does not establish a universal CSV export layout. Do not assume a PDF audit export is a ready-to-import database export. Confirm available exports with your administrator before promising a migration date.

## Map the records

Prepare UTF-8 CSV files named people.csv, policies.csv, revisions.csv, approvals.csv and exceptions.csv. Start with examples/vcomply and docs/cli.md. Those examples are fictional staging files, not unmodified vendor exports. Convert available structured export records to those columns. If only a PDF report is available, have a person verify the extracted staging rows against it. Preserve the report separately. Use a JSON mapping to associate actual headings with canonical field names, for example `{"policies":{"Policy Title":"name"}}`.

People come first, then policies, revisions, approvals and exceptions. Relationships refer to original source IDs. Each row needs a unique source_id. Review dates and dates of historical decisions must be actual ISO calendar dates. Active flags are true or false. Revision bodies are plain text. The import cannot parse Word, PDF attachments, Office comments or tracked changes. Preserve these originals and agree how their content will be represented.

## Import in one command after mapping

```bash
npm run migrate
npm run policy -- import vcomply ./imports/mapped --mapping=./imports/mapping.json --dry-run --json
npm run policy -- import vcomply ./imports/mapped --mapping=./imports/mapping.json --actor=Operator --json
```

The preview checks references, dates, independent reviewers and duplicates in a rolled-back transaction. Read ignored_columns and reconcile every skipped column before the real import. A failed row rolls back the whole batch. Repeating identical rows makes no changes. Changed records stop with an error so history cannot be overwritten.

Imported revisions remain drafts. Historic decisions can be retained with evidence, but the operator must check the version and record its local effectiveness before assigning it. Imported decisions do not make the operator's identity authenticated. The base does not import original workflow automation, role permissions, document attachments, quizzes, historic acknowledgement events or notification logs. Archive these separately. Record new assignments and acknowledgements against the checked effective version.

## Reconcile before switching

Compare source record counts, identifiers, policy names, owners, version bodies, approval evidence and exception dates with the exported archive. Read register, approval-desk, compliance and insights. Render the policy packs. Trial one policy with its real reviewer and external acknowledgement evidence before bringing over the remaining register. Keep the original service until the coordinator accepts the reconciliation.

Enterprise DNA maps the exports and builds additional import coverage, employee screens, distribution or document connections into the custom scope. The one-command promise starts after the export is available and mapped; preparation time depends on the source files.
