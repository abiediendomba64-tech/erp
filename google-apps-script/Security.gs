/**
 * ERP cloud identity, workspace state and permission gateway.
 * All callable bridge actions validate Google's ID token server-side.
 * Configure Script Properties: SPREADSHEET_ID (if not sheet-bound),
 * GOOGLE_CLIENT_ID, ERP_FRONTEND_URL, ERP_ADMIN_EMAILS (comma-separated).
 */

function doGet(e) {
  var path = String(e && e.parameter && e.parameter.path || '').trim();
  if (path === '/health') {
    return jsonResponse_({ success: true, service: 'erp-google-apps-script', authRequired: true });
  }
  // Legacy REST read routes are intentionally disabled. They bypassed authenticated RPC.
  if (path) {
    return jsonResponse_({
      success: false,
      code: 'legacy_api_disabled',
      error: 'Endpoint REST lama dinonaktifkan. Buka panel ERP dan masuk dengan Google.'
    });
  }

  var config = getCloudConfig_();
  if (!config.frontendUrl || !config.googleClientId) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<body style="font:16px Arial,sans-serif;max-width:720px;margin:48px auto;padding:0 20px;color:#172033">' +
      '<h1>ERP Properti &amp; Konstruksi</h1><p>Backend belum dikonfigurasi sepenuhnya.</p>' +
      '<p>Isi Script Properties <code>ERP_FRONTEND_URL</code>, <code>GOOGLE_CLIENT_ID</code>, dan <code>ERP_ADMIN_EMAILS</code>, ' +
      'lalu muat ulang URL Web App.</p><p>Jangan bagikan spreadsheet database kepada pengguna aplikasi.</p></body></html>'
    ).setTitle('Setup Backend ERP');
  }

  var template = HtmlService.createTemplateFromFile('Wrapper');
  template.frontendUrl = config.frontendUrl;
  template.frontendOrigin = config.frontendOrigin;
  return template.evaluate()
    .setTitle('ERP Properti & Konstruksi')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Public Google Apps Script bridge entry. The token is verified against Google's
 * tokeninfo endpoint and checked against the configured OAuth client ID.
 */
function apiDispatch(request) {
  try {
    if (!request || typeof request !== 'object') throw apiError_('invalid_request', 'Permintaan tidak valid.');
    var action = String(request.action || '');
    var payload = request.payload && typeof request.payload === 'object' ? request.payload : {};
    var idToken = String(request.idToken || '');
    var identity = verifyGoogleIdToken_(idToken);
    var user = resolveErpUser_(identity);
    if (user.status !== 'active') throw apiError_('user_inactive', 'Akun Anda dinonaktifkan. Hubungi administrator.');

    var data;
    switch (action) {
      case 'auth.me':
        data = {
          user: publicUser_(user),
          workspaces: listWorkspacesForUser_(user)
        };
        break;
      case 'workspace.list':
        data = listWorkspacesForUser_(user);
        break;
      case 'workspace.create':
        data = createWorkspace_(user, payload);
        break;
      case 'workspace.load':
        data = loadWorkspace_(user, String(payload.workspaceId || ''));
        break;
      case 'workspace.save':
        data = saveWorkspaceSlice_(user, payload);
        break;
      case 'user.list':
        requireRole_(user, ['ADMIN']);
        data = listUsers_(String(payload.workspaceId || user.workspace_id || ''));
        break;
      case 'user.upsert':
        requireRole_(user, ['ADMIN']);
        data = upsertUser_(user, payload);
        break;
      case 'user.disable':
        requireRole_(user, ['ADMIN']);
        data = disableUser_(user, String(payload.email || ''));
        break;
      case 'audit.list':
        data = listCloudAudit_(user, String(payload.workspaceId || user.workspace_id || ''), Number(payload.limit || 100));
        break;
      case 'accounting.accounts.list':
        data = readSheetRecords_('AKUN');
        break;
      case 'accounting.report.profit-loss':
        data = generateLabaRugi_();
        break;
      case 'accounting.report.balance-sheet':
        data = generateNeraca_();
        break;
      case 'accounting.transaction.create':
        requireRole_(user, ['ADMIN', 'KEUANGAN']);
        throw apiError_('legacy_finance_write_disabled', 'Pencatatan transaksi lewat tabel jurnal lama dinonaktifkan. Gunakan formulir ERP yang tersimpan pada workspace cloud.');
      case 'accounting.transaction.reverse':
        requireRole_(user, ['ADMIN', 'KEUANGAN']);
        throw apiError_('legacy_finance_write_disabled', 'Reversal endpoint lama dinonaktifkan sampai jurnal dipindahkan sepenuhnya ke store cloud.');
      case 'ocr.scan':
        requireRole_(user, ['ADMIN', 'KEUANGAN', 'PROYEK']);
        throw apiError_('ocr_not_enabled', 'OCR belum diaktifkan pada gateway aman ini. Tidak ada foto yang diproses atau transaksi yang dibuat.');
      default:
        throw apiError_('unknown_action', 'Aksi backend tidak dikenal: ' + action);
    }

    return { success: true, data: data };
  } catch (error) {
    var message = String(error && error.message ? error.message : error);
    var code = error && error.apiCode ? error.apiCode : 'request_failed';
    return { success: false, code: code, error: message };
  }
}

/**
 * Direct POST API is not used by the React client. Webhooks remain disabled until
 * their individual provider signatures/secrets are configured and end-to-end tested.
 */
function doPost(e) {
  var path = String(e && e.parameter && e.parameter.path || '').trim();
  if (path === '/webhook/whatsapp' || path === '/webhook/telegram' || path === '/ocr' ||
      path === '/transaksi' || path === '/reversal') {
    return jsonResponse_({
      success: false,
      code: 'endpoint_disabled',
      error: 'Endpoint ini belum diaktifkan melalui jalur terautentikasi. Tidak ada transaksi yang diproses.'
    });
  }
  return jsonResponse_({ success: false, code: 'unknown_endpoint', error: 'Endpoint POST tidak dikenal.' });
}

function getCloudConfig_() {
  var props = PropertiesService.getScriptProperties();
  var rawUrl = String(props.getProperty('ERP_FRONTEND_URL') || '').trim();
  var frontendOrigin = '';
  if (rawUrl) {
    // Apps Script server-side runtime does not reliably expose the browser URL API.
    // Accept only an HTTPS origin; paths, query strings, credentials and fragments
    // are prohibited because this origin is used as the postMessage trust boundary.
    var match = rawUrl.match(/^https:\/\/([a-z0-9.-]+)(?::([0-9]{1,5}))?\/?$/i);
    if (!match || match[1].indexOf('..') !== -1) {
      throw apiError_('invalid_config', 'ERP_FRONTEND_URL harus berupa origin HTTPS saja, tanpa path, query, atau kredensial.');
    }
    if (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 65535)) {
      throw apiError_('invalid_config', 'Port pada ERP_FRONTEND_URL tidak valid.');
    }
    frontendOrigin = 'https://' + match[1].toLowerCase() + (match[2] ? ':' + match[2] : '');
  }
  return {
    frontendUrl: frontendOrigin,
    frontendOrigin: frontendOrigin,
    googleClientId: String(props.getProperty('GOOGLE_CLIENT_ID') || '').trim(),
    adminEmails: String(props.getProperty('ERP_ADMIN_EMAILS') || '')
      .split(',')
      .map(function (email) { return email.trim().toLowerCase(); })
      .filter(Boolean)
  };
}

function verifyGoogleIdToken_(idToken) {
  if (!idToken || idToken.length > 10000) throw apiError_('unauthenticated', 'Silakan masuk menggunakan akun Google.');
  var config = getCloudConfig_();
  if (!config.googleClientId) throw apiError_('not_configured', 'GOOGLE_CLIENT_ID belum dikonfigurasi di Apps Script.');
  var digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, idToken, Utilities.Charset.UTF_8
  )).replace(/=+$/g, '');
  var cache = CacheService.getScriptCache();
  var cacheKey = 'erp_google_identity_' + digest.slice(0, 40);
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (ignore) {
      cache.remove(cacheKey);
    }
  }

  var response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { method: 'get', muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) throw apiError_('unauthenticated', 'Sesi Google tidak valid atau kedaluwarsa. Silakan masuk ulang.');
  var claims = JSON.parse(response.getContentText() || '{}');
  if (String(claims.aud || '') !== config.googleClientId) throw apiError_('unauthenticated', 'Token Google bukan untuk aplikasi ERP ini.');
  if (String(claims.email_verified || '').toLowerCase() !== 'true') throw apiError_('email_unverified', 'Akun Google harus memiliki email terverifikasi.');
  if (!claims.email || !claims.sub || Number(claims.exp || 0) <= Math.floor(Date.now() / 1000)) {
    throw apiError_('unauthenticated', 'Token Google tidak lengkap atau sudah kedaluwarsa.');
  }
  var identity = {
    email: String(claims.email).trim().toLowerCase(),
    subject: String(claims.sub),
    name: String(claims.name || claims.given_name || claims.email).slice(0, 120),
    email_verified: true
  };
  cache.put(cacheKey, JSON.stringify(identity), 240);
  return identity;
}

function ensureIdentitySheets_() {
  var ss = getErpSpreadsheet_();
  var users = ss.getSheetByName('ERP_USERS') || ss.insertSheet('ERP_USERS');
  ensureSheetHeaders_(users, ['user_id', 'email', 'nama', 'role', 'status', 'workspace_id', 'created_at', 'updated_at', 'last_login']);
  var workspaces = ss.getSheetByName('ERP_WORKSPACES') || ss.insertSheet('ERP_WORKSPACES');
  ensureSheetHeaders_(workspaces, ['workspace_id', 'nama', 'status', 'created_by', 'created_at']);
  var state = ss.getSheetByName('ERP_STATE') || ss.insertSheet('ERP_STATE');
  ensureSheetHeaders_(state, ['workspace_id', 'slice', 'version', 'chunk_index', 'chunk_count', 'data_chunk', 'updated_at', 'updated_by']);
  var audit = ss.getSheetByName('AUDIT_LOG') || ss.insertSheet('AUDIT_LOG');
  ensureSheetHeaders_(audit, [
    'id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan',
    'workspace_id', 'actor_email', 'slice', 'changed_keys', 'version_before', 'version_after'
  ]);
  return { users: users, workspaces: workspaces, state: state, audit: audit };
}

function resolveErpUser_(identity) {
  var sheets = ensureIdentitySheets_();
  var config = getCloudConfig_();
  var users = sheetRecords_(sheets.users);
  var found = users.find(function (item) { return String(item.email || '').toLowerCase() === identity.email; });

  if (config.adminEmails.indexOf(identity.email) !== -1) {
    if (!found) {
      var now = new Date().toISOString();
      sheets.users.appendRow([Utilities.getUuid(), identity.email, identity.name, 'ADMIN', 'active', '', now, now, now]);
      found = sheetRecords_(sheets.users).find(function (item) { return String(item.email || '').toLowerCase() === identity.email; });
    } else if (found.role !== 'ADMIN') {
      updateRecordByKey_(sheets.users, 'email', identity.email, {
        role: 'ADMIN', status: 'active', nama: identity.name, updated_at: new Date().toISOString()
      });
      found = sheetRecords_(sheets.users).find(function (item) { return String(item.email || '').toLowerCase() === identity.email; });
    }
  }
  if (!found) throw apiError_('user_not_registered', 'Akun ini belum didaftarkan. Minta administrator menambahkan email Google Anda.');
  if (String(found.status || '').toLowerCase() !== 'active') throw apiError_('user_inactive', 'Akun Anda dinonaktifkan.');
  updateRecordByKey_(sheets.users, 'email', identity.email, {
    last_login: new Date().toISOString(), nama: found.nama || identity.name
  });
  found.last_login = new Date().toISOString();
  return found;
}

function publicUser_(user) {
  return {
    id: String(user.user_id || ''),
    email: String(user.email || ''),
    nama: String(user.nama || ''),
    role: String(user.role || 'VIEWER'),
    status: String(user.status || 'inactive'),
    workspaceId: String(user.workspace_id || '')
  };
}

function listWorkspacesForUser_(user) {
  var sheet = ensureIdentitySheets_().workspaces;
  var all = sheetRecords_(sheet).filter(function (row) { return row.status === 'active'; });
  if (user.role === 'ADMIN') return all.map(publicWorkspace_);
  return all.filter(function (row) { return String(row.workspace_id) === String(user.workspace_id); }).map(publicWorkspace_);
}

function publicWorkspace_(row) {
  return {
    id: String(row.workspace_id || ''),
    name: String(row.nama || ''),
    status: String(row.status || '')
  };
}

function createWorkspace_(user, payload) {
  requireRole_(user, ['ADMIN']);
  var name = String(payload.name || '').trim();
  if (name.length < 2 || name.length > 100) throw apiError_('invalid_workspace', 'Nama workspace harus 2-100 karakter.');
  var snapshot = validateSnapshot_(payload.snapshot);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheets = ensureIdentitySheets_();
    if (sheets.workspaces.getLastRow() > 1) throw apiError_('workspace_exists', 'Workspace sudah ada. Pilih workspace yang tersedia.');
    var workspaceId = Utilities.getUuid();
    var now = new Date().toISOString();
    sheets.workspaces.appendRow([workspaceId, name, 'active', user.email, now]);
    writeSliceInitial_(workspaceId, 'operational', snapshot.operational, user.email);
    writeSliceInitial_(workspaceId, 'accounting', snapshot.accounting, user.email);
    updateRecordByKey_(sheets.users, 'email', user.email, {
      workspace_id: workspaceId, updated_at: now
    });
    appendCloudAudit_(workspaceId, user.email, 'WORKSPACE_CREATE', 'ERP_WORKSPACES', workspaceId, '-', JSON.stringify({ name: name }), '', 0, 1);
    return { workspaceId: workspaceId, name: name };
  } finally {
    lock.releaseLock();
  }
}

function loadWorkspace_(user, workspaceId) {
  if (!workspaceId) workspaceId = String(user.workspace_id || '');
  if (!workspaceId) throw apiError_('workspace_required', 'Workspace belum dibuat. Minta admin membuat workspace terlebih dahulu.');
  requireWorkspaceAccess_(user, workspaceId);
  var sheets = ensureIdentitySheets_();
  var ws = sheetRecords_(sheets.workspaces).find(function (row) { return String(row.workspace_id) === workspaceId && row.status === 'active'; });
  if (!ws) throw apiError_('workspace_not_found', 'Workspace tidak ditemukan atau tidak aktif.');
  var operational = readWorkspaceSlice_(workspaceId, 'operational');
  var accounting = readWorkspaceSlice_(workspaceId, 'accounting');
  if (!operational || !accounting) throw apiError_('workspace_state_missing', 'Data workspace belum lengkap. Hubungi administrator; data lokal tidak akan dikirim otomatis.');
  var safeData = redactWorkspaceForUser_(user, operational.data, accounting.data);
  return {
    workspace: publicWorkspace_(ws),
    operational: safeData.operational,
    accounting: safeData.accounting,
    versions: { operational: operational.version, accounting: accounting.version }
  };
}

function saveWorkspaceSlice_(user, payload) {
  var workspaceId = String(payload.workspaceId || user.workspace_id || '');
  var slice = String(payload.slice || '');
  if (['operational', 'accounting'].indexOf(slice) === -1) throw apiError_('invalid_slice', 'Bagian data tidak dikenal.');
  requireWorkspaceAccess_(user, workspaceId);
  requireRole_(user, ['ADMIN', 'KEUANGAN', 'PROYEK']);
  var nextData = validateSlice_(slice, payload.data);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var current = readWorkspaceSlice_(workspaceId, slice);
    if (!current) throw apiError_('workspace_state_missing', 'Data cloud tidak ditemukan. Muat ulang dan hubungi admin.');
    var expectedVersion = Number(payload.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion !== current.version) {
      throw apiError_('version_conflict', 'Data diubah dari perangkat lain. Perubahan ini belum tersimpan ke cloud; muat ulang sebelum melanjutkan.');
    }
    nextData = preserveRestrictedCollections_(user, slice, current.data, nextData);
    var json = JSON.stringify(nextData);
    if (json.length > 3000000) throw apiError_('payload_too_large', 'Bagian data terlalu besar untuk satu penyimpanan. Buat arsip terpisah dan lampirkan melalui Drive.');
    var changedKeys = validateRoleChanges_(user, slice, current.data, nextData);
    if (!changedKeys.length) return { version: current.version, unchanged: true };
    var nextVersion = current.version + 1;
    replaceWorkspaceSlice_(workspaceId, slice, nextVersion, json, user.email);
    appendCloudAudit_(workspaceId, user.email, 'WORKSPACE_UPDATE', 'ERP_STATE', slice, JSON.stringify({ version: current.version }), JSON.stringify({ version: nextVersion, changedKeys: changedKeys }), slice, current.version, nextVersion);
    return { version: nextVersion, changedKeys: changedKeys };
  } finally {
    lock.releaseLock();
  }
}

function validateSnapshot_(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw apiError_('invalid_snapshot', 'Snapshot ERP tidak valid.');
  return {
    operational: validateSlice_('operational', snapshot.operational),
    accounting: validateSlice_('accounting', snapshot.accounting)
  };
}

function validateSlice_(slice, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw apiError_('invalid_payload', 'Data ERP harus berupa object.');
  var keys = slice === 'operational'
    ? ['bukuKas','arsipBukti','posKewajiban','auditLog','tanah','beko','notaMaterial','stok','produksi','penjualan','pembelian','penggajian','anggaran','arusKas','ocr','whatsapp','menuConfig','qcRecords','assets','taxRecords','housingUnits']
    : ['akun','jurnal','invoice','purchaseOrder','rab','schedule'];
  keys.forEach(function (key) {
    if (!Array.isArray(data[key])) throw apiError_('invalid_payload', 'Bagian data ' + slice + ' tidak lengkap: ' + key);
  });
  return data;
}

function readWorkspaceSlice_(workspaceId, slice) {
  var sheet = ensureIdentitySheets_().state;
  var rows = sheetRecords_(sheet).filter(function (row) {
    return String(row.workspace_id) === workspaceId && String(row.slice) === slice;
  });
  if (!rows.length) return null;
  var versions = rows.reduce(function (max, row) { return Math.max(max, Number(row.version) || 0); }, 0);
  var latest = rows.filter(function (row) { return Number(row.version) === versions; });
  if (!latest.length || latest.length !== Number(latest[0].chunk_count)) {
    throw apiError_('incomplete_snapshot', 'Snapshot cloud tidak lengkap. Penyimpanan ditolak untuk mencegah data parsial.');
  }
  latest.sort(function (a, b) { return Number(a.chunk_index) - Number(b.chunk_index); });
  for (var i = 0; i < latest.length; i++) {
    if (Number(latest[i].chunk_index) !== i) throw apiError_('incomplete_snapshot', 'Urutan potongan data cloud tidak lengkap.');
  }
  var raw = latest.map(function (row) { return String(row.data_chunk || ''); }).join('');
  try {
    return { version: versions, data: JSON.parse(raw) };
  } catch (error) {
    throw apiError_('invalid_snapshot_json', 'Data cloud tidak bisa dibaca sebagai JSON valid.');
  }
}

function writeSliceInitial_(workspaceId, slice, data, email) {
  var json = JSON.stringify(validateSlice_(slice, data));
  if (json.length > 3000000) throw apiError_('payload_too_large', 'Data awal melebihi batas 3 MB.');
  var chunks = splitData_(json, 30000);
  var sheet = ensureIdentitySheets_().state;
  var now = new Date().toISOString();
  var values = chunks.map(function (chunk, index) {
    return [workspaceId, slice, 1, index, chunks.length, chunk, now, email];
  });
  if (values.length) sheet.getRange(sheet.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
}

function replaceWorkspaceSlice_(workspaceId, slice, version, json, email) {
  var sheet = ensureIdentitySheets_().state;
  var chunks = splitData_(json, 30000);
  var now = new Date().toISOString();
  var start = sheet.getLastRow() + 1;
  var values = chunks.map(function (chunk, index) {
    return [workspaceId, slice, version, index, chunks.length, chunk, now, email];
  });
  // Write complete new snapshot before removing old rows; keep the last valid version
  // if the sheet write fails. Reads and writes use the script lock.
  sheet.getRange(start, 1, values.length, values[0].length).setValues(values);
  SpreadsheetApp.flush();
  var data = sheet.getDataRange().getValues();
  var deleteRows = [];
  for (var rowIndex = 1; rowIndex < data.length; rowIndex++) {
    if (String(data[rowIndex][0]) === workspaceId && String(data[rowIndex][1]) === slice &&
        Number(data[rowIndex][2]) < version) deleteRows.push(rowIndex + 1);
  }
  deleteRows.reverse().forEach(function (rowNumber) { sheet.deleteRow(rowNumber); });
}

function splitData_(value, size) {
  var result = [];
  for (var start = 0; start < value.length; start += size) result.push(value.slice(start, start + size));
  return result.length ? result : ['{}'];
}

function redactWorkspaceForUser_(user, operational, accounting) {
  var op = JSON.parse(JSON.stringify(operational));
  var acc = JSON.parse(JSON.stringify(accounting));
  if (user.role === 'ADMIN' || user.role === 'KEUANGAN') return { operational: op, accounting: acc };

  var opAllowed = user.role === 'PROYEK'
    ? ['tanah','beko','notaMaterial','stok','produksi','anggaran','qcRecords','assets','housingUnits','menuConfig']
    : ['tanah','beko','housingUnits'];
  Object.keys(op).forEach(function (key) {
    if (opAllowed.indexOf(key) === -1) op[key] = [];
  });
  if (!Array.isArray(op.menuConfig)) op.menuConfig = [];
  var accAllowed = user.role === 'PROYEK' ? ['akun','rab','schedule'] : [];
  Object.keys(acc).forEach(function (key) {
    if (accAllowed.indexOf(key) === -1) acc[key] = [];
  });
  return { operational: op, accounting: acc };
}

function preserveRestrictedCollections_(user, slice, before, submitted) {
  if (user.role === 'ADMIN') return submitted;
  var allowed = slice === 'operational'
    ? {
        KEUANGAN: ['bukuKas','arsipBukti','posKewajiban','tanah','beko','notaMaterial','penggajian','anggaran','penjualan','pembelian','taxRecords'],
        PROYEK: ['tanah','beko','notaMaterial','stok','produksi','anggaran','qcRecords','assets','housingUnits','menuConfig']
      }
    : {
        KEUANGAN: ['jurnal','invoice','purchaseOrder'],
        PROYEK: ['akun','rab','schedule']
      };
  var mutable = allowed[user.role] || [];
  var next = JSON.parse(JSON.stringify(submitted));
  Object.keys(before).forEach(function (key) {
    if (mutable.indexOf(key) === -1) next[key] = before[key];
  });
  // Audit records must be extended by an authorized server action; never accept
  // edits/deletions of existing rows from non-admin clients.
  if (slice === 'operational' && user.role !== 'ADMIN') next.auditLog = before.auditLog;
  return next;
}

function validateRoleChanges_(user, slice, before, after) {
  var allKeys = Array.from(new Set(Object.keys(before).concat(Object.keys(after))));
  var changed = allKeys.filter(function (key) {
    return stableJson_(before[key]) !== stableJson_(after[key]);
  });
  if (!changed.length) return [];
  if (changed.some(function (key) { return !(key in before) || !(key in after); })) {
    throw apiError_('schema_change_forbidden', 'Pengguna tidak boleh mengubah struktur data cloud.');
  }
  if (slice === 'operational' && changed.indexOf('auditLog') !== -1) {
    var prior = Array.isArray(before.auditLog) ? before.auditLog : [];
    var next = Array.isArray(after.auditLog) ? after.auditLog : [];
    if (next.length < prior.length) throw apiError_('audit_log_immutable', 'Audit log tidak boleh dihapus.');
    for (var i = 0; i < prior.length; i++) {
      if (stableJson_(prior[i]) !== stableJson_(next[i])) throw apiError_('audit_log_immutable', 'Entri audit lama tidak boleh diubah.');
    }
  }

  if (user.role === 'ADMIN') return changed;
  var operationalAllow = {
    KEUANGAN: ['bukuKas','arsipBukti','posKewajiban','tanah','beko','notaMaterial','penggajian','anggaran','penjualan','pembelian','taxRecords'],
    PROYEK: ['tanah','beko','notaMaterial','stok','produksi','anggaran','qcRecords','assets','housingUnits','rab','schedule'],
    VIEWER: []
  };
  var accountingAllow = {
    KEUANGAN: ['jurnal','invoice','purchaseOrder'],
    PROYEK: ['rab','schedule'],
    VIEWER: []
  };
  var allowed = slice === 'operational' ? operationalAllow[user.role] || [] : accountingAllow[user.role] || [];
  var forbidden = changed.filter(function (key) { return key !== 'auditLog' && allowed.indexOf(key) === -1; });
  if (forbidden.length) throw apiError_('forbidden_fields', 'Role ' + user.role + ' tidak berhak mengubah bagian: ' + forbidden.join(', '));
  if (changed.indexOf('auditLog') !== -1) {
    var oldLog = before.auditLog || [];
    var newLog = after.auditLog || [];
    if (newLog.length < oldLog.length) throw apiError_('audit_log_immutable', 'Audit log tidak boleh dihapus.');
    for (var j = 0; j < oldLog.length; j++) {
      if (stableJson_(oldLog[j]) !== stableJson_(newLog[j])) throw apiError_('audit_log_immutable', 'Entri audit lama tidak boleh diubah.');
    }
  }
  return changed;
}

function stableJson_(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableJson_).join(',') + ']';
  return '{' + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ':' + stableJson_(value[key]);
  }).join(',') + '}';
}

function requireWorkspaceAccess_(user, workspaceId) {
  if (!workspaceId) throw apiError_('workspace_required', 'Pilih workspace ERP terlebih dahulu.');
  if (user.role !== 'ADMIN' && String(user.workspace_id || '') !== workspaceId) {
    throw apiError_('forbidden_workspace', 'Akun Anda tidak terdaftar pada workspace ini.');
  }
  var workspace = sheetRecords_(ensureIdentitySheets_().workspaces).find(function (row) {
    return String(row.workspace_id) === workspaceId && row.status === 'active';
  });
  if (!workspace) throw apiError_('workspace_not_found', 'Workspace tidak ditemukan atau sudah nonaktif.');
}

function requireRole_(user, roles) {
  if (roles.indexOf(user.role) === -1) throw apiError_('forbidden', 'Akun Anda tidak memiliki izin untuk tindakan ini.');
}

function listUsers_(workspaceId) {
  if (!workspaceId) throw apiError_('workspace_required', 'Workspace belum dipilih.');
  return sheetRecords_(ensureIdentitySheets_().users)
    .filter(function (row) { return String(row.workspace_id || '') === workspaceId; })
    .map(function (row) {
      return {
        id: String(row.user_id || ''), email: String(row.email || ''),
        nama: String(row.nama || ''), role: String(row.role || ''),
        status: String(row.status || ''), createdAt: String(row.created_at || ''),
        lastLogin: String(row.last_login || '')
      };
    });
}

function upsertUser_(actor, payload) {
  var email = String(payload.email || '').trim().toLowerCase();
  var name = String(payload.nama || '').trim();
  var role = String(payload.role || 'VIEWER').toUpperCase();
  var status = String(payload.status || 'active').toLowerCase();
  var workspaceId = String(payload.workspaceId || actor.workspace_id || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw apiError_('invalid_email', 'Alamat email Google tidak valid.');
  if (!name || name.length > 120) throw apiError_('invalid_name', 'Nama pengguna wajib diisi (maksimal 120 karakter).');
  if (['ADMIN','KEUANGAN','PROYEK','VIEWER'].indexOf(role) === -1) throw apiError_('invalid_role', 'Role tidak valid.');
  if (['active','inactive'].indexOf(status) === -1) throw apiError_('invalid_status', 'Status pengguna tidak valid.');
  requireWorkspaceAccess_(actor, workspaceId);
  var sheets = ensureIdentitySheets_();
  var existing = sheetRecords_(sheets.users).find(function (row) { return String(row.email || '').toLowerCase() === email; });
  if (existing && String(existing.workspace_id || '') !== workspaceId) throw apiError_('user_workspace_conflict', 'Email tersebut sudah terdaftar pada workspace lain.');
  if (existing && existing.email === actor.email && (role !== 'ADMIN' || status !== 'active')) {
    var activeAdmins = sheetRecords_(sheets.users).filter(function (row) { return row.role === 'ADMIN' && row.status === 'active'; });
    if (activeAdmins.length <= 1) throw apiError_('last_admin_required', 'Sistem harus memiliki minimal satu admin aktif.');
  }
  var now = new Date().toISOString();
  if (existing) {
    updateRecordByKey_(sheets.users, 'email', email, { nama: name, role: role, status: status, updated_at: now, workspace_id: workspaceId });
  } else {
    sheets.users.appendRow([Utilities.getUuid(), email, name, role, status, workspaceId, now, now, '']);
  }
  appendCloudAudit_(workspaceId, actor.email, 'USER_UPSERT', 'ERP_USERS', email, JSON.stringify(existing || {}), JSON.stringify({ email: email, nama: name, role: role, status: status }), '', 0, 0);
  return listUsers_(workspaceId);
}

function disableUser_(actor, email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) throw apiError_('invalid_email', 'Email pengguna wajib diisi.');
  if (email === actor.email) throw apiError_('self_disable', 'Administrator tidak dapat menonaktifkan akunnya sendiri.');
  var users = sheetRecords_(ensureIdentitySheets_().users);
  var found = users.find(function (row) { return String(row.email || '').toLowerCase() === email; });
  if (!found) throw apiError_('user_not_found', 'Pengguna tidak ditemukan.');
  if (found.role === 'ADMIN' && found.status === 'active' &&
      users.filter(function (row) { return row.role === 'ADMIN' && row.status === 'active'; }).length <= 1) {
    throw apiError_('last_admin_required', 'Sistem harus memiliki minimal satu admin aktif.');
  }
  updateRecordByKey_(ensureIdentitySheets_().users, 'email', email, { status: 'inactive', updated_at: new Date().toISOString() });
  appendCloudAudit_(String(found.workspace_id || ''), actor.email, 'USER_DISABLE', 'ERP_USERS', email, JSON.stringify(found), JSON.stringify({ status: 'inactive' }), '', 0, 0);
  return { disabled: true, email: email };
}

function listCloudAudit_(user, workspaceId, limit) {
  requireWorkspaceAccess_(user, workspaceId);
  var rows = sheetRecords_(ensureIdentitySheets_().audit)
    .filter(function (row) { return String(row.workspace_id || '') === workspaceId; });
  limit = Math.max(1, Math.min(500, Math.floor(limit || 100)));
  return rows.slice(-limit).reverse();
}

function appendCloudAudit_(workspaceId, actorEmail, action, table, recordId, oldValue, newValue, slice, oldVersion, newVersion) {
  var sheet = ensureIdentitySheets_().audit;
  var headers = ensureSheetHeaders_(sheet, [
    'id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan',
    'workspace_id', 'actor_email', 'slice', 'changed_keys', 'version_before', 'version_after'
  ]);
  var changedKeys = '';
  try {
    var parsedNewValue = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
    if (parsedNewValue && Array.isArray(parsedNewValue.changedKeys)) {
      changedKeys = JSON.stringify(parsedNewValue.changedKeys);
    }
  } catch (ignore) {
    changedKeys = '';
  }
  var record = {
    id: 'LOG-' + Utilities.getUuid(),
    timestamp: new Date().toISOString(),
    user: actorEmail,
    aksi: action,
    tabel: table,
    record_id: recordId,
    nilai_lama: oldValue || '',
    nilai_baru: newValue || '',
    alasan: action,
    workspace_id: workspaceId,
    actor_email: actorEmail,
    slice: slice,
    changed_keys: changedKeys,
    version_before: oldVersion || '',
    version_after: newVersion || ''
  };
  sheet.appendRow(headers.map(function (header) { return record[header] === undefined ? '' : record[header]; }));
}

function sheetRecords_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (value) { return String(value || '').trim(); });
  return data.slice(1).filter(function (row) {
    return row.some(function (value) { return value !== '' && value !== null; });
  }).map(function (row) {
    var record = {};
    headers.forEach(function (header, index) { if (header) record[header] = row[index]; });
    return record;
  });
}

function updateRecordByKey_(sheet, key, value, updates) {
  var data = sheet.getDataRange().getValues();
  if (!data.length) throw apiError_('schema_missing', 'Header sheet belum tersedia.');
  var headers = data[0].map(function (header) { return String(header || '').trim(); });
  var keyIndex = headers.indexOf(key);
  if (keyIndex < 0) throw apiError_('schema_missing', 'Kolom ' + key + ' tidak tersedia.');
  var targetRow = -1;
  for (var row = 1; row < data.length; row++) {
    if (String(data[row][keyIndex] || '').toLowerCase() === String(value).toLowerCase()) {
      targetRow = row + 1;
      break;
    }
  }
  if (targetRow < 0) throw apiError_('record_not_found', 'Record tidak ditemukan.');
  Object.keys(updates).forEach(function (field) {
    var col = headers.indexOf(field);
    if (col >= 0) sheet.getRange(targetRow, col + 1).setValue(updates[field]);
  });
}

function apiError_(code, message) {
  var error = new Error(message);
  error.apiCode = code;
  return error;
}
