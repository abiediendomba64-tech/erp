# ERP Staging Gate Checklist
# Status: CI PASS — DEPLOYMENT HOLD
# This checklist is required before production deployment approval.

## 0) Repository and config hardening
- [ ] `.env` is git-ignored and not present in the repo
- [ ] `.env.example` is the only committed env template
- [ ] no secret key, OAuth client ID, or deployment URL is committed into source control
- [ ] environment values are managed via deployment platform secrets or secure secret storage

## 1) Google Cloud / OAuth validation
- [ ] Google Cloud project exists and is linked to the ERP Apps Script project
- [ ] OAuth consent screen is configured for the app
- [ ] OAuth Web Client ID exists and is valid
- [ ] `VITE_GOOGLE_CLIENT_ID` matches the Apps Script `GOOGLE_CLIENT_ID`
- [ ] frontend JavaScript origin is added to Authorized JavaScript origins
- [ ] backend Google login is tested with a real Google account
- [ ] login fails for untrusted or unauthorized identities

## 2) Apps Script deployment validation
- [ ] `Code.gs`, `Security.gs`, and `Wrapper.html` are deployed correctly
- [ ] script property `SPREADSHEET_ID` is set to the real spreadsheet
- [ ] script property `GOOGLE_CLIENT_ID` matches the frontend client ID
- [ ] script property `ERP_FRONTEND_URL` matches the frontend HTTPS origin
- [ ] script property `ERP_ADMIN_EMAILS` contains valid admin Google accounts
- [ ] deployed URL ends with `/exec`
- [ ] `VITE_ERP_WEB_APP_URL` points to the same deployed URL
- [ ] Apps Script web app is tested using a real browser session

## 3) Frontend deployment validation
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] frontend build is deployed to staging environment
- [ ] staging domain is configured in Google OAuth allowlist
- [ ] login page loads without console-level auth misconfiguration
- [ ] frontend can open the Apps Script bridge and authenticate

## 4) Workspace and persistence validation
- [ ] admin can create a cloud workspace
- [ ] workspace loads from Google Sheets successfully
- [ ] operational slice saves successfully
- [ ] accounting slice saves successfully
- [ ] page reload loads latest snapshot without silently losing data
- [ ] save status transitions to saved correctly
- [ ] failed save shows error state and does not claim success

## 5) RBAC and authorization validation
- [ ] `ADMIN` can create/manage workspaces and users
- [ ] `KEUANGAN` role has controlled access to finance workflows
- [ ] `PROYEK` role has controlled access to project workflows
- [ ] `VIEWER` cannot write or mutate protected data
- [ ] browser tampering cannot bypass server-side authorization
- [ ] unauthorized RPCs are rejected by backend

## 6) Transaction integrity validation
- [ ] journal debit equals credit for posted entries
- [ ] invalid or partial journal entries are rejected
- [ ] edit or delete of posted journal is rejected without reversal workflow
- [ ] reversal is the only correct way to amend posted entries
- [ ] duplicate retry with same idempotency key creates only one valid transaction
- [ ] partial writes or failed saves are recoverable without silent corruption

## 7) Concurrency and conflict validation
- [ ] two different users editing the same workspace do not overwrite each other silently
- [ ] version conflict is detected and surfaced to user
- [ ] conflict state blocks unsafe writes until recovery is performed
- [ ] saved state remains consistent after refresh and retry

## 8) Data protection and restore validation
- [ ] backup JSON of workspace is created
- [ ] restore flow is tested in staging
- [ ] audit trail is preserved for writes, reversals, and role actions
- [ ] stale or demo data is segregated from production workspace data
- [ ] no fake or placeholder data is treated as verified live data

## 9) Module gating validation
- [ ] OCR is explicitly disabled if not implemented end-to-end
- [ ] Drive upload is explicitly disabled if not implemented end-to-end
- [ ] WhatsApp webhook is explicitly disabled if not implemented end-to-end
- [ ] Telegram webhook is explicitly disabled if not implemented end-to-end
- [ ] non-functional modules do not display success states without real backend support

## 10) Production approval gate
- [ ] all items above are marked PASS
- [ ] any NOT PROVEN item is listed with owner and remediation plan
- [ ] no item remains FAIL or UNKNOWN at release review
- [ ] branch protection for `main` is confirmed in repository settings
- [ ] release approval is signed by project owner and authorized admin
- [ ] deployment is considered `PRODUCTION READY` only after real staging tests pass

## Release decision
- If any gate remains FAIL or NOT PROVEN: status = CI PASS — DEPLOYMENT HOLD
- Only after all staging gates pass and approval is recorded: status = READY FOR PRODUCTION

# IMPORTANT
This checklist is a hard gate for staging/prod readiness. Build success alone is not proof that ERP login, data integrity, role enforcement, or cloud save/load behavior works in a real account.
