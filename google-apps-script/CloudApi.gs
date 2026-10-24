/**
 * Authenticated Google Sheets API for the React ERP.
 * Deploy as Apps Script Web App. All private API actions require a verified
 * Google Sign-In ID token exchanged for an opaque, expiring server session.
 *
 * Script Properties required:
 * SPREADSHEET_ID, GOOGLE_CLIENT_ID, INITIAL_ADMIN_EMAIL
 *
 * User access is allow-listed in AUTH_USERS. Only INITIAL_ADMIN_EMAIL is
 * auto-enrolled as the first administrator. Never place secrets in React env.
 */
const CLOUD_SESSION_TTL_SECONDS_ = 21600; // six hours
const CLOUD_MAX_JSON_CHARS_ = 1500000;
const CLOUD_CHUNK_CHARS_ = 30000;

const CLOUD_OPERATIONAL_KEYS_ = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'menuConfig', 'qcRecords',
  'assets', 'taxRecords', 'housingUnits'
];
const CLOUD_ACCOUNTING_KEYS_ = ['akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'];
const CLOUD_ROLES_ = ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'];

function ensureCloudSchema_() {
  const ss = getErpSpreadsheet_();
  ensureSheetHeaders_(ss.getSheetByName('AUTH_USERS') || ss.insertSheet('AUTH_USERS'),
    ['email', 'nama', 'phone', 'role', 'status', 'created_at', 'updated_at']);
  ensureSheetHeaders_(ss.getSheetByName('AUTH_SESSIONS') || ss.insertSheet('AUTH_SESSIONS'),
    ['token_hash', 'email', 'created_at', 'expires_at', 'revoked_at']);
  ensureSheetHeaders_(ss.getSheetByName('ERP_WORKSPACES') || ss.insertSheet('ERP_WORKSPACES'),
    ['workspace_id', 'name', 'created_by', 'created_at']);
  ensureSheetHeaders_(ss.getSheetByName('ERP_MEMBERS') || ss.insertSheet('ERP_MEMBERS'),
    ['workspace_id', 'email', 'role', 'created_at', 'status']);
  ensureSheetHeaders_(ss.getSheetByName('ERP_STATE_HEAD') || ss.insertSheet('ERP_STATE_HEAD'),
    ['workspace_id', 'version', 'chunk_count', 'updated_at', 'updated_by']);
  ensureSheetHeaders_(ss.getSheetByName('ERP_RECORDS') || ss.insertSheet('ERP_RECORDS'),
    ['workspace_id', 'version', 'commit_id', 'namespace', 'module', 'record_id', 'payload_json', 'updated_at', 'updated_by', 'deleted']);
  ensureSheetHeaders_(ss.getSheetByName('ERP_COMMITS') || ss.insertSheet('ERP_COMMITS'),
    ['workspace_id', 'version', 'commit_id', 'committed_at', 'committed_by']);
  ensureSheetHeaders_(ss.getSheetByName('AUDIT_LOG') || ss.insertSheet('AUDIT_LOG'),
    ['id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan', 'workspace_id']);

}

function handleCloudApi_(request) {
  ensureCloudSchema_();
  const action = String(request && request.action || '');
  if (action === 'auth.login') return cloudLogin_(request.idToken);
  if (action === 'auth.health') return { success: true, backend: 'Google Apps Script', database: 'Google Sheets' };

  const session = requireCloudSession_(request.sessionToken);
  switch (action) {
    case 'auth.me':
      return { success: true, user: cloudPublicUser_(session.user), expiresAt: session.expiresAt };
    case 'auth.logout':
      revokeCloudSession_(request.sessionToken);
      return { success: true };
    case 'workspace.list':
      return { success: true, workspaces: listUserWorkspaces_(session.user) };
    case 'workspace.create':
      return createCloudWorkspace_(session.user, request.name, request.data);
    case 'workspace.load':
      return loadCloudWorkspace_(session.user, request.workspaceId);
    case 'audit.list':
      return listWorkspaceAudit_(session.user, request.workspaceId, request.limit);
    case 'state.save':
      return saveCloudWorkspaceState_(session.user, request.workspaceId, request.data, request.expectedVersion);
    case 'users.list':
      requireGlobalAdmin_(session.user);
      return { success: true, users: listCloudUsers_() };
    case 'users.upsert':
      requireGlobalAdmin_(session.user);
      return upsertCloudUser_(session.user, request.user);
    case 'workspace.member.add':
      requireGlobalAdmin_(session.user);
      return addCloudWorkspaceMember_(session.user, request.workspaceId, request.email, request.role);
    case 'document.upload':
      return uploadCloudDocument_(session.user, request.workspaceId, request.file);
    case 'ocr.process':
      return processCloudOcr_(session.user, request.workspaceId, request.fileId, request.documentType);
    default:
      throw new Error('Action API tidak dikenal.');
  }
}

function cloudLogin_(idToken) {
  const identity = verifyGoogleIdentityToken_(idToken);
  const email = String(identity.email || '').trim().toLowerCase();
  const ss = getErpSpreadsheet_();
  const usersSheet = ss.getSheetByName('AUTH_USERS');
  const rows = usersSheet.getDataRange().getValues();
  const headers = rows[0].map(String);
  let rowIndex = -1;
  let user = null;

  for (let i = 1; i < rows.length; i++) {
    const record = cloudRowToObject_(headers, rows[i]);
    if (String(record.email || '').trim().toLowerCase() === email) {
      rowIndex = i + 1;
      user = record;
      break;
    }
  }

  if (!user) {
    const initialAdmin = String(PropertiesService.getScriptProperties().getProperty('INITIAL_ADMIN_EMAIL') || '').trim().toLowerCase();
    if (!initialAdmin || email !== initialAdmin) {
      throw new Error('Akun belum diizinkan. Minta Admin menambahkan email Anda pada menu Manajemen User.');
    }
    const newRow = {
      email: email,
      nama: String(identity.name || email.split('@')[0]),
      phone: '',
      role: 'ADMIN',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    usersSheet.appendRow(headers.map(header => newRow[header] === undefined ? '' : newRow[header]));
    user = newRow;
  }

  if (String(user.status || '').toLowerCase() !== 'active') throw new Error('Akun Anda dinonaktifkan. Hubungi administrator.');
  if (CLOUD_ROLES_.indexOf(String(user.role || '')) === -1) throw new Error('Role pengguna tidak valid. Minta Admin memperbaikinya di AUTH_USERS.');

  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const now = new Date();
  const expires = new Date(now.getTime() + CLOUD_SESSION_TTL_SECONDS_ * 1000);
  const sessions = ss.getSheetByName('AUTH_SESSIONS');
  sessions.appendRow([cloudSha256_(token), email, now.toISOString(), expires.toISOString(), '']);
  if (rowIndex > 0) {
    const updatedCol = headers.indexOf('updated_at') + 1;
    if (updatedCol > 0) usersSheet.getRange(rowIndex, updatedCol).setValue(now.toISOString());
  }
  cloudAudit_(email, 'LOGIN', 'AUTH_USERS', email, '', 'Google Sign-In verified');
  return { success: true, sessionToken: token, user: cloudPublicUser_(user), expiresAt: expires.toISOString() };
}

function verifyGoogleIdentityToken_(idToken) {
  const token = String(idToken || '').trim();
  if (!token || token.length > 12000) throw new Error('Google Sign-In token kosong atau tidak valid.');
  const clientId = String(PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || '').trim();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID belum diset pada Apps Script > Project Settings > Script Properties.');

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', {
    method: 'post', payload: { id_token: token }, muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Token Google ditolak atau sudah kedaluwarsa. Silakan login kembali.');
  const claims = JSON.parse(response.getContentText());
  const issuer = String(claims.iss || '');
  const verifiedEmail = claims.email_verified === true || String(claims.email_verified).toLowerCase() === 'true';
  const expires = Number(claims.exp || 0);
  if (claims.aud !== clientId ||
      (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') ||
      !verifiedEmail || !claims.email ||
      !isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) {
    throw new Error('Identitas Google tidak lolos validasi audience, issuer, email, atau masa berlaku.');
  }
  return claims;
}

function requireCloudSession_(token) {
  const value = String(token || '').trim();
  if (!value || value.length > 200) throw new Error('Sesi tidak ditemukan. Silakan login kembali.');
  const digest = cloudSha256_(value);
  const sheet = getErpSpreadsheet_().getSheetByName('AUTH_SESSIONS');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Sesi tidak valid. Silakan login kembali.');
  const headers = values[0].map(String);
  for (let i = values.length - 1; i >= 1; i--) {
    const row = cloudRowToObject_(headers, values[i]);
    if (String(row.token_hash || '') !== digest) continue;
    const expiry = new Date(row.expires_at).getTime();
    if (row.revoked_at || !isFinite(expiry) || expiry <= Date.now()) {
      throw new Error('Sesi telah habis atau dicabut. Silakan login kembali.');
    }
    const user = findCloudUser_(String(row.email || ''));
    if (!user || String(user.status || '').toLowerCase() !== 'active') {
      throw new Error('Akun tidak aktif. Hubungi administrator.');
    }
    return { email: user.email, user: user, expiresAt: new Date(expiry).toISOString() };
  }
  throw new Error('Sesi tidak valid. Silakan login kembali.');
}

function revokeCloudSession_(token) {
  const digest = cloudSha256_(String(token || ''));
  const sheet = getErpSpreadsheet_().getSheetByName('AUTH_SESSIONS');
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0] || '') === digest) {
      sheet.getRange(i + 1, 5).setValue(new Date().toISOString());
      break;
    }
  }
}

function createCloudWorkspace_(user, name, data) {
  requireGlobalAdmin_(user);
  const workspaceName = String(name || '').trim();
  if (workspaceName.length < 2 || workspaceName.length > 100) throw new Error('Nama workspace wajib 2-100 karakter.');
  validateCloudWorkspaceData_(data);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getErpSpreadsheet_();
    const id = Utilities.getUuid();
    const now = new Date().toISOString();
    ss.getSheetByName('ERP_WORKSPACES').appendRow([id, workspaceName, user.email, now]);
    ss.getSheetByName('ERP_MEMBERS').appendRow([id, user.email, 'ADMIN', now, 'active']);
    const initialCommitId = Utilities.getUuid();
    const recordCount = writeCloudRecords_(id, 1, initialCommitId, data, user.email, now);
    ss.getSheetByName('ERP_STATE_HEAD').appendRow([id, 1, recordCount, now, user.email]);
    cloudAudit_(user.email, 'CREATE_WORKSPACE', 'ERP_WORKSPACES', id, '', workspaceName);
    return { success: true, workspace_id: id, name: workspaceName, role: 'ADMIN', version: 1 };
  } finally {
    lock.releaseLock();
  }
}

function listUserWorkspaces_(user) {
  const ss = getErpSpreadsheet_();
  const workspaces = ss.getSheetByName('ERP_WORKSPACES').getDataRange().getValues();
  const members = ss.getSheetByName('ERP_MEMBERS').getDataRange().getValues();
  const heads = ss.getSheetByName('ERP_STATE_HEAD').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < members.length; i++) {
    const member = members[i];
    if (String(member[1] || '').toLowerCase() !== String(user.email || '').toLowerCase() ||
        String(member[4] || 'active').toLowerCase() !== 'active') continue;
    const workspaceId = String(member[0] || '');
    const workspace = workspaces.slice(1).find(row => String(row[0]) === workspaceId);
    if (!workspace) continue;
    const head = heads.slice(1).find(row => String(row[0]) === workspaceId);
    result.push({
      workspace_id: workspaceId,
      name: String(workspace[1] || ''),
      role: String(member[2] || ''),
      version: head ? Number(head[1]) || 1 : 1
    });
  }
  return result;
}

function loadCloudWorkspace_(user, workspaceId) {
  const membership = findCloudMembership_(String(workspaceId || ''), user.email);
  if (!membership) throw new Error('Anda tidak memiliki akses ke workspace ini.');
  const ss = getErpSpreadsheet_();
  const workspace = ss.getSheetByName('ERP_WORKSPACES').getDataRange().getValues().slice(1)
    .find(row => String(row[0]) === String(workspaceId));
  if (!workspace) throw new Error('Workspace tidak ditemukan.');
  const stored = readCloudWorkspaceState_(String(workspaceId));
  return {
    success: true,
    workspace: { workspace_id: String(workspace[0]), name: String(workspace[1]), role: membership.role },
    data: scopeCloudWorkspaceData_(stored.data, membership.role),
    version: stored.version
  };
}

function saveCloudWorkspaceState_(user, workspaceId, data, expectedVersion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const membership = findCloudMembership_(String(workspaceId || ''), user.email);
    if (!membership) throw new Error('Anda tidak memiliki akses ke workspace ini.');
    if (membership.role === 'VIEWER') throw new Error('Role VIEWER hanya boleh membaca data.');
    const current = readCloudWorkspaceState_(String(workspaceId));
    const expected = Number(expectedVersion);
    if (!Number.isInteger(expected) || expected !== current.version) {
      return { success: true, saved: false, version: current.version, error_code: 'conflict' };
    }
    validateCloudWorkspaceData_(data);
    const scoped = restoreHiddenCloudModules_(current.data, data, membership.role);
    authorizeCloudStateChanges_(current.data, scoped, membership.role);
    const nextVersion = current.version + 1;
    const now = new Date().toISOString();
    const commitId = Utilities.getUuid();
    const changes = writeCloudRecordDiff_(String(workspaceId), nextVersion, commitId, current.data, scoped, user.email, now);
    if (changes.total === 0) {
      return { success: true, saved: true, version: current.version, error_code: null, records_changed: 0, records_deleted: 0 };
    }
    updateCloudStateHead_(String(workspaceId), nextVersion, changes.recordCount, now, user.email);
    return { success: true, saved: true, version: nextVersion, error_code: null, records_changed: changes.changed, records_deleted: changes.deleted };
  } finally {
    lock.releaseLock();
  }
}

function validateCloudWorkspaceData_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      !data.operational || typeof data.operational !== 'object' || Array.isArray(data.operational) ||
      !data.accounting || typeof data.accounting !== 'object' || Array.isArray(data.accounting)) {
    throw new Error('Snapshot workspace harus memiliki object operational dan accounting.');
  }
  CLOUD_OPERATIONAL_KEYS_.forEach(key => {
    if (!Array.isArray(data.operational[key])) throw new Error('Bagian operational tidak valid: ' + key);
  });
  CLOUD_ACCOUNTING_KEYS_.forEach(key => {
    if (!Array.isArray(data.accounting[key])) throw new Error('Bagian accounting tidak valid: ' + key);
  });
  const json = JSON.stringify(data);
  if (json.length > CLOUD_MAX_JSON_CHARS_) throw new Error('Snapshot ERP terlalu besar. Pindahkan file/foto ke Google Drive; batas snapshot 1,5 juta karakter.');
}

function cloudAllowedModules_(role) {
  if (role === 'ADMIN') {
    return {
      operational: CLOUD_OPERATIONAL_KEYS_.slice(),
      accounting: CLOUD_ACCOUNTING_KEYS_.slice()
    };
  }
  if (role === 'KEUANGAN') {
    return {
      operational: ['bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko', 'notaMaterial', 'anggaran', 'arusKas', 'ocr', 'whatsapp', 'taxRecords'],
      accounting: CLOUD_ACCOUNTING_KEYS_.slice()
    };
  }
  if (role === 'PROYEK') {
    return {
      operational: ['tanah', 'beko', 'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'anggaran', 'auditLog', 'arsipBukti', 'ocr', 'qcRecords', 'assets', 'housingUnits', 'whatsapp'],
      accounting: []
    };
  }
  if (role === 'VIEWER') {
    return {
      operational: ['tanah', 'beko'],
      accounting: []
    };
  }
  throw new Error('Role workspace tidak dikenal.');
}

function scopeCloudWorkspaceData_(fullData, role) {
  const allowed = cloudAllowedModules_(role);
  const result = { operational: {}, accounting: {} };
  CLOUD_OPERATIONAL_KEYS_.forEach(key => {
    result.operational[key] = allowed.operational.indexOf(key) >= 0
      ? fullData.operational[key]
      : [];
  });
  CLOUD_ACCOUNTING_KEYS_.forEach(key => {
    result.accounting[key] = allowed.accounting.indexOf(key) >= 0
      ? fullData.accounting[key]
      : [];
  });
  return result;
}

function restoreHiddenCloudModules_(currentData, incomingData, role) {
  const allowed = cloudAllowedModules_(role);
  const result = { operational: {}, accounting: {} };
  CLOUD_OPERATIONAL_KEYS_.forEach(key => {
    result.operational[key] = allowed.operational.indexOf(key) >= 0
      ? incomingData.operational[key]
      : currentData.operational[key];
  });
  CLOUD_ACCOUNTING_KEYS_.forEach(key => {
    result.accounting[key] = allowed.accounting.indexOf(key) >= 0
      ? incomingData.accounting[key]
      : currentData.accounting[key];
  });
  validateCloudWorkspaceData_(result);
  return result;
}

function validateAppendOnlyAuditLog_(oldRows, newRows) {
  const next = new Map();
  newRows.forEach(row => {
    const id = String(row && row.id || '');
    if (!id) throw new Error('Setiap entri audit wajib memiliki ID.');
    if (next.has(id)) throw new Error('ID audit duplikat: ' + id);
    next.set(id, JSON.stringify(row));
  });
  oldRows.forEach(row => {
    const id = String(row && row.id || '');
    if (!id || !next.has(id) || next.get(id) !== JSON.stringify(row)) {
      throw new Error('Audit log bersifat append-only. Entri lama tidak boleh diubah/dihapus. Buat entri koreksi dengan alasan dan sumber.');
    }
  });
}

function authorizeCloudStateChanges_(oldData, newData, role) {
  validateAppendOnlyAuditLog_(oldData.operational.auditLog, newData.operational.auditLog);
  if (role === 'ADMIN') return;
  const financialOps = [
    'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
    'notaMaterial', 'anggaran', 'arusKas', 'ocr', 'whatsapp', 'taxRecords'
  ];
  const projectOps = [
    'auditLog', 'tanah', 'beko', 'notaMaterial', 'stok', 'produksi',
    'penjualan', 'pembelian', 'anggaran', 'arsipBukti', 'ocr', 'qcRecords',
    'assets', 'housingUnits', 'whatsapp'
  ];
  const allowedOperational = role === 'KEUANGAN' ? financialOps : role === 'PROYEK' ? projectOps : [];
  const allowedAccounting = role === 'KEUANGAN' ? CLOUD_ACCOUNTING_KEYS_ : [];
  const allowedOpsSet = new Set(allowedOperational);
  const allowedAccountingSet = new Set(allowedAccounting);

  CLOUD_OPERATIONAL_KEYS_.forEach(key => {
    if (JSON.stringify(oldData.operational[key]) !== JSON.stringify(newData.operational[key]) && !allowedOpsSet.has(key)) {
      throw new Error('Role ' + role + ' tidak boleh mengubah modul ' + key + '.');
    }
  });
  CLOUD_ACCOUNTING_KEYS_.forEach(key => {
    if (JSON.stringify(oldData.accounting[key]) !== JSON.stringify(newData.accounting[key]) && !allowedAccountingSet.has(key)) {
      throw new Error('Role ' + role + ' tidak boleh mengubah modul akuntansi ' + key + '.');
    }
  });
}

function readCloudWorkspaceState_(workspaceId) {
  const ss = getErpSpreadsheet_();
  const headRows = ss.getSheetByName('ERP_STATE_HEAD').getDataRange().getValues();
  const head = headRows.slice(1).find(row => String(row[0]) === workspaceId);
  if (!head) throw new Error('Workspace cloud belum memiliki versi data.');
  const version = Number(head[1]);
  if (!Number.isInteger(version) || version < 1) throw new Error('Versi workspace tidak valid.');

  // Only record events whose commit marker is the last marker for that version.
  // This prevents an interrupted write to an uncommitted version from leaking into data.
  const committedIds = new Map();
  const commitRows = ss.getSheetByName('ERP_COMMITS').getDataRange().getValues();
  for (let i = 1; i < commitRows.length; i++) {
    const row = commitRows[i];
    const rowVersion = Number(row[1]);
    if (String(row[0]) === workspaceId && Number.isInteger(rowVersion) && rowVersion <= version) {
      committedIds.set(rowVersion, String(row[2] || ''));
    }
  }
  for (let committedVersion = 1; committedVersion <= version; committedVersion++) {
    if (!committedIds.has(committedVersion) || !committedIds.get(committedVersion)) {
      throw new Error('Riwayat commit cloud tidak lengkap pada versi ' + committedVersion + '. Jangan menimpa data; minta Admin memeriksa ERP_COMMITS.');
    }
  }

  const latest = new Map();
  const rows = ss.getSheetByName('ERP_RECORDS').getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowVersion = Number(row[1]);
    if (String(row[0]) !== workspaceId || !Number.isInteger(rowVersion) || rowVersion > version) continue;
    if (String(row[2] || '') !== committedIds.get(rowVersion)) continue;
    const namespace = String(row[3] || '');
    const moduleName = String(row[4] || '');
    const recordId = String(row[5] || '');
    const key = [namespace, moduleName, recordId].join('|');
    latest.set(key, {
      namespace: namespace,
      module: moduleName,
      id: recordId,
      json: String(row[6] || ''),
      deleted: String(row[9]).toLowerCase() === 'true'
    });
  }

  const data = { operational: {}, accounting: {} };
  CLOUD_OPERATIONAL_KEYS_.forEach(key => data.operational[key] = []);
  CLOUD_ACCOUNTING_KEYS_.forEach(key => data.accounting[key] = []);
  latest.forEach(record => {
    if (record.deleted) return;
    if ((record.namespace !== 'operational' && record.namespace !== 'accounting') ||
        !Object.prototype.hasOwnProperty.call(data[record.namespace], record.module)) {
      throw new Error('Database berisi record dengan namespace/modul yang tidak dikenal. Tidak ada perubahan ditulis.');
    }
    let payload;
    try {
      payload = JSON.parse(record.json);
    } catch (error) {
      throw new Error('Record cloud rusak pada ' + record.module + '/' + record.id + '. Periksa backup sebelum melanjutkan.');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Record cloud bukan object pada ' + record.module + '/' + record.id + '.');
    }
    data[record.namespace][record.module].push(payload);
  });
  validateCloudWorkspaceData_(data);
  return { version: version, data: data };
}

function writeCloudRecords_(workspaceId, version, commitId, data, email, timestamp) {
  const rows = [];
  flattenCloudRecords_(data).forEach(record => {
    rows.push([workspaceId, version, commitId, record.namespace, record.module, record.id, record.json, timestamp, email, false]);
  });
  const sheet = getErpSpreadsheet_().getSheetByName('ERP_RECORDS');
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  getErpSpreadsheet_().getSheetByName('ERP_COMMITS').appendRow([workspaceId, version, commitId, timestamp, email]);
  return rows.length;
}

function writeCloudRecordDiff_(workspaceId, version, commitId, oldData, newData, email, timestamp) {
  const ss = getErpSpreadsheet_();
  const recordsSheet = ss.getSheetByName('ERP_RECORDS');
  const oldRecords = flattenCloudRecords_(oldData);
  const newRecords = flattenCloudRecords_(newData);
  const changes = [];
  let deleted = 0;

  oldRecords.forEach((record, key) => {
    if (!newRecords.has(key)) {
      changes.push({ key, old: record, next: null, deleted: true });
      deleted++;
    }
  });
  newRecords.forEach((record, key) => {
    const old = oldRecords.get(key);
    if (!old || old.json !== record.json) changes.push({ key, old: old || null, next: record, deleted: false });
  });

  if (changes.length === 0) return { changed: 0, deleted: 0, total: 0, recordCount: newRecords.size };
  if (changes.length > 150) throw new Error('Satu penyimpanan mengubah lebih dari 150 record. Pecah perubahan menjadi beberapa penyimpanan agar Apps Script tetap ringan.');

  const auditSheet = ss.getSheetByName('AUDIT_LOG') || ss.insertSheet('AUDIT_LOG');
  ensureSheetHeaders_(auditSheet, ['id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan', 'workspace_id']);
  const eventRows = [];
  const auditRows = [];

  changes.forEach(change => {
    const [namespace, moduleName, recordId] = change.key.split('|');
    const payload = change.next ? change.next.json : change.old.json;
    if (payload.length > 30000) throw new Error('Record ' + moduleName + '/' + recordId + ' melampaui batas 30.000 karakter.');
    eventRows.push([workspaceId, version, commitId, namespace, moduleName, recordId, payload, timestamp, email, change.deleted]);
    auditRows.push([
      'LOG-' + Utilities.getUuid(),
      timestamp,
      email,
      change.deleted ? 'DELETE_RECORD' : change.old ? 'UPDATE_RECORD' : 'CREATE_RECORD',
      namespace + '.' + moduleName,
      recordId,
      change.old ? change.old.json : '',
      change.next ? change.next.json : '',
      'ERP cloud versioned save; candidate commit=' + commitId + '; version=' + version,
      workspaceId
    ]);
  });

  // Append-only record events and per-record audit are staged first. The commit marker and
  // then the workspace head make them visible. Uncommitted versions are ignored on read.
  if (eventRows.length) recordsSheet.getRange(recordsSheet.getLastRow() + 1, 1, eventRows.length, eventRows[0].length).setValues(eventRows);
  if (auditRows.length) auditSheet.getRange(auditSheet.getLastRow() + 1, 1, auditRows.length, auditRows[0].length).setValues(auditRows);
  ss.getSheetByName('ERP_COMMITS').appendRow([workspaceId, version, commitId, timestamp, email]);
  return { changed: changes.length - deleted, deleted: deleted, total: changes.length, recordCount: newRecords.size };
}

function flattenCloudRecords_(data) {
  const map = new Map();
  ['operational', 'accounting'].forEach(namespace => {
    Object.keys(data[namespace]).forEach(moduleName => {
      const records = data[namespace][moduleName];
      if (!Array.isArray(records)) throw new Error('Modul harus berupa array: ' + moduleName);
      const seen = new Set();
      records.forEach(record => {
        const id = cloudRecordId_(moduleName, record);
        if (seen.has(id)) throw new Error('ID duplikat pada modul ' + moduleName + ': ' + id);
        seen.add(id);
        const json = JSON.stringify(record);
        if (json.length > 30000) throw new Error('Record ' + moduleName + '/' + id + ' lebih dari 30.000 karakter. Simpan foto/PDF di Google Drive dan hanya simpan tautannya.');
        map.set([namespace, moduleName, id].join('|'), {
          namespace: namespace, module: moduleName, id: id, json: json
        });
      });
    });
  });
  return map;
}

function cloudRecordId_(moduleName, record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Setiap record pada modul ' + moduleName + ' harus berupa object.');
  }
  const candidate = record.id || record.kode || record.kode_unit || record.no_invoice ||
    record.no_po || record.kode_aset || record.kode_utang || record.nip || record.no_ref;
  const id = String(candidate || '').trim();
  if (!id || id.length > 200 || /[|\\r\\n]/.test(id)) {
    throw new Error('Setiap record pada modul ' + moduleName + ' wajib memiliki ID/kode unik yang stabil.');
  }
  return id;
}

function updateCloudStateHead_(workspaceId, version, recordCount, timestamp, email) {
  const sheet = getErpSpreadsheet_().getSheetByName('ERP_STATE_HEAD');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === workspaceId) {
      sheet.getRange(i + 1, 2, 1, 4).setValues([[version, recordCount, timestamp, email]]);
      return;
    }
  }
  sheet.appendRow([workspaceId, version, recordCount, timestamp, email]);
}

function findCloudMembership_(workspaceId, email) {
  const rows = getErpSpreadsheet_().getSheetByName('ERP_MEMBERS').getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === workspaceId &&
        String(rows[i][1] || '').toLowerCase() === String(email || '').toLowerCase() &&
        String(rows[i][4] || 'active').toLowerCase() === 'active') {
      const role = String(rows[i][2] || '');
      if (CLOUD_ROLES_.indexOf(role) === -1) throw new Error('Role workspace tidak valid.');
      return { role: role };
    }
  }
  return null;
}

function findCloudUser_(email) {
  const sheet = getErpSpreadsheet_().getSheetByName('AUTH_USERS');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  for (let i = 1; i < values.length; i++) {
    const user = cloudRowToObject_(headers, values[i]);
    if (String(user.email || '').toLowerCase() === String(email || '').toLowerCase()) return user;
  }
  return null;
}

function cloudPublicUser_(user) {
  return {
    email: String(user.email || ''),
    nama: String(user.nama || ''),
    phone: String(user.phone || ''),
    role: String(user.role || 'VIEWER'),
    status: String(user.status || '')
  };
}

function requireGlobalAdmin_(user) {
  if (!user || user.role !== 'ADMIN' || String(user.status || '').toLowerCase() !== 'active') {
    throw new Error('Fitur ini hanya tersedia untuk Admin.');
  }
}

function listCloudUsers_() {
  const sheet = getErpSpreadsheet_().getSheetByName('AUTH_USERS');
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const user = cloudRowToObject_(headers, row);
      return {
        id: String(user.email || ''),
        email: String(user.email || ''),
        nama: String(user.nama || ''),
        phone: String(user.phone || ''),
        role: String(user.role || 'VIEWER'),
        status: String(user.status || 'inactive'),
        createdAt: String(user.created_at || ''),
        updatedAt: String(user.updated_at || '')
      };
    });
}

function upsertCloudUser_(actor, input) {
  if (!input || typeof input !== 'object') throw new Error('Data pengguna tidak valid.');
  const email = String(input.email || '').trim().toLowerCase();
  const nama = String(input.nama || '').trim();
  const phone = String(input.phone || '').trim();
  const role = String(input.role || '');
  const status = String(input.status || 'active').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email pengguna tidak valid.');
  if (!nama || nama.length > 100) throw new Error('Nama wajib diisi (maksimal 100 karakter).');
  if (CLOUD_ROLES_.indexOf(role) === -1) throw new Error('Role tidak valid.');
  if (status !== 'active' && status !== 'inactive') throw new Error('Status pengguna tidak valid.');
  const now = new Date().toISOString();
  const sheet = getErpSpreadsheet_().getSheetByName('AUTH_USERS');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(String);
  let rowIndex = -1;
  let oldRecord = null;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').toLowerCase() === email) {
      rowIndex = i + 1;
      oldRecord = cloudRowToObject_(headers, rows[i]);
      break;
    }
  }
  const initialAdmin = String(PropertiesService.getScriptProperties().getProperty('INITIAL_ADMIN_EMAIL') || '').trim().toLowerCase();
  if (email === initialAdmin && (role !== 'ADMIN' || status !== 'active')) {
    throw new Error('Akun INITIAL_ADMIN_EMAIL wajib tetap aktif dengan role ADMIN.');
  }
  if (oldRecord && oldRecord.role === 'ADMIN' && oldRecord.status === 'active' && (role !== 'ADMIN' || status !== 'active')) {
    const activeAdmins = rows.slice(1).filter(row => String(row[3]) === 'ADMIN' && String(row[4]).toLowerCase() === 'active');
    if (activeAdmins.length <= 1) throw new Error('Tidak boleh menonaktifkan Admin aktif terakhir.');
  }
  const record = {
    email: email, nama: nama, phone: phone, role: role, status: status,
    created_at: oldRecord ? oldRecord.created_at : now, updated_at: now
  };
  const values = headers.map(header => record[header] === undefined ? '' : record[header]);
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);

  // For existing memberships, keep the user's workspace role no higher than the global role.
  const members = getErpSpreadsheet_().getSheetByName('ERP_MEMBERS');
  const memberRows = members.getDataRange().getValues();
  const rank = { VIEWER: 1, PROYEK: 2, KEUANGAN: 3, ADMIN: 4 };
  for (let i = 1; i < memberRows.length; i++) {
    if (String(memberRows[i][1] || '').toLowerCase() !== email) continue;
    if (status !== 'active') {
      members.getRange(i + 1, 5).setValue('inactive');
    } else if ((rank[String(memberRows[i][2])] || 0) > rank[role]) {
      members.getRange(i + 1, 3).setValue(role);
    }
  }
  cloudAudit_(actor.email, 'UPSERT_USER', 'AUTH_USERS', email, oldRecord ? JSON.stringify(oldRecord) : '', JSON.stringify(record));
  return { success: true, user: { id: email, email: email, nama: nama, phone: phone, role: role, status: status, createdAt: record.created_at, updatedAt: now } };
}

function addCloudWorkspaceMember_(actor, workspaceId, emailValue, role) {
  const workspace = String(workspaceId || '');
  const email = String(emailValue || '').trim().toLowerCase();
  const memberRole = String(role || '');
  if (CLOUD_ROLES_.indexOf(memberRole) === -1) throw new Error('Role workspace tidak valid.');
  const target = findCloudUser_(email);
  if (!target || String(target.status || '').toLowerCase() !== 'active') throw new Error('Email belum terdaftar/aktif pada AUTH_USERS.');
  const rank = { VIEWER: 1, PROYEK: 2, KEUANGAN: 3, ADMIN: 4 };
  if (rank[memberRole] > rank[String(target.role || 'VIEWER')]) throw new Error('Role workspace tidak boleh melebihi role global pengguna.');
  if (!getErpSpreadsheet_().getSheetByName('ERP_WORKSPACES').getDataRange().getValues().slice(1).some(row => String(row[0]) === workspace)) {
    throw new Error('Workspace tidak ditemukan.');
  }
  const sheet = getErpSpreadsheet_().getSheetByName('ERP_MEMBERS');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === workspace && String(rows[i][1] || '').toLowerCase() === email) {
      sheet.getRange(i + 1, 3, 1, 3).setValues([[memberRole, new Date().toISOString(), 'active']]);
      cloudAudit_(actor.email, 'UPDATE_WORKSPACE_MEMBER', 'ERP_MEMBERS', workspace + ':' + email, '', memberRole);
      return { success: true };
    }
  }
  sheet.appendRow([workspace, email, memberRole, new Date().toISOString(), 'active']);
  cloudAudit_(actor.email, 'ADD_WORKSPACE_MEMBER', 'ERP_MEMBERS', workspace + ':' + email, '', memberRole);
  return { success: true };
}

function cloudAudit_(email, action, table, recordId, oldValue, newValue) {
  const ss = getErpSpreadsheet_();
  const sheet = ss.getSheetByName('AUDIT_LOG') || ss.insertSheet('AUDIT_LOG');
  ensureSheetHeaders_(sheet, ['id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan', 'workspace_id']);
  let workspaceId = '';
  if (table === 'ERP_WORKSPACES') workspaceId = String(recordId || '');
  else if (table === 'ERP_MEMBERS') workspaceId = String(recordId || '').split(':')[0];
  else if (table === 'ERP_STATE') workspaceId = String(recordId || '');
  else {
    try {
      const parsed = JSON.parse(String(newValue || ''));
      workspaceId = String(parsed.workspace_id || '');
    } catch (_) {
      workspaceId = '';
    }
  }
  sheet.appendRow([
    'LOG-' + Utilities.getUuid(), new Date().toISOString(), email, action, table,
    recordId, String(oldValue || ''), String(newValue || ''), 'Google Apps Script server action', workspaceId
  ]);
}

function listWorkspaceAudit_(user, workspaceId, requestedLimit) {
  const id = String(workspaceId || '').trim();
  const membership = findCloudMembership_(id, user.email);
  if (!membership) throw new Error('Anda tidak memiliki akses audit ke workspace ini.');
  const allowed = cloudAllowedModules_(membership.role);
  const maxRows = Math.max(10, Math.min(500, Number(requestedLimit) || 200));
  const ss = getErpSpreadsheet_();
  const sheet = ss.getSheetByName('AUDIT_LOG');
  if (!sheet || sheet.getLastRow() < 2) return { success: true, audit: [] };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const result = [];
  for (let i = values.length - 1; i >= 1 && result.length < maxRows; i--) {
    const record = cloudRowToObject_(headers, values[i]);
    if (String(record.workspace_id || '') !== id) continue;
    const tableName = String(record.tabel || '');
    const match = /^(operational|accounting)\.(.+)$/.exec(tableName);
    if (match) {
      const list = match[1] === 'operational' ? allowed.operational : allowed.accounting;
      if (list.indexOf(match[2]) < 0) continue;
    } else if (['ERP_WORKSPACES', 'ERP_MEMBERS'].includes(tableName) && membership.role !== 'ADMIN') {
      continue;
    }
    result.push({
      id: String(record.id || ''),
      timestamp: String(record.timestamp || ''),
      user: String(record.user || ''),
      aksi: String(record.aksi || ''),
      tabel: tableName,
      record_id: String(record.record_id || ''),
      nilai_lama: String(record.nilai_lama || ''),
      nilai_baru: String(record.nilai_baru || ''),
      alasan: String(record.alasan || ''),
      workspace_id: String(record.workspace_id || '')
    });
  }
  return { success: true, audit: result };
}

function cloudRowToObject_(headers, row) {
  return headers.reduce((result, header, index) => {
    if (header) result[header] = row[index];
    return result;
  }, {});
}

function cloudSha256_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
}
