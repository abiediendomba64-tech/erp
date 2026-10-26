const rawUrl = String(process.env.WEB_APP_URL || '').trim();
if (!rawUrl) { console.error('::error::WEB_APP_URL was not provided by the verified target step.'); process.exit(1); }
let webAppUrl;
try { webAppUrl = new URL(rawUrl); } catch { console.error('::error::WEB_APP_URL is not a valid URL.'); process.exit(1); }
if (webAppUrl.protocol !== 'https:' || webAppUrl.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec\/?$/.test(webAppUrl.pathname)) {
  console.error('::error::WEB_APP_URL is not the expected Google Apps Script Web App URL.'); process.exit(1);
}
webAppUrl.searchParams.set('path', '/health');

async function main() {
  const response = await fetch(webAppUrl, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(20000) })
    .catch(() => { console.error('::error::Apps Script health endpoint request failed.'); process.exit(1); });
  if (response.status !== 200) {
    console.error('::error::Apps Script health endpoint final HTTP status was ' + response.status + ', expected 200.'); process.exit(1);
  }
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    console.error('::error::Apps Script health endpoint did not return a JSON content type.'); process.exit(1);
  }
  const body = await response.json().catch(() => { console.error('::error::Apps Script health endpoint returned invalid JSON.'); process.exit(1); });
  if (body.success !== true || body.service !== 'erp-google-apps-script' || body.authRequired !== true) {
    console.error('::error::Apps Script health response did not match the expected health contract. Payload values were not printed.'); process.exit(1);
  }
  const summary = [
    '### Apps Script Web App smoke test', '',
    '- Result: PASS',
    '- Final HTTP status: 200',
    '- Redirect followed: ' + (response.redirected ? 'yes' : 'no'),
    '- Content-Type: application/json',
    '- Health JSON contract: success=true, service=erp-google-apps-script, authRequired=true',
    '- Endpoint path: `/exec?path=%2Fhealth`',
    '',
    'This is a health smoke test only; it does not prove all ERP modules or spreadsheet mutations work.'
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = await import('node:fs');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  }
  console.log('Apps Script Web App health smoke test passed. Final HTTP status is 200 and health JSON matches the expected contract.');
}
main().catch(() => { console.error('::error::Unexpected smoke-test error. Response body was not printed.'); process.exit(1); });
