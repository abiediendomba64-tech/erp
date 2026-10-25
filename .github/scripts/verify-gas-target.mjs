import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function fail(message) {
  console.error('::error::' + message);
  process.exit(1);
}

function readJson(filePath, label) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { fail(label + ' is missing or is not valid JSON.'); }
}

const expectedScriptId = String(process.env.EXPECTED_SCRIPT_ID || '').trim();
const expectedDeploymentId = String(process.env.EXPECTED_DEPLOYMENT_ID || '').trim();
const claspConfigPath = process.env.CLASP_CONFIG_PATH || '.clasp.json';
const claspCredentialsPath = process.env.CLASP_CREDENTIALS_PATH || path.join(os.homedir(), '.clasprc.json');

if (!expectedScriptId) fail('GAS_SCRIPT_ID is missing.');
if (!expectedDeploymentId) fail('GAS_DEPLOYMENT_ID is missing.');

const claspConfig = readJson(claspConfigPath, 'CLASP_JSON');
if (String(claspConfig.scriptId || '') !== expectedScriptId) {
  fail('Configured .clasp.json scriptId does not exactly match GAS_SCRIPT_ID.');
}
if (String(claspConfig.rootDir || '') !== 'google-apps-script') {
  fail('Configured .clasp.json rootDir must be google-apps-script.');
}

const credentials = readJson(claspCredentialsPath, 'CLASPRC_JSON');
const oauthSettings = credentials.oauth2ClientSettings || {};
const savedToken = credentials.token || {};
const clientId = String(oauthSettings.clientId || savedToken.client_id || '').trim();
const clientSecret = String(oauthSettings.clientSecret || savedToken.client_secret || '').trim();
const refreshToken = String(savedToken.refresh_token || credentials.refresh_token || '').trim();
if (!clientId || !clientSecret || !refreshToken) {
  fail('CLASPRC_JSON does not contain the OAuth client settings and refresh token required for live API verification.');
}

async function main() {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(15000)
  }).catch(() => fail('Google OAuth token refresh request failed. Check credential validity and network access.'));
  if (!tokenResponse.ok) fail('Google OAuth token refresh failed (HTTP ' + tokenResponse.status + '); credential values were not logged.');
  const tokenPayload = await tokenResponse.json().catch(() => fail('Google OAuth returned an invalid token response.'));
  const accessToken = String(tokenPayload.access_token || '');
  if (!accessToken) fail('Google OAuth did not return an access token.');

  const apiBase = 'https://script.googleapis.com/v1/projects/' + encodeURIComponent(expectedScriptId) + '/deployments';
  const deployments = [];
  let pageToken = '';
  for (let page = 0; page < 20; page += 1) {
    const url = new URL(apiBase);
    url.searchParams.set('pageSize', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(20000) })
      .catch(() => fail('Apps Script Deployments API request failed. Verify API access and target permissions.'));
    if (!response.ok) fail('Apps Script Deployments API returned HTTP ' + response.status + '. Target verification failed closed.');
    const payload = await response.json().catch(() => fail('Apps Script Deployments API returned invalid JSON.'));
    if (Array.isArray(payload.deployments)) deployments.push(...payload.deployments);
    pageToken = String(payload.nextPageToken || '');
    if (!pageToken) break;
    if (page === 19) fail('Apps Script deployment listing exceeded the safety pagination limit.');
  }

  const matches = deployments.filter(item => String(item.deploymentId || '') === expectedDeploymentId);
  if (matches.length !== 1) fail('Expected exactly one deployment matching GAS_DEPLOYMENT_ID in the configured Script ID; found ' + matches.length + '. No deployment was changed.');
  const deployment = matches[0];
  const config = deployment.deploymentConfig || {};
  if (config.scriptId && String(config.scriptId) !== expectedScriptId) fail('Live deployment metadata references a different Script ID.');
  const webAppEntry = Array.isArray(deployment.entryPoints)
    ? deployment.entryPoints.find(item => String(item.entryPointType || '') === 'WEB_APP' && item.webApp)
    : null;
  if (!webAppEntry) fail('The exact matching deployment does not contain a WEB_APP entry point.');

  const webAppUrl = 'https://script.google.com/macros/s/' + encodeURIComponent(expectedDeploymentId) + '/exec';
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'web_app_url=' + webAppUrl + '\n');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'deployment_version=' + String(config.versionNumber || '') + '\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '### Apps Script target verification', '',
      '- Result: PASS',
      '- `.clasp.json` Script ID exactly matches `GAS_SCRIPT_ID`.',
      '- `rootDir` is `google-apps-script`.',
      '- Google OAuth token refresh succeeded without logging credential values.',
      '- Apps Script Deployments API returned exactly one matching deployment under the configured Script ID.',
      '- Matching deployment is configured as a Web App.',
      '- Version number: ' + String(config.versionNumber || 'not supplied by API'), ''
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  console.log('Live target verification passed: exact Script ID and Web App Deployment ID match confirmed through the Apps Script API.');
}
main().catch(() => fail('Unexpected target-verification error. No secret or API response body was printed.'));
