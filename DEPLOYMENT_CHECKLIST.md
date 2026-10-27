# Deployment Checklist: Apps Script + Frontend ERP

## 1) Prepare the Apps Script backend
- [ ] Open the Google Spreadsheet that will be the ERP database.
- [ ] Open Extensions > Apps Script.
- [ ] Create or update these files exactly:
  - [ ] `Code.gs`
  - [ ] `Security.gs`
  - [ ] `Wrapper.html`
- [ ] Make sure the backend files are copied from this repo's `google-apps-script/` folder.
- [ ] Open Project Settings > Script Properties and set:
  - [ ] `SPREADSHEET_ID` = spreadsheet ID from the ERP sheet URL
  - [ ] `GOOGLE_CLIENT_ID` = same value as Google OAuth Web Client ID
  - [ ] `ERP_FRONTEND_URL` = HTTPS origin of the deployed frontend, without a path
  - [ ] `ERP_ADMIN_EMAILS` = admin Google account(s), separated by commas
  - [ ] `GEMINI_API_KEY` = optional, only if OCR is enabled later
- [ ] In Google Cloud Console, verify OAuth consent screen and Web application client are configured.
- [ ] Add the frontend HTTPS origin in Authorized JavaScript origins.
- [ ] Deploy the Apps Script as a Web App:
  - [ ] Execute as: Me
  - [ ] Who has access: Anyone / specific users depending on policy
  - [ ] Save the generated `/exec` URL

## 2) Configure the frontend
- [ ] Copy `.env` and replace placeholders with actual values.
- [ ] Confirm `VITE_GOOGLE_CLIENT_ID` exactly matches Apps Script `GOOGLE_CLIENT_ID`.
- [ ] Confirm `VITE_ERP_WEB_APP_URL` ends with `/exec`.
- [ ] Run install:
  - [ ] `npm install`
- [ ] Run local build test:
  - [ ] `npm run build`
- [ ] Deploy frontend to Cloudflare Pages / Netlify / Vercel / static host.
- [ ] Set environment variables on the deployment platform.
- [ ] Rebuild and redeploy after env changes.

## 3) Validate login and access
- [ ] Open the frontend.
- [ ] Ensure the UI prompts login through Google.
- [ ] Login with an admin email configured in `ERP_ADMIN_EMAILS`.
- [ ] Confirm the app loads the workspace from Google Sheets.
- [ ] Confirm session is rejected if no valid Google token is present.
- [ ] Confirm `VIEWER` cannot save changes.
- [ ] Confirm `ADMIN` / `KEUANGAN` / `PROYEK` roles are enforced by the server.

## 4) Validate workspace behavior
- [ ] Create a workspace in the cloud.
- [ ] Save operational data.
- [ ] Save accounting data.
- [ ] Reload page and confirm snapshot loads correctly.
- [ ] Test version conflict on two devices/users.
- [ ] Confirm conflicted state blocks unsafe overwrites.
- [ ] Verify the app surfaces save/conflict/error status correctly.

## 5) Validate business logic
- [ ] Confirm journal entries are balanced.
- [ ] Confirm posted journals cannot be edited arbitrarily.
- [ ] Confirm reversal workflow is used instead of direct deletion/modification.
- [ ] Confirm operational and accounting slices are saved consistently.
- [ ] Validate reporting output against the saved data.

## 6) Pre-production gate
- [ ] Check that the frontend origin is allowed in OAuth.
- [ ] Check that the backend is not exposing public write endpoints.
- [ ] Check that no direct browser API is expected outside the Apps Script bridge.
- [ ] Make a JSON backup of workspace data.
- [ ] Test end-to-end using real Google accounts.
- [ ] Do not mark as production-ready until all checks above pass.

## 7) Production launch
- [ ] Final frontend URL is live.
- [ ] Final Apps Script `/exec` URL is live.
- [ ] Admin account(s) can log in and create/maintain workspace.
- [ ] Data backup routine is documented.
- [ ] Support and rollback procedure is prepared.

# Important note
This repo is structured for a Google Apps Script + frontend bridge, but the actual deployment still requires real Google OAuth and Apps Script configuration. Build success alone is not proof of successful production deployment.
