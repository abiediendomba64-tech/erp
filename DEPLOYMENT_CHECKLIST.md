# Gate Checklist — Deployment-Ready Staging

Status: **HOLD until all 10 gates have PASS evidence recorded below.**
Target branch: \`deployment-ready/staging-gates\`
Scope: staging only. This checklist does not authorize a production deployment.

## Rules for evidence

- A checked box without evidence is not a PASS.
- Record the actual commit SHA, workflow run URL, test timestamp (UTC), tester, and evidence URL.
- Use only a dedicated staging Apps Script project, staging deployment, and test spreadsheet.
- Never paste tokens, client secrets, refresh tokens, spreadsheet contents, or unredacted personal data into GitHub issues, workflow summaries, or evidence screenshots.
- Any FAIL, BLOCKED, unexplained data drift, or missing evidence means **NO-GO**.
- Do not change production secrets or run the production deployment workflow as part of this checklist.

## Gate 1 — Git hygiene and branch protection

- [ ] \`.env\` is absent from the current branch tree; only \`.env.example\` is tracked.
- [ ] \`.gitignore\` excludes \`.env\`, \`.env.*\`, \`.clasp.json\`, \`.clasprc.json\`, local runtime secrets, and private key/certificate files, while allowing public example templates.
- [ ] Secret scanning has been run on the current tree and recent commit range. If an actual secret was ever committed, rotate it; deleting the latest file does not erase Git history.
- [ ] Repository settings confirm protection/rules for \`main\`: PR required, required CI checks selected, force-push/deletion blocked, and bypass limited as policy allows.
- [ ] The deployment-ready branch is not an alternative path to production; any merge to \`main\` still follows normal review and required checks.
- [ ] CI passed on the exact commit being tested (typecheck, automated tests, Apps Script syntax/release helper checks, frontend build).
- Evidence: settings screenshot or ruleset URL, secret-scan result, CI run URL, commit SHA.

**Pass condition:** no tracked runtime env file or exposed credential; required branch controls and CI evidence are verified. If protection cannot be verified, mark BLOCKED rather than assuming it is enabled.

## Gate 2 — Staging isolation and exact target

- [ ] GitHub Actions environment \`staging\` is configured and uses only staging-scoped secrets/variables:
  - \`STAGING_CLASPRC_JSON\`
  - \`STAGING_CLASP_JSON\`
  - \`STAGING_GAS_SCRIPT_ID\`
  - \`STAGING_GAS_DEPLOYMENT_ID\`
- [ ] \`STAGING_GAS_SCRIPT_ID\` refers to the dedicated staging Apps Script project and its exact existing Web App deployment is verified by \`.github/scripts/verify-gas-target.mjs\`.
- [ ] In the staging Apps Script Project Settings, \`SPREADSHEET_ID\` points to a dedicated test spreadsheet. Verify in the Google console; do not disclose the full ID in logs.
- [ ] Staging deployment ID, Script ID, spreadsheet, OAuth configuration, and credentials are confirmed not to target production.
- [ ] A second reviewer checks the target before running the workflow.
- [ ] The staging workflow is manually dispatched from \`deployment-ready/staging-gates\` with input \`confirm_target=STAGING\`; no production workflow is run.
- Evidence: redacted target-review record, workflow run URL, reviewer, staging environment configuration proof.

**Pass condition:** all three layers—Script ID, deployment ID, and spreadsheet ID—are staging-only. The workflow target verifier validates Script ID and deployment identity; spreadsheet binding must also be checked directly in staging Script Properties.

## Gate 3 — Frontend environment and build

- [ ] Copy \`.env.example\` to a local \`.env\` only for local development; do not commit the local file.
- [ ] Set \`VITE_GOOGLE_CLIENT_ID\` to the intended OAuth Web Client ID.
- [ ] Set \`VITE_ERP_WEB_APP_URL\` to the actual staging Web App URL ending in \`/exec\`.
- [ ] Confirm \`VITE_GOOGLE_CLIENT_ID\` matches Apps Script \`GOOGLE_CLIENT_ID\`.
- [ ] Set the same two public values in the frontend host's staging build environment and rebuild after changes.
- [ ] Confirm no client secret, token, spreadsheet ID, admin allowlist, service-account key, or Gemini API key is present in any \`VITE_*\` variable or built browser assets.
- [ ] Run \`npm ci\`, \`npm run typecheck\`, \`npm test\`, and \`npm run build\`.
- Evidence: CI run URL, redacted frontend-host settings, build artifact inspection result.

**Pass condition:** build succeeds using staging configuration; browser bundle contains only intended public configuration.

## Gate 4 — OAuth, origin trust, and session rejection

- [ ] Apps Script Script Properties contain staging values for \`GOOGLE_CLIENT_ID\`, \`ERP_FRONTEND_URL\`, \`ERP_ADMIN_EMAILS\`, and \`SPREADSHEET_ID\`.
- [ ] \`ERP_FRONTEND_URL\` is the exact HTTPS frontend origin only (no path, query, or credentials).
- [ ] Google OAuth Authorized JavaScript origins contain the exact frontend origin used for the staging test.
- [ ] A valid, verified Google account in the staging allowlist can log in through the Apps Script \`/exec\` wrapper and load the staging workspace.
- [ ] Missing token, invalid/expired token, wrong OAuth audience, unverified email, inactive user, and an unapproved account are rejected.
- [ ] Directly opening the hosted frontend without the Apps Script wrapper does not bypass the intended login/bridge.
- [ ] Logout clears the session and subsequent protected requests fail until login again.
- Evidence: redacted test matrix and screenshots/log excerpts; never record raw ID tokens.

**Pass condition:** server-side identity validation and the wrapper origin boundary work for both valid and invalid cases.

## Gate 5 — Workspace and data isolation

- [ ] Create or designate a clean staging workspace in the dedicated staging spreadsheet.
- [ ] No production financial records, private documents, customer/owner personal data, or production credentials are copied into staging unless explicitly sanitized and approved.
- [ ] Test initial setup with an empty workspace; do not import browser/localStorage data without review and a backup.
- [ ] Verify workspace reads/writes are limited to authorized users and the intended workspace.
- [ ] Log in from a clean browser profile and confirm the app loads the canonical staging snapshot from cloud, not stale local cache.
- [ ] Verify the production spreadsheet and production Web App remain unchanged throughout staging tests.
- Evidence: workspace ID alias (not sensitive full identifier), redacted staging sheet/config check, before/after staging counts, reviewer sign-off.

**Pass condition:** all test writes are confined to staging, and no unexpected production or cross-workspace changes occur.

## Gate 6 — Server-side RBAC and negative authorization tests

- [ ] Test \`ADMIN\`: permitted user/workspace administration and approved operations succeed.
- [ ] Test \`KEUANGAN\`: accounting/report operations allowed by policy succeed; user administration and other restricted actions fail.
- [ ] Test \`PROYEK\`: permitted project/operational writes succeed; accounting/admin-only actions fail.
- [ ] Test \`VIEWER\`: workspace read succeeds; every write attempt is rejected by the server, not merely hidden/disabled in the UI.
- [ ] Send crafted requests with a changed client role or another workspace ID; server decisions must still derive from authenticated server-side identity/role.
- [ ] Disabled/inactive accounts cannot read or write protected workspace data.
- Evidence: role/action matrix with expected versus actual response and sanitized request IDs.

**Pass condition:** every forbidden action is denied server-side; a UI-only restriction is a FAIL.

## Gate 7 — Accounting and journal integrity

- [ ] Valid journals have at least two valid entries and total debits equal total credits within the configured currency tolerance.
- [ ] Invalid journals (unbalanced values, negative values, invalid accounts, or debit and credit both positive on a line) are rejected.
- [ ] A posted journal cannot be edited or deleted by a normal request.
- [ ] Corrections use the approved correction/reversal path with a reason, original reference, actor, timestamp, and audit record.
- [ ] Verify cashbook movement is not double-counted as income/expense when it is an internal transfer or settlement of an existing liability.
- [ ] Verify obligation/agreement, cash paid, evidence verification, and outstanding liability remain separately represented.
- [ ] Test save failures between operational and accounting updates. If cashbook, journal, proof, and audit trail can diverge without a safe recovery/reconciliation path, mark FAIL/BLOCKED; a balanced helper function alone is not proof of an atomic business transaction.
- [ ] Reconcile report totals against independently calculated staging test fixtures.
- Evidence: test fixture, journal/report export, audit entries, failure-injection result.

**Pass condition:** invariants hold for success, rejection, correction, and failed-save paths. Do not use real financial data for this test.

## Gate 8 — Anti-duplication, idempotency, and audit trail

- [ ] Submit the same business transaction twice; the second submission is rejected or safely recognized as the same request without duplicating cash, journal, liability, or report totals.
- [ ] Retry the same request after a simulated timeout; it must not create a second transaction.
- [ ] Test duplicate reference/receipt number and, where supported, matching proof-file hash; ambiguous cases must be flagged for review rather than silently accepted.
- [ ] Confirm duplicate detection is enforced on the server-side write path; a frontend-only helper or warning does not satisfy this gate.
- [ ] Confirm audit events record actor, timestamp, action, record reference, and correction reason/old-to-new values where applicable, without storing access tokens.
- [ ] Verify a failed request does not report success or create partial/duplicate accounting effects.
- Evidence: request IDs, transaction counts before/after, audit entries, duplicate-test output.

**Pass condition:** repeated requests cannot silently create duplicate financial effects. If server-side idempotency is not implemented or cannot be demonstrated, mark BLOCKED/FAIL.

## Gate 9 — Concurrency, recovery, and save-status behavior

- [ ] Open the same staging workspace in two independent browser sessions.
- [ ] Both sessions read version N; session A writes successfully; stale session B attempts to save and is rejected as a version conflict.
- [ ] Verify the stale snapshot cannot overwrite session A's data.
- [ ] Verify the app surfaces saving, saved, failed, and conflict states accurately.
- [ ] Simulate network failure/timeout during a write; reload and reconcile against cloud data before retrying.
- [ ] Retry a failed save only after checking whether the server accepted the original request.
- [ ] Test concurrent saves across operational and accounting slices, including a failure between them; document any remaining non-atomicity and block release if it can cause unreconciled financial state.
- [ ] Export a staging backup and restore it into a separate disposable staging workspace; compare record counts and key report totals.
- Evidence: two-session timeline, version numbers, cloud status screenshots, backup/restore comparison.

**Pass condition:** no silent last-write-wins loss; all uncertain writes are recoverable and reconciled.

## Gate 10 — Disabled features, operational rollback, and release decision

- [ ] Confirm OCR returns an explicit disabled/not-enabled error and does not pretend to process a document.
- [ ] Confirm Google Drive upload fails closed and reports that no file was uploaded.
- [ ] Confirm WhatsApp/Telegram/webhook endpoints remain disabled until provider verification, deduplication, and approval flow are implemented and tested.
- [ ] Confirm UI labels and workflow do not claim these unavailable functions succeeded.
- [ ] Confirm no unapproved production endpoint, token, spreadsheet, or credential is called by the staging build.
- [ ] Verify staging backup/export, restore procedure, support owner, incident path, and rollback plan.
- [ ] Record unresolved defects, limitations, and accepted risks. Any unresolved critical/high security or data-integrity issue blocks GO.
- [ ] Obtain engineering/reviewer and business-owner sign-off on the exact tested commit.
- [ ] Confirm the workflow run updated only the verified staging deployment and passed the post-deployment health smoke test.
- Evidence: staging workflow URL, health result, disabled-feature tests, backup/restore proof, sign-offs.

**Pass condition:** feature limitations fail closed, rollback is rehearsed, and all earlier gates have PASS evidence. Production is a separate decision and is not authorized by staging success alone.

## Gate result register

Fill this in during the actual test run; do not pre-mark gates as passed.

| Gate | Status (PASS / FAIL / BLOCKED) | Evidence URL / artifact | Tester | UTC timestamp | Defect / follow-up |
|---|---|---|---|---|---|
| 1. Git hygiene & branch protection | BLOCKED | | | | |
| 2. Staging isolation & target | BLOCKED | | | | |
| 3. Frontend environment & build | BLOCKED | | | | |
| 4. OAuth & session rejection | BLOCKED | | | | |
| 5. Workspace/data isolation | BLOCKED | | | | |
| 6. Server-side RBAC | BLOCKED | | | | |
| 7. Accounting/journal integrity | BLOCKED | | | | |
| 8. Anti-duplication/idempotency | BLOCKED | | | | |
| 9. Concurrency & recovery | BLOCKED | | | | |
| 10. Disabled features & rollback | BLOCKED | | | | |

## Final decision

- [ ] All 10 gates are PASS with evidence attached.
- [ ] No critical/high security or data-integrity issue is unresolved.
- [ ] Test commit SHA and staging deployment details are recorded.
- [ ] Reviewer and business owner have approved the staging report.

Until every required item is evidenced: **CI PASS — DEPLOYMENT HOLD**.
