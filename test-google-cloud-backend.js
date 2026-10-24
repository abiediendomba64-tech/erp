/**
 * Integration-style tests for the Google Apps Script cloud workspace backend.
 * Executes the real CloudWorkspace.gs against in-memory Spreadsheet/Properties/LockService mocks.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('./google-apps-script/CloudWorkspace.gs', import.meta.url), 'utf8');

class MockRange {
  constructor(sheet, row, column, numRows = 1, numColumns = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }
  getValues() {
    const result = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numColumns; c++) {
        line.push(this.sheet.rows[this.row - 1 + r]?.[this.column - 1 + c] ?? '');
      }
      result.push(line);
    }
    return result;
  }
  getValue() {
    return this.sheet.rows[this.row - 1]?.[this.column - 1] ?? '';
  }
  setValues(values) {
    values.forEach((line, rowIndex) => {
      const r = this.row - 1 + rowIndex;
      while (this.sheet.rows.length <= r) this.sheet.rows.push([]);
      line.forEach((value, colIndex) => {
        this.sheet.rows[r][this.column - 1 + colIndex] = value;
      });
    });
    return this;
  }
  setValue(value) {
    while (this.sheet.rows.length < this.row) this.sheet.rows.push([]);
    const row = this.sheet.rows[this.row - 1];
    while (row.length < this.column) row.push('');
    row[this.column - 1] = value;
    return this;
  }
}

class MockSheet {
  constructor(name) { this.name = name; this.rows = []; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map((row) => row.length)); }
  getRange(row, col, rows = 1, cols = 1) { return new MockRange(this, row, col, rows, cols); }
  getDataRange() {
    return new MockRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }
  appendRow(row) { this.rows.push([...row]); }
  setFrozenRows() {}
  deleteRows(start, count) { this.rows.splice(start - 1, count); }
}

const sheetMap = new Map();
const spreadsheet = {
  getSheetByName(name) { return sheetMap.get(name) || null; },
  insertSheet(name) {
    if (sheetMap.has(name)) throw new Error('Sheet already exists: ' + name);
    const sheet = new MockSheet(name);
    sheetMap.set(name, sheet);
    return sheet;
  },
  getId() { return 'mock-sheet-id'; },
};
const properties = new Map([
  ['SPREADSHEET_ID', 'mock-sheet-id'],
  ['GOOGLE_OAUTH_CLIENT_ID', 'web-client-id.apps.googleusercontent.com'],
  ['ADMIN_EMAILS', 'admin@example.com'],
  ['ERP_FRONTEND_URL', 'https://erp.example.test'],
]);
let uuidCounter = 0;
const scriptCache = new Map();
let tokeninfoCalls = 0;
const future = Math.floor(Date.now() / 1000) + 3600;
const tokenClaims = {
  'admin-token': { email: 'admin@example.com', name: 'Admin Uji', sub: 'google-admin', aud: 'web-client-id.apps.googleusercontent.com', iss: 'https://accounts.google.com', email_verified: 'true', exp: String(future) },
  'finance-token': { email: 'finance@example.com', name: 'Finance Uji', sub: 'google-finance', aud: 'web-client-id.apps.googleusercontent.com', iss: 'https://accounts.google.com', email_verified: 'true', exp: String(future) },
  'project-token': { email: 'project@example.com', name: 'Project Uji', sub: 'google-project', aud: 'web-client-id.apps.googleusercontent.com', iss: 'accounts.google.com', email_verified: 'true', exp: String(future) },
  'viewer-token': { email: 'viewer@example.com', name: 'Viewer Uji', sub: 'google-viewer', aud: 'web-client-id.apps.googleusercontent.com', iss: 'accounts.google.com', email_verified: 'true', exp: String(future) },
  'outsider-token': { email: 'outsider@example.com', name: 'Outsider Uji', sub: 'google-outsider', aud: 'web-client-id.apps.googleusercontent.com', iss: 'accounts.google.com', email_verified: 'true', exp: String(future) },
  'wrong-audience-token': { email: 'admin@example.com', sub: 'google-admin', aud: 'some-other-client', iss: 'accounts.google.com', email_verified: 'true', exp: String(future) },
  'expired-token': { email: 'admin@example.com', sub: 'google-admin', aud: 'web-client-id.apps.googleusercontent.com', iss: 'accounts.google.com', email_verified: 'true', exp: '1' },
  'unverified-token': { email: 'admin@example.com', sub: 'google-admin', aud: 'web-client-id.apps.googleusercontent.com', iss: 'accounts.google.com', email_verified: 'false', exp: String(future) },
};

const context = {
  // In production this helper is defined in the sibling Code.gs Apps Script file.
  getErpSpreadsheet_: () => spreadsheet,
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: (name) => properties.get(name) || null }),
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => null,
    openById: (id) => {
      if (id !== 'mock-sheet-id') throw new Error('Unexpected spreadsheet ID');
      return spreadsheet;
    },
  },
  LockService: {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
  },
  UrlFetchApp: {
    fetch: (url) => {
      tokeninfoCalls++;
      const decoded = new URL(url).searchParams.get('id_token');
      const claims = tokenClaims[decoded];
      return {
        getResponseCode: () => claims ? 200 : 401,
        getContentText: () => JSON.stringify(claims || { error: 'invalid_token' }),
      };
    },
  },
  CacheService: {
    getScriptCache: () => ({
      get: (key) => scriptCache.get(key) || null,
      put: (key, value, ttl) => { scriptCache.set(key, value); },
    }),
  },
  Utilities: {
    getUuid: () => 'uuid-' + (++uuidCounter),
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: (_algorithm, value) =>
      Array.from(createHash('sha256').update(String(value), 'utf8').digest()).map((byte) => byte > 127 ? byte - 256 : byte),
  },
  console,
};
runInNewContext(source, context, { filename: 'CloudWorkspace.gs' });

function emptySnapshot() {
  const operationalKeys = [
    'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
    'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
    'anggaran', 'arusKas', 'ocr', 'whatsapp', 'menuConfig', 'qcRecords',
    'assets', 'taxRecords', 'housingUnits',
  ];
  const operational = Object.fromEntries(operationalKeys.map((key) => [key, []]));
  const accounting = Object.fromEntries(['akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'].map((key) => [key, []]));
  return { operational, accounting };
}

assert.equal(context.apiGetPublicConfig().configured, true);
const firstLogin = context.apiLogin('admin-token');
assert.equal(firstLogin.success, true);
assert.equal(firstLogin.user.role, 'ADMIN');
assert.equal(firstLogin.workspaces.length, 0);
const firstTokeninfoCalls = tokeninfoCalls;
context.apiLogin('admin-token');
assert.equal(tokeninfoCalls, firstTokeninfoCalls, 'validated token should be briefly cached to limit external requests');
console.log('PASS: verified allowlisted Google identity bootstraps ADMIN and verified token cache avoids repeated tokeninfo calls');

const seededSnapshot = emptySnapshot();
seededSnapshot.operational.housingUnits.push({ id: 'UNIT-SECRET', kode_unit: 'A-01', nilai_internal: 'secret' });
seededSnapshot.operational.penggajian.push({ id: 'PAYROLL-SECRET', nama: 'Gaji Rahasia', gaji_pokok: 999999 });
seededSnapshot.operational.tanah.push({
  id: 'LAND-1', pemilik: 'Pemilik Rahasia', luas_bt: 12, harga_per_bt: 900000, dp: 200000,
  status: 'DP', kode_bukti: 'BUKTI-SECRET', url_bukti: 'https://secret.example.test/land', catatan: 'Catatan rahasia',
});
seededSnapshot.operational.beko.push({
  id: 'BEKO-1', item: 'Pekerjaan rahasia', panjang: 1, lebar: 2, tinggi: 3, tarif: 500000,
  status: 'Lunas', kode_bukti: 'BUKTI-BEKO', url_bukti: 'https://secret.example.test/beko',
  catatan: 'Tarif rahasia', status_pembayaran: 'Lunas', satuan_volume: 'm3',
});
seededSnapshot.accounting.invoice.push({ id: 'INVOICE-SECRET', no_invoice: 'INV-SECRET', total: 987654 });
const created = context.apiCreateWorkspace('admin-token', 'Workspace Uji', seededSnapshot);
assert.equal(created.workspace.version, 1);
assert.equal(created.workspace.role, 'ADMIN');
const workspaceId = created.workspace.id;
const loadedInitial = context.apiLoadWorkspace('admin-token', workspaceId);
assert.equal(loadedInitial.snapshot.operational.bukuKas.length, 0);
assert.equal(loadedInitial.snapshot.operational.housingUnits[0].id, 'UNIT-SECRET');
console.log('PASS: cloud workspace initializes and checksum-validated snapshot can be loaded');

context.apiAddUser('admin-token', 'finance@example.com', 'KEUANGAN', 'Finance Uji', true);
context.apiAddWorkspaceMember('admin-token', workspaceId, 'finance@example.com', 'KEUANGAN');
context.apiAddUser('admin-token', 'viewer@example.com', 'VIEWER', 'Viewer Uji', true);
context.apiAddWorkspaceMember('admin-token', workspaceId, 'viewer@example.com', 'VIEWER');
context.apiAddUser('admin-token', 'project@example.com', 'PROYEK', 'Project Uji', true);
context.apiAddWorkspaceMember('admin-token', workspaceId, 'project@example.com', 'PROYEK');
context.apiAddUser('admin-token', 'outsider@example.com', 'VIEWER', 'Outsider Uji', true);

const financeLogin = context.apiLogin('finance-token');
assert.equal(financeLogin.workspaces[0].role, 'KEUANGAN');
const financeSnapshot = context.apiLoadWorkspace('finance-token', workspaceId).snapshot;
assert.equal(financeSnapshot.operational.housingUnits.length, 0, 'finance must not receive housing-unit private records');
assert.equal(financeSnapshot.operational.penggajian.length, 0, 'finance must not receive payroll records');
assert.equal(financeSnapshot.operational.tanah[0].harga_per_bt, 900000, 'finance can read project cost details needed for accounting');
assert.equal(financeSnapshot.accounting.invoice[0].id, 'INVOICE-SECRET', 'finance can read the accounting store');
financeSnapshot.operational.bukuKas.push({ id: 'CASH-1', keluar: 50000 });
const save = context.apiSaveWorkspace('finance-token', workspaceId, 1, financeSnapshot);
assert.equal(save.success, true);
assert.equal(save.version, 2);
console.log('PASS: KEUANGAN role can save an allowed finance change and advances cloud version');

const forbiddenProjectChange = context.apiLoadWorkspace('finance-token', workspaceId).snapshot;
forbiddenProjectChange.operational.housingUnits.push({ id: 'UNIT-FORBIDDEN' });
assert.throws(() => context.apiSaveWorkspace('finance-token', workspaceId, 2, forbiddenProjectChange), /tidak boleh mengubah modul operational\.housingUnits/);
console.log('PASS: KEUANGAN cannot write project/unit data');

const auditAppendSnapshot = context.apiLoadWorkspace('finance-token', workspaceId).snapshot;
auditAppendSnapshot.operational.auditLog.push({
  id: 'LOG-CLOUD-1', action: 'CREATE', record_id: 'CASH-1', note: 'append-only test',
});
const auditSave = context.apiSaveWorkspace('finance-token', workspaceId, 2, auditAppendSnapshot);
assert.equal(auditSave.success, true);
assert.equal(auditSave.version, 3);
const tamperAuditSnapshot = context.apiLoadWorkspace('finance-token', workspaceId).snapshot;
tamperAuditSnapshot.operational.auditLog[0].note = 'tampered';
assert.throws(
  () => context.apiSaveWorkspace('finance-token', workspaceId, 3, tamperAuditSnapshot),
  /append-only/
);
console.log('PASS: audit entries may be appended but existing audit history cannot be edited');

const staleSnapshot = context.apiLoadWorkspace('finance-token', workspaceId).snapshot;
const staleSave = context.apiSaveWorkspace('finance-token', workspaceId, 1, staleSnapshot);
assert.equal(staleSave.success, false);
assert.equal(staleSave.code, 'VERSION_CONFLICT');
assert.equal(staleSave.currentVersion, 3);
console.log('PASS: stale writes are rejected without overwriting the latest snapshot');

assert.throws(() => context.apiSaveWorkspace('viewer-token', workspaceId, 3, context.apiLoadWorkspace('admin-token', workspaceId).snapshot), /VIEWER/);

const projectSnapshot = context.apiLoadWorkspace('project-token', workspaceId).snapshot;
assert.equal(projectSnapshot.operational.bukuKas.length, 0, 'project role must not receive the cashbook');
assert.equal(projectSnapshot.operational.penggajian.length, 0, 'project role must not receive payroll');
assert.equal(projectSnapshot.accounting.invoice.length, 0, 'project role must not receive invoice/accounting details');
projectSnapshot.operational.bukuKas.push({ id: 'CASH-FORBIDDEN', keluar: 1 });
assert.throws(() => context.apiSaveWorkspace('project-token', workspaceId, 3, projectSnapshot), /tidak diizinkan/);

const viewerSnapshot = context.apiLoadWorkspace('viewer-token', workspaceId).snapshot;
assert.equal(viewerSnapshot.operational.bukuKas.length, 0);
assert.equal(viewerSnapshot.operational.tanah[0].pemilik, '');
assert.equal(viewerSnapshot.operational.tanah[0].harga_per_bt, 0);
assert.equal(viewerSnapshot.operational.tanah[0].dp, 0);
assert.equal(viewerSnapshot.operational.tanah[0].url_bukti, '');
assert.equal(viewerSnapshot.operational.beko[0].tarif, 0);
assert.equal(viewerSnapshot.operational.beko[0].status_pembayaran, undefined);
assert.equal(viewerSnapshot.accounting.invoice.length, 0);
assert.throws(() => context.apiGetWorkspaceAudit('viewer-token', workspaceId, 20), /ADMIN dan KEUANGAN/);
assert.throws(() => context.apiLoadWorkspace('outsider-token', workspaceId), /tidak memiliki akses/);
console.log('PASS: scoped roles receive filtered data, Viewer receives redacted progress only, and unauthorized writes/read access are rejected');

assert.throws(() => context.apiLogin('wrong-audience-token'), /aplikasi Google yang berbeda/);
assert.throws(() => context.apiLogin('expired-token'), /kedaluwarsa/);
assert.throws(() => context.apiLogin('unverified-token'), /belum terverifikasi/);
assert.throws(() => context.apiLogin('not-a-token'), /gagal diverifikasi/);
console.log('PASS: wrong audience, expired, unverified and invalid Google ID tokens are rejected');

const audit = context.apiGetWorkspaceAudit('admin-token', workspaceId, 100);
assert.ok(audit.events.some((event) => event.action === 'SNAPSHOT_SAVE_COMMITTED'));
assert.ok(audit.events.some((event) => event.action === 'WORKSPACE_CREATED'));
const fullStored = context.apiLoadWorkspace('admin-token', workspaceId).snapshot;
assert.equal(fullStored.operational.housingUnits[0].id, 'UNIT-SECRET', 'scoped save must preserve private modules');
assert.equal(fullStored.operational.penggajian[0].id, 'PAYROLL-SECRET', 'scoped save must preserve payroll');
console.log('PASS: scoped writes merge authorized modules without clearing hidden server records');

const chunkSheet = sheetMap.get('ERP_STATE_CHUNKS');
const targetChunk = chunkSheet.rows.find((row) => row[0] === workspaceId && Number(row[1]) === 3);
targetChunk[3] = String(targetChunk[3]) + 'tamper';
assert.throws(() => context.apiLoadWorkspace('admin-token', workspaceId), /Checksum snapshot cloud tidak cocok/);
console.log('PASS: backend audit events exist and tampered snapshot is rejected by checksum');
