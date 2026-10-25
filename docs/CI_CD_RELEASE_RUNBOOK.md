# CI/CD Release Runbook — ERP Properti & Konstruksi

## Current policy

- Production deployment is not authorized until the release controls below are verified by an authorized operator.
- Passing CI does not prove that GitHub Environment protection, secrets, live Script ID, Deployment ID, or the Web App are correct.
- Do not dispatch `sync-apps-script.yml` or `deploy-apps-script.yml` against production while target configuration or protection is unverified.
- Do not put secret values, OAuth tokens, or raw `.clasprc.json` / `.clasp.json` content in logs, summaries, issues, or this runbook.

## Repository branch protection (administrator action)

On GitHub, open Settings → Branches or Rulesets and create an enforced rule for `main`: require a pull request, require at least one authorized review, dismiss stale approvals when applicable, require the named CI checks, require conversation resolution, and block force-push and branch deletion. Limit bypass permissions. Then re-query the branch/ruleset state and record the URL and UTC verification timestamp.

The current repository inspection reported `main` as `protected: false`. This workflow change does not enable repository settings or branch protection by itself.

## Production environment (administrator action)

Open Settings → Environments → `production`. Confirm required reviewers and prevent self-review; limit deployment branches to `main`; confirm the environment is attached to the production jobs. GitHub's ordinary required-reviewer gate permits an eligible reviewer to approve; a policy requiring all three release sign-offs must be enforced separately and evidenced.

Required production configuration:

- Variable `GAS_SCRIPT_ID`: the verified production Apps Script Script ID.
- Secret `CLASPRC_JSON`: valid clasp OAuth credentials whose refresh token can call the Apps Script Deployments API.
- Secret `CLASP_JSON`: JSON clasp project config with `scriptId` matching `GAS_SCRIPT_ID` and `rootDir` set to `google-apps-script`.
- Secret `GAS_DEPLOYMENT_ID`: the exact existing production Web App deployment ID under that Script ID.

Check presence and validity without printing values. Enable the Apps Script API for the Google Cloud project where required. The validation script requests an OAuth access token without logging credentials, calls the Apps Script Deployments API under the expected Script ID, requires exactly one exact deployment-ID match, and requires Web App deployment configuration. Any error stops the workflow.

## Staging environment (separate project and data)

Create a separate Apps Script staging project and a separate non-production spreadsheet. Create or provision one existing staging Web App deployment, then configure the `staging` environment with the distinct names `STAGING_GAS_SCRIPT_ID` (variable) and `STAGING_CLASPRC_JSON`, `STAGING_CLASP_JSON`, `STAGING_GAS_DEPLOYMENT_ID` (secrets). Use these staging-prefixed names so missing staging configuration cannot silently fall back to production-named values. Never reuse production Script ID, deployment ID, credentials, or business spreadsheet in staging.

The `staging-apps-script.yml` workflow only runs when manually dispatched from `main` with input `STAGING`. It runs typecheck/tests/build, validates the staging Script ID and deployment ID against the live API, pushes source to the verified staging script, updates the existing staging deployment, then tests the `/health` response. It fails closed on missing settings, mismatch, API error, non-200 final response, non-JSON response, or a mismatched health payload.

The staging workflow updates an existing deployment; it does not bootstrap a first deployment. A staging Web App deployment must exist and its ID must be configured before this workflow can pass.

## Production release sequence

1. Verify `main` branch protection and required CI checks in GitHub settings.
2. Verify `production` environment protection, reviewer policy, and secret/variable configuration.
3. Run the staging release workflow and verify its full run and health smoke-test summary.
4. Run the production source-sync workflow only after separate authorization. It is pinned to dispatches from `main`, requires input `SYNC`, checks CI, verifies the exact production target live, then performs a normal `clasp push` without `--force`. This changes Apps Script source but does not update the deployment.
5. Review the exact commit and source-sync run result. Do not proceed if the target, logs, or source state is unclear.
6. After all required approvals and release sign-offs are recorded, dispatch the production deployment workflow from `main` with input `DEPLOY`. The protected `production` environment must hold the job pending required review.
7. That workflow validates typecheck/tests/build, re-verifies the exact target against the live Apps Script API, updates the existing deployment, and checks the final health response with HTTP 200 and the expected JSON contract.
8. Verify the live application workflows with authorized test accounts and non-destructive test data. A health endpoint alone does not prove that all ERP modules, role permissions, or spreadsheet operations work.
9. Store the workflow URL, commit SHA, UTC time, target verification result, smoke-test result, and approval evidence in the release record. Only then may the release decision be reconsidered.

## Rollback / failure handling

If any required step fails, keep the release on HOLD. Do not retry blindly. Preserve the run URL and sanitized error, confirm the current Web App deployment/version, and execute only a previously tested recovery procedure approved by the release owner. Do not print tokens or raw secret JSON while diagnosing a failure.

## Important feature limitations

The current Apps Script backend deliberately rejects legacy direct REST writes and disables OCR and WhatsApp/Telegram webhook routes until their secure authenticated flows are implemented and tested. The `/health` smoke test only verifies availability and a small JSON contract; it does not authorize claims that these features or all ERP modules are production-ready.

## Evidence record template

- Repository / branch / commit SHA:
- CI run URL and conclusion:
- Main branch protection evidence URL and UTC time:
- Production environment protection evidence URL and UTC time:
- Sanitized secret/config validation run URL:
- Verified production Script ID match (record only according to internal policy):
- Exact existing Deployment ID match result:
- Staging run URL and smoke-test result:
- Production sync run URL and result:
- Production deployment run URL and approval evidence:
- Live application smoke / regression test results:
- Release sign-offs (each identity, decision, UTC time, evidence reference):
- Final decision: HOLD / GO
