/**
 * Google Apps Script — authenticated, versioned ERP cloud workspace.
 *
 * Required Script Properties:
 *   SPREADSHEET_ID          ID of the private Google Sheet used as the database
 *   GOOGLE_OAUTH_CLIENT_ID  Web OAuth client ID (public identifier)
 *   ADMIN_EMAILS            Comma-separated verified Google accounts allowed to bootstrap admins
 *   ERP_FRONTEND_URL         HTTPS URL of the React frontend, without credentials
 *
 * Never share the database spreadsheet with ordinary ERP users. Apps Script runs as its owner.
 * Publicly callable functions verify Google ID tokens and server-side user/workspace roles.
 */
var ERP_CHUNK_SIZE_ = 40000;
var ERP_MAX_SNAPSHOT_CHARS_ = 2000000;
var ERP_HISTORY_VERSIONS_ = 5;
var ERP_GLOBAL_ROLES_ = ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'];
var ERP_WORKSPACE_ROLES_ = ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'];
var ERP_OPERATIONAL_KEYS_ = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'menuConfig', 'qcRecords',
  'assets', 'taxRecords', 'housingUnits'
];
var ERP_ACCOUNTING_KEYS_ = ['akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'];

function apiGetPublicConfig() {
  var props = PropertiesService.getScriptProperties();
  var clientId = String(props.getProperty('GOOGLE_OAUTH_CLIENT_ID') || '').trim();
  var frontendUrl = String(props.getProperty('ERP_FRONTEND_URL') || '').trim();
  return {
    product: 'ERP Properti & Konstruksi',
    authenticationProvider: 'Google Identity Services',
    configured: Boolean(clientId && /^https:\/\/[^/]+/i.test(frontendUrl)),
    googleClientId: clientId,
    reason: !clientId ? 'GOOGLE_OAUTH_CLIENT_ID belum dikonfigurasi.'
      : (!/^https:\/\/[^/]+/i.test(frontendUrl) ? 'ERP_FRONTEND_URL harus berupa URL HTTPS.' : '')
  };
}

function apiLogin(idToken) {
  var user = _erpRequireUser_(idToken);
  return {
    success: true,
    user: user,
    workspaces: _erpListUserWorkspaces_(user.email, user.role)
  };
}

function apiListWorkspaces(idToken) {
  var user = _erpRequireUser_(idToken);
  return { success: true, workspaces: _erpListUserWorkspaces_(user.email, user.role) };
}

function apiListUsers(idToken, workspaceId) {
  var actor = _erpRequireUser_(idToken);
  if (actor.role !== 'ADMIN') throw new Error('Hanya ADMIN yang boleh melihat daftar pengguna.');
  var usersSheet = _erpSheet_('ERP_USERS', [
    'email', 'display_name', 'role', 'active', 'created_at', 'updated_at'
  ]);
  var users = _erpReadObjects_(usersSheet);
  var membershipByEmail = {};
  var id = String(workspaceId || '').trim();
  if (id) {
    var memberSheet = _erpSheet_('ERP_WORKSPACE_MEMBERS', [
      'workspace_id', 'email', 'role', 'active', 'added_by', 'created_at', 'updated_at'
    ]);
    _erpReadObjects_(memberSheet).filter(function (row) {
      return String(row.workspace_id) === id && _erpIsTrue_(row.active);
    }).forEach(function (row) { membershipByEmail[String(row.email).toLowerCase()] = String(row.role).toUpperCase(); });
  }
  return {
    success: true,
    users: users.map(function (row) {
      return {
        email: String(row.email),
        display_name: String(row.display_name || ''),
        role: String(row.role).toUpperCase(),
        active: _erpIsTrue_(row.active),
        workspace_role: membershipByEmail[String(row.email).toLowerCase()] || '',
        created_at: String(row.created_at || ''),
        updated_at: String(row.updated_at || '')
      };
    }).sort(function (a, b) { return a.email.localeCompare(b.email); })
  };
}

function apiCreateWorkspace(idToken, workspaceName, snapshot) {
  var actor = _erpRequireUser_(idToken);
  if (actor.role !== 'ADMIN') throw new Error('Hanya ADMIN yang boleh membuat workspace.');
  var name = String(workspaceName || '').trim();
  if (name.length < 2 || name.length > 100) throw new Error('Nama workspace harus 2–100 karakter.');
  var validated = _erpValidateSnapshot_(snapshot);
  var serialized = JSON.stringify(validated);
  if (serialized.length > ERP_MAX_SNAPSHOT_CHARS_) throw new Error('Data awal melebihi batas 2 MB.');
  var now = new Date().toISOString();
  var workspaceId = Utilities.getUuid();
  var checksum = _erpSha256_(serialized);
  var chunks = _erpSplitChunks_(serialized);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var metaSheet = _erpSheet_('ERP_WORKSPACES', [
      'workspace_id', 'name', 'owner_email', 'version', 'chunk_count',
      'checksum', 'created_at', 'updated_at', 'updated_by'
    ]);
    var membersSheet = _erpSheet_('ERP_WORKSPACE_MEMBERS', [
      'workspace_id', 'email', 'role', 'active', 'added_by', 'created_at', 'updated_at'
    ]);
    var chunkSheet = _erpSheet_('ERP_STATE_CHUNKS', [
      'workspace_id', 'version', 'chunk_index', 'payload', 'created_at'
    ]);

    _erpAppendChunks_(chunkSheet, workspaceId, 1, chunks, now);
    _erpAppendObject_(membersSheet, {
      workspace_id: workspaceId, email: actor.email, role: 'ADMIN',
      active: 'TRUE', added_by: actor.email, created_at: now, updated_at: now
    });
    _erpAppendObject_(metaSheet, {
      workspace_id: workspaceId, name: name, owner_email: actor.email,
      version: 1, chunk_count: chunks.length, checksum: checksum,
      created_at: now, updated_at: now, updated_by: actor.email
    });
    _erpAppendAudit_({
      timestamp: now, actor_email: actor.email, workspace_id: workspaceId,
      action: 'WORKSPACE_CREATED', previous_version: 0, new_version: 1,
      checksum: checksum, details_json: JSON.stringify({ name: name })
    });
    return {
      success: true,
      workspace: { id: workspaceId, name: name, role: 'ADMIN', version: 1 },
      snapshot: validated
    };
  } finally {
    lock.releaseLock();
  }
}

function apiAddUser(idToken, email, role, displayName, active) {
  var actor = _erpRequireUser_(idToken);
  if (actor.role !== 'ADMIN') throw new Error('Hanya ADMIN yang boleh mengelola daftar pengguna.');
  var normalizedEmail = _erpNormalizeEmail_(email);
  var normalizedRole = String(role || '').toUpperCase();
  if (!ERP_GLOBAL_ROLES_.includes(normalizedRole)) throw new Error('Role pengguna tidak dikenal.');
  var isActive = active !== false;
  if (normalizedEmail === actor.email && (!isActive || normalizedRole !== 'ADMIN') && _erpActiveAdminCount_() <= 1) {
    throw new Error('Tidak boleh menonaktifkan atau menurunkan role ADMIN terakhir.');
  }

  var sheet = _erpSheet_('ERP_USERS', [
    'email', 'display_name', 'role', 'active', 'created_at', 'updated_at'
  ]);
  var found = _erpFindObjectRow_(sheet, 'email', normalizedEmail);
  var now = new Date().toISOString();
  var record = {
    email: normalizedEmail,
    display_name: String(displayName || '').trim().slice(0, 100),
    role: normalizedRole,
    active: isActive ? 'TRUE' : 'FALSE',
    created_at: found ? found.record.created_at : now,
    updated_at: now
  };
  if (found) {
    if (found.record.role === 'ADMIN' && (normalizedRole !== 'ADMIN' || !isActive) && _erpActiveAdminCount_() <= 1) {
      throw new Error('Tidak boleh menonaktifkan atau menurunkan role ADMIN terakhir.');
    }
    _erpWriteObjectRow_(sheet, found.rowNumber, record);
  } else {
    _erpAppendObject_(sheet, record);
  }
  _erpAppendAudit_({
    timestamp: now, actor_email: actor.email, workspace_id: '',
    action: found ? 'USER_UPDATED' : 'USER_ADDED', previous_version: 0, new_version: 0,
    checksum: '', details_json: JSON.stringify({ email: normalizedEmail, role: normalizedRole, active: isActive })
  });
  return { success: true, user: { email: normalizedEmail, display_name: record.display_name, role: normalizedRole, active: isActive } };
}

function apiAddWorkspaceMember(idToken, workspaceId, email, role) {
  var actor = _erpRequireUser_(idToken);
  if (actor.role !== 'ADMIN') throw new Error('Hanya ADMIN yang boleh menambah anggota workspace.');
  var id = String(workspaceId || '').trim();
  var normalizedEmail = _erpNormalizeEmail_(email);
  var normalizedRole = String(role || '').toUpperCase();
  if (!ERP_WORKSPACE_ROLES_.includes(normalizedRole)) throw new Error('Role workspace tidak dikenal.');
  if (!_erpFindObjectRow_(_erpSheet_('ERP_WORKSPACES', [
    'workspace_id', 'name', 'owner_email', 'version', 'chunk_count',
    'checksum', 'created_at', 'updated_at', 'updated_by'
  ]), 'workspace_id', id)) throw new Error('Workspace tidak ditemukan.');

  var user = _erpFindObjectRow_(_erpSheet_('ERP_USERS', [
    'email', 'display_name', 'role', 'active', 'created_at', 'updated_at'
  ]), 'email', normalizedEmail);
  if (!user || !_erpIsTrue_(user.record.active)) throw new Error('Pengguna harus ditambahkan dan diaktifkan di daftar ERP_USERS terlebih dahulu.');

  var sheet = _erpSheet_('ERP_WORKSPACE_MEMBERS', [
    'workspace_id', 'email', 'role', 'active', 'added_by', 'created_at', 'updated_at'
  ]);
  var found = _erpFindObjectRow_(sheet, 'workspace_id', id, 'email', normalizedEmail);
  var now = new Date().toISOString();
  var record = {
    workspace_id: id, email: normalizedEmail, role: normalizedRole, active: 'TRUE',
    added_by: actor.email, created_at: found ? found.record.created_at : now, updated_at: now
  };
  if (found) _erpWriteObjectRow_(sheet, found.rowNumber, record);
  else _erpAppendObject_(sheet, record);
  _erpAppendAudit_({
    timestamp: now, actor_email: actor.email, workspace_id: id,
    action: found ? 'WORKSPACE_MEMBER_UPDATED' : 'WORKSPACE_MEMBER_ADDED',
    previous_version: 0, new_version: 0, checksum: '',
    details_json: JSON.stringify({ email: normalizedEmail, role: normalizedRole })
  });
  return { success: true, member: { email: normalizedEmail, role: normalizedRole, active: true } };
}

function apiLoadWorkspace(idToken, workspaceId) {
  var user = _erpRequireUser_(idToken);
  var id = String(workspaceId || '').trim();
  var member = _erpRequireWorkspaceMember_(user.email, id, user.role);
  var meta = _erpFindObjectRow_(_erpSheet_('ERP_WORKSPACES', [
    'workspace_id', 'name', 'owner_email', 'version', 'chunk_count',
    'checksum', 'created_at', 'updated_at', 'updated_by'
  ]), 'workspace_id', id);
  if (!meta) throw new Error('Workspace tidak ditemukan.');
  var loaded = _erpLoadSnapshot_(id, Number(meta.record.version), Number(meta.record.chunk_count), String(meta.record.checksum));
  return {
    success: true,
    workspace: {
      id: id, name: String(meta.record.name), role: member.role,
      version: Number(meta.record.version), updated_at: String(meta.record.updated_at || '')
    },
    // Only send modules the effective workspace role is allowed to read.
    snapshot: _erpFilterSnapshotForRole_(loaded, member.role)
  };
}

function apiSaveWorkspace(idToken, workspaceId, expectedVersion, snapshot) {
  var user = _erpRequireUser_(idToken);
  var id = String(workspaceId || '').trim();
  var member = _erpRequireWorkspaceMember_(user.email, id, user.role);
  if (member.role === 'VIEWER') throw new Error('Role VIEWER hanya boleh membaca data.');
  var validated = _erpValidateSnapshot_(snapshot);
  var requestSerialized = JSON.stringify(validated);
  if (requestSerialized.length > ERP_MAX_SNAPSHOT_CHARS_) throw new Error('Snapshot melebihi batas 2 MB.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var metaSheet = _erpSheet_('ERP_WORKSPACES', [
      'workspace_id', 'name', 'owner_email', 'version', 'chunk_count',
      'checksum', 'created_at', 'updated_at', 'updated_by'
    ]);
    var metaFound = _erpFindObjectRow_(metaSheet, 'workspace_id', id);
    if (!metaFound) throw new Error('Workspace tidak ditemukan.');
    var currentVersion = Number(metaFound.record.version);
    var requestedVersion = Number(expectedVersion);
    if (!Number.isInteger(requestedVersion) || requestedVersion !== currentVersion) {
      return {
        success: false, code: 'VERSION_CONFLICT', currentVersion: currentVersion,
        message: 'Data cloud berubah sejak dimuat. Muat ulang versi terbaru sebelum mencoba menyimpan lagi.'
      };
    }

    var previousSnapshot = _erpLoadSnapshot_(
      id, currentVersion, Number(metaFound.record.chunk_count), String(metaFound.record.checksum)
    );
    _erpAssertIncomingVisibility_(previousSnapshot, validated, member.role);
    // A scoped role only replaces the modules it can write; hidden modules are retained
    // from the server's canonical snapshot rather than overwritten with filtered empty arrays.
    var storedSnapshot = _erpMergeSnapshotForRole_(previousSnapshot, validated, member.role);
    _erpAssertRoleMayChange_(member.role, previousSnapshot, storedSnapshot);
    var serialized = JSON.stringify(storedSnapshot);
    if (serialized.length > ERP_MAX_SNAPSHOT_CHARS_) throw new Error('Snapshot melebihi batas 2 MB setelah merge server.');
    var checksum = _erpSha256_(serialized);
    var newVersion = currentVersion + 1;
    var now = new Date().toISOString();
    var chunks = _erpSplitChunks_(serialized);
    var chunkSheet = _erpSheet_('ERP_STATE_CHUNKS', [
      'workspace_id', 'version', 'chunk_index', 'payload', 'created_at'
    ]);
    _erpDeleteChunksForVersion_(chunkSheet, id, newVersion);
    _erpAppendChunks_(chunkSheet, id, newVersion, chunks, now);

    // Append an intent first. The active version is committed only after all chunks exist.
    _erpAppendAudit_({
      timestamp: now, actor_email: user.email, workspace_id: id,
      action: 'SNAPSHOT_SAVE_PREPARED', previous_version: currentVersion, new_version: newVersion,
      checksum: checksum, details_json: JSON.stringify({ bytes: serialized.length, chunks: chunks.length })
    });

    var updated = Object.assign({}, metaFound.record, {
      version: newVersion, chunk_count: chunks.length, checksum: checksum,
      updated_at: now, updated_by: user.email
    });
    _erpWriteObjectRow_(metaSheet, metaFound.rowNumber, updated);

    var auditWarning = '';
    try {
      _erpAppendAudit_({
        timestamp: new Date().toISOString(), actor_email: user.email, workspace_id: id,
        action: 'SNAPSHOT_SAVE_COMMITTED', previous_version: currentVersion, new_version: newVersion,
        checksum: checksum, details_json: JSON.stringify({ bytes: serialized.length, chunks: chunks.length })
      });
    } catch (auditError) {
      auditWarning = 'Snapshot sudah tersimpan, tetapi pencatatan audit final gagal: ' + String(auditError.message || auditError);
    }
    try {
      _erpPruneChunks_(chunkSheet, id, newVersion);
    } catch (pruneError) {
      // Retaining old chunks is safe; pruning is best-effort only.
      console.warn('Gagal membersihkan snapshot lama: ' + String(pruneError.message || pruneError));
    }
    return {
      success: true, version: newVersion, checksum: checksum,
      updated_at: now, auditWarning: auditWarning
    };
  } finally {
    lock.releaseLock();
  }
}

function apiGetWorkspaceAudit(idToken, workspaceId, limit) {
  var user = _erpRequireUser_(idToken);
  var id = String(workspaceId || '').trim();
  var member = _erpRequireWorkspaceMember_(user.email, id, user.role);
  if (member.role !== 'ADMIN' && member.role !== 'KEUANGAN') {
    throw new Error('Riwayat audit administratif hanya tersedia untuk ADMIN dan KEUANGAN.');
  }
  var sheet = _erpSheet_('ERP_AUDIT_LOG', [
    'event_id', 'timestamp', 'actor_email', 'workspace_id', 'action',
    'previous_version', 'new_version', 'checksum', 'details_json'
  ]);
  var records = _erpReadObjects_(sheet).filter(function (row) {
    return String(row.workspace_id) === id;
  });
  var maxRows = Math.max(1, Math.min(200, Math.floor(Number(limit) || 50)));
  return { success: true, events: records.slice(-maxRows).reverse() };
}

function _erpRequireUser_(idToken) {
  var claims = _erpVerifyGoogleToken_(idToken);
  var email = _erpNormalizeEmail_(claims.email);
  var userSheet = _erpSheet_('ERP_USERS', [
    'email', 'display_name', 'role', 'active', 'created_at', 'updated_at'
  ]);
  var found = _erpFindObjectRow_(userSheet, 'email', email);
  var bootstrapAdmins = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '')
    .split(',').map(function (value) { return String(value).trim().toLowerCase(); }).filter(Boolean);

  if (!found && bootstrapAdmins.indexOf(email) >= 0) {
    var now = new Date().toISOString();
    _erpAppendObject_(userSheet, {
      email: email, display_name: String(claims.name || ''), role: 'ADMIN',
      active: 'TRUE', created_at: now, updated_at: now
    });
    found = _erpFindObjectRow_(userSheet, 'email', email);
    _erpAppendAudit_({
      timestamp: now, actor_email: email, workspace_id: '', action: 'BOOTSTRAP_ADMIN_CREATED',
      previous_version: 0, new_version: 0, checksum: '', details_json: '{}'
    });
  }
  if (!found) throw new Error('Akun Google belum diizinkan. Minta ADMIN menambahkan email ini ke ERP_USERS.');
  if (!_erpIsTrue_(found.record.active)) throw new Error('Akun ERP ini dinonaktifkan.');
  var role = String(found.record.role || '').toUpperCase();
  if (!ERP_GLOBAL_ROLES_.includes(role)) throw new Error('Role akun tidak valid. Hubungi ADMIN.');
  return {
    email: email, display_name: String(found.record.display_name || claims.name || ''),
    role: role, active: true
  };
}

function _erpVerifyGoogleToken_(idToken) {
  var token = String(idToken || '').trim();
  if (!token || token.length > 10000) throw new Error('Token login Google tidak valid.');
  var clientId = String(PropertiesService.getScriptProperties().getProperty('GOOGLE_OAUTH_CLIENT_ID') || '').trim();
  if (!clientId) throw new Error('GOOGLE_OAUTH_CLIENT_ID belum dikonfigurasi di Apps Script > Project Settings > Script Properties.');

  // Cache only a token already validated against Google's tokeninfo endpoint. Keep it
  // short to reduce network/Apps Script quota usage; authorization and account status
  // are still checked on every API request below.
  var cache = CacheService.getScriptCache();
  var cacheKey = 'ERP_GOOGLE_ID_' + _erpSha256_(token);
  var cachedClaims = cache.get(cacheKey);
  var claims = null;
  if (cachedClaims) {
    try { claims = JSON.parse(cachedClaims); } catch (ignored) { claims = null; }
  }
  if (!claims) {
    var response = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { method: 'get', muteHttpExceptions: true }
    );
    if (response.getResponseCode() !== 200) throw new Error('Login Google gagal diverifikasi. Silakan login ulang.');
    try { claims = JSON.parse(response.getContentText()); }
    catch (error) { throw new Error('Respons verifikasi Google tidak valid.'); }
  }

  var expiresAt = Number(claims.exp);
  var issuer = String(claims.iss || '');
  if (String(claims.aud || '') !== clientId) throw new Error('Token berasal dari aplikasi Google yang berbeda.');
  if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') throw new Error('Penerbit token Google tidak valid.');
  if (!claims.email || String(claims.email_verified) !== 'true') throw new Error('Email Google belum terverifikasi.');
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) + 15) throw new Error('Sesi Google kedaluwarsa. Login ulang.');
  if (!claims.sub) throw new Error('Identitas unik Google tidak ditemukan.');

  if (!cachedClaims) {
    cache.put(cacheKey, JSON.stringify(claims), 300);
  }
  return claims;
}

function _erpValidateSnapshot_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !input.operational || typeof input.operational !== 'object' || Array.isArray(input.operational) ||
      !input.accounting || typeof input.accounting !== 'object' || Array.isArray(input.accounting)) {
    throw new Error('Snapshot harus berisi object operational dan accounting.');
  }
  ERP_OPERATIONAL_KEYS_.forEach(function (key) {
    if (!Array.isArray(input.operational[key])) throw new Error('Bagian operational.' + key + ' harus berupa array.');
  });
  ERP_ACCOUNTING_KEYS_.forEach(function (key) {
    if (!Array.isArray(input.accounting[key])) throw new Error('Bagian accounting.' + key + ' harus berupa array.');
  });
  var serialized;
  try { serialized = JSON.stringify(input); }
  catch (error) { throw new Error('Snapshot tidak dapat diserialisasi menjadi JSON.'); }
  if (!serialized || serialized.length > ERP_MAX_SNAPSHOT_CHARS_) throw new Error('Snapshot kosong atau melebihi batas 2 MB.');
  return JSON.parse(serialized);
}

function _erpAllowedOperationalKeys_(role) {
  if (role === 'ADMIN') return ERP_OPERATIONAL_KEYS_.slice();
  if (role === 'KEUANGAN') return [
    'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'anggaran', 'taxRecords'
  ];
  if (role === 'PROYEK') return [
    'tanah', 'beko', 'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian',
    'auditLog', 'qcRecords', 'assets', 'housingUnits'
  ];
  return [];
}

function _erpAllowedAccountingKeys_(role) {
  if (role === 'ADMIN') return ERP_ACCOUNTING_KEYS_.slice();
  if (role === 'KEUANGAN') return ERP_ACCOUNTING_KEYS_.slice();
  if (role === 'PROYEK') return ['rab', 'schedule'];
  return [];
}

function _erpReadableOperationalKeys_(role) {
  if (role === 'ADMIN') return ERP_OPERATIONAL_KEYS_.slice();
  if (role === 'KEUANGAN') return [
    'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
    'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'anggaran',
    'taxRecords', 'qcRecords', 'assets', 'housingUnits', 'arusKas', 'menuConfig'
  ];
  if (role === 'PROYEK') return [
    'tanah', 'beko', 'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian',
    'auditLog', 'qcRecords', 'assets', 'housingUnits', 'menuConfig'
  ];
  if (role === 'VIEWER') return ['tanah', 'beko', 'menuConfig'];
  return [];
}

function _erpReadableAccountingKeys_(role) {
  if (role === 'ADMIN' || role === 'KEUANGAN') return ERP_ACCOUNTING_KEYS_.slice();
  if (role === 'PROYEK') return ['rab', 'schedule'];
  return [];
}

function _erpFilterSnapshotForRole_(snapshot, role) {
  if (role === 'ADMIN') return snapshot;
  var allowedOperational = _erpReadableOperationalKeys_(role);
  var allowedAccounting = _erpReadableAccountingKeys_(role);
  var result = { operational: {}, accounting: {} };

  ERP_OPERATIONAL_KEYS_.forEach(function (key) {
    var value = snapshot.operational[key];
    if (allowedOperational.indexOf(key) >= 0) {
      result.operational[key] = value;
    } else {
      result.operational[key] = [];
    }
  });
  ERP_ACCOUNTING_KEYS_.forEach(function (key) {
    var value = snapshot.accounting[key];
    result.accounting[key] = allowedAccounting.indexOf(key) >= 0 ? value : [];
  });

  // Client/VIEWER progress view contains no owner names, payment totals, tariffs,
  // receipt URLs, or notes. It cannot read the underlying private records via the API.
  if (role === 'VIEWER') {
    result.operational.tanah = (snapshot.operational.tanah || []).map(function (land) {
      return {
        id: String(land.id || ''),
        pemilik: '',
        luas_bt: Math.max(0, Number(land.luas_bt) || 0),
        harga_per_bt: 0,
        dp: 0,
        status: ['Lunas', 'DP', 'Belum_Bayar'].indexOf(String(land.status)) >= 0 ? land.status : 'Belum_Bayar',
        kode_bukti: '',
        url_bukti: '',
        catatan: ''
      };
    });
    result.operational.beko = (snapshot.operational.beko || []).map(function (item) {
      return {
        id: String(item.id || ''),
        item: String(item.item || ''),
        panjang: Math.max(0, Number(item.panjang) || 0),
        lebar: Math.max(0, Number(item.lebar) || 0),
        tinggi: Math.max(0, Number(item.tinggi) || 0),
        tarif: 0,
        status: ['Lunas', 'Belum_Ada_Kwitansi', 'Foto_Belum_Tersedia'].indexOf(String(item.status)) >= 0
          ? item.status : 'Foto_Belum_Tersedia',
        kode_bukti: '',
        url_bukti: '',
        catatan: '',
        termasuk_rekap: true,
        satuan_volume: item.satuan_volume === 'unit' || item.satuan_volume === 'ls' ? item.satuan_volume : 'm3'
      };
    });
  }
  return _erpValidateSnapshot_(result);
}

function _erpAssertIncomingVisibility_(oldSnapshot, incomingSnapshot, role) {
  var visibleSnapshot = _erpFilterSnapshotForRole_(oldSnapshot, role);
  var writableOperational = _erpAllowedOperationalKeys_(role);
  var writableAccounting = _erpAllowedAccountingKeys_(role);

  ERP_OPERATIONAL_KEYS_.forEach(function (key) {
    if (writableOperational.indexOf(key) >= 0) return;
    if (_erpStableJson_(incomingSnapshot.operational[key]) !== _erpStableJson_(visibleSnapshot.operational[key])) {
      throw new Error('Role ' + role + ' mengirim perubahan pada modul operational.' + key + ' yang tidak diizinkan.');
    }
  });

  ERP_ACCOUNTING_KEYS_.forEach(function (key) {
    if (writableAccounting.indexOf(key) >= 0) return;
    if (_erpStableJson_(incomingSnapshot.accounting[key]) !== _erpStableJson_(visibleSnapshot.accounting[key])) {
      throw new Error('Role ' + role + ' mengirim perubahan pada modul accounting.' + key + ' yang tidak diizinkan.');
    }
  });
}

function _erpMergeSnapshotForRole_(oldSnapshot, incomingSnapshot, role) {
  if (role === 'ADMIN') return incomingSnapshot;
  var merged = {
    operational: JSON.parse(JSON.stringify(oldSnapshot.operational)),
    accounting: JSON.parse(JSON.stringify(oldSnapshot.accounting))
  };
  _erpAllowedOperationalKeys_(role).forEach(function (key) {
    merged.operational[key] = incomingSnapshot.operational[key];
  });
  _erpAllowedAccountingKeys_(role).forEach(function (key) {
    merged.accounting[key] = incomingSnapshot.accounting[key];
  });
  return _erpValidateSnapshot_(merged);
}

function _erpAssertAuditLogAppendOnly_(oldSnapshot, newSnapshot) {
  var oldLog = oldSnapshot && oldSnapshot.operational && oldSnapshot.operational.auditLog;
  var newLog = newSnapshot && newSnapshot.operational && newSnapshot.operational.auditLog;
  if (!Array.isArray(oldLog) || !Array.isArray(newLog)) {
    throw new Error('Audit log harus tetap berupa array.');
  }
  if (newLog.length < oldLog.length) {
    throw new Error('Audit log bersifat append-only; entri yang sudah ada tidak boleh dihapus.');
  }
  for (var index = 0; index < oldLog.length; index++) {
    if (_erpStableJson_(oldLog[index]) !== _erpStableJson_(newLog[index])) {
      throw new Error('Audit log bersifat append-only; entri lama tidak boleh diedit atau disusun ulang.');
    }
  }
}

function _erpAssertRoleMayChange_(role, oldSnapshot, newSnapshot) {
  _erpAssertAuditLogAppendOnly_(oldSnapshot, newSnapshot);
  var allowedOperational = _erpAllowedOperationalKeys_(role);
  var allowedAccounting = _erpAllowedAccountingKeys_(role);

  var opKeys = {};
  Object.keys(oldSnapshot.operational || {}).concat(Object.keys(newSnapshot.operational || {})).forEach(function (key) { opKeys[key] = true; });
  Object.keys(opKeys).forEach(function (key) {
    if (_erpStableJson_(oldSnapshot.operational[key]) !== _erpStableJson_(newSnapshot.operational[key]) &&
        allowedOperational.indexOf(key) < 0) {
      throw new Error('Role ' + role + ' tidak boleh mengubah modul operational.' + key + '.');
    }
  });

  var accKeys = {};
  Object.keys(oldSnapshot.accounting || {}).concat(Object.keys(newSnapshot.accounting || {})).forEach(function (key) { accKeys[key] = true; });
  Object.keys(accKeys).forEach(function (key) {
    if (_erpStableJson_(oldSnapshot.accounting[key]) !== _erpStableJson_(newSnapshot.accounting[key]) &&
        allowedAccounting.indexOf(key) < 0) {
      throw new Error('Role ' + role + ' tidak boleh mengubah modul accounting.' + key + '.');
    }
  });
}

function _erpStableJson_(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(_erpStableJson_).join(',') + ']';
  return '{' + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ':' + _erpStableJson_(value[key]);
  }).join(',') + '}';
}

function _erpListUserWorkspaces_(email, globalRole) {
  var memberSheet = _erpSheet_('ERP_WORKSPACE_MEMBERS', [
    'workspace_id', 'email', 'role', 'active', 'added_by', 'created_at', 'updated_at'
  ]);
  var metaSheet = _erpSheet_('ERP_WORKSPACES', [
    'workspace_id', 'name', 'owner_email', 'version', 'chunk_count',
    'checksum', 'created_at', 'updated_at', 'updated_by'
  ]);
  var members = _erpReadObjects_(memberSheet).filter(function (row) {
    return String(row.email).toLowerCase() === email && _erpIsTrue_(row.active);
  });
  var metas = _erpReadObjects_(metaSheet);
  return members.map(function (member) {
    var meta = metas.find(function (row) { return String(row.workspace_id) === String(member.workspace_id); });
    if (!meta) return null;
    return {
      id: String(meta.workspace_id), name: String(meta.name), role: _erpEffectiveWorkspaceRole_(String(globalRole || 'VIEWER').toUpperCase(), String(member.role).toUpperCase()),
      version: Number(meta.version), updated_at: String(meta.updated_at || '')
    };
  }).filter(Boolean);
}

function _erpRequireWorkspaceMember_(email, workspaceId, globalRole) {
  var sheet = _erpSheet_('ERP_WORKSPACE_MEMBERS', [
    'workspace_id', 'email', 'role', 'active', 'added_by', 'created_at', 'updated_at'
  ]);
  var found = _erpFindObjectRow_(sheet, 'workspace_id', workspaceId, 'email', email);
  if (!found || !_erpIsTrue_(found.record.active)) throw new Error('Anda tidak memiliki akses ke workspace ini.');
  var role = String(found.record.role || '').toUpperCase();
  if (!ERP_WORKSPACE_ROLES_.includes(role)) throw new Error('Role workspace tidak valid.');
  return { role: _erpEffectiveWorkspaceRole_(String(globalRole || 'VIEWER').toUpperCase(), role), email: email };
}

function _erpEffectiveWorkspaceRole_(globalRole, workspaceRole) {
  if (globalRole === 'ADMIN') return workspaceRole;
  if (globalRole === 'VIEWER' || workspaceRole === 'VIEWER') return 'VIEWER';
  if (globalRole === 'KEUANGAN') return 'KEUANGAN';
  if (globalRole === 'PROYEK') return 'PROYEK';
  return 'VIEWER';
}

function _erpLoadSnapshot_(workspaceId, version, expectedChunks, expectedChecksum) {
  var sheet = _erpSheet_('ERP_STATE_CHUNKS', [
    'workspace_id', 'version', 'chunk_index', 'payload', 'created_at'
  ]);
  var rows = _erpReadObjects_(sheet).filter(function (row) {
    return String(row.workspace_id) === workspaceId && Number(row.version) === version;
  }).sort(function (a, b) { return Number(a.chunk_index) - Number(b.chunk_index); });

  if (rows.length !== expectedChunks || expectedChunks < 1) throw new Error('Snapshot cloud tidak lengkap; tidak ada data yang diubah.');
  var serialized = rows.map(function (row, index) {
    if (Number(row.chunk_index) !== index) throw new Error('Urutan snapshot cloud tidak valid.');
    return String(row.payload || '');
  }).join('');
  if (_erpSha256_(serialized) !== expectedChecksum) throw new Error('Checksum snapshot cloud tidak cocok; data tidak akan dimuat.');
  var parsed;
  try { parsed = JSON.parse(serialized); }
  catch (error) { throw new Error('JSON snapshot cloud rusak; data tidak akan dimuat.'); }
  return _erpValidateSnapshot_(parsed);
}

function _erpSheet_(name, requiredHeaders) {
  var ss = getErpSpreadsheet_();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.setFrozenRows(1);
  } else {
    var width = Math.max(sheet.getLastColumn(), 1);
    var existing = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (value) { return String(value || '').trim(); });
    requiredHeaders.forEach(function (header) {
      if (existing.indexOf(header) < 0) {
        existing.push(header);
        sheet.getRange(1, existing.length).setValue(header);
      }
    });
  }
  return sheet;
}

function _erpReadObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function (value) { return String(value || '').trim(); });
  return rows.slice(1).filter(function (row) {
    return row.some(function (value) { return value !== '' && value !== null; });
  }).map(function (row) {
    var result = {};
    headers.forEach(function (header, index) { if (header) result[header] = row[index]; });
    return result;
  });
}

function _erpFindObjectRow_(sheet, key1, value1, key2, value2) {
  var rows = _erpReadObjects_(sheet);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index][key1] || '').toLowerCase() !== String(value1 || '').toLowerCase()) continue;
    if (key2 && String(rows[index][key2] || '').toLowerCase() !== String(value2 || '').toLowerCase()) continue;
    return { rowNumber: index + 2, record: rows[index] };
  }
  return null;
}

function _erpAppendObject_(sheet, record) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (value) { return String(value || '').trim(); });
  sheet.appendRow(headers.map(function (header) { return record[header] === undefined ? '' : record[header]; }));
}

function _erpWriteObjectRow_(sheet, rowNumber, record) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (value) { return String(value || '').trim(); });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function (header) {
    return record[header] === undefined ? '' : record[header];
  })]);
}

function _erpAppendChunks_(sheet, workspaceId, version, chunks, timestamp) {
  var rows = chunks.map(function (payload, index) {
    return [workspaceId, version, index, payload, timestamp];
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function _erpDeleteChunksForVersion_(sheet, workspaceId, version) {
  var rows = sheet.getDataRange().getValues();
  var remove = [];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === workspaceId && Number(rows[i][1]) === version) remove.push(i + 1);
  }
  _erpDeleteRowsDescending_(sheet, remove);
}

function _erpPruneChunks_(sheet, workspaceId, activeVersion) {
  var oldestToKeep = Math.max(1, activeVersion - ERP_HISTORY_VERSIONS_ + 1);
  var rows = sheet.getDataRange().getValues();
  var remove = [];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === workspaceId && Number(rows[i][1]) < oldestToKeep) remove.push(i + 1);
  }
  _erpDeleteRowsDescending_(sheet, remove);
}

function _erpDeleteRowsDescending_(sheet, rowNumbers) {
  if (!rowNumbers.length) return;
  rowNumbers.sort(function (a, b) { return b - a; });
  var end = rowNumbers[0];
  var start = end;
  for (var i = 1; i <= rowNumbers.length; i++) {
    if (i < rowNumbers.length && rowNumbers[i] === start - 1) {
      start = rowNumbers[i];
      continue;
    }
    sheet.deleteRows(start, end - start + 1);
    if (i < rowNumbers.length) {
      end = rowNumbers[i];
      start = end;
    }
  }
}

function _erpAppendAudit_(record) {
  var sheet = _erpSheet_('ERP_AUDIT_LOG', [
    'event_id', 'timestamp', 'actor_email', 'workspace_id', 'action',
    'previous_version', 'new_version', 'checksum', 'details_json'
  ]);
  _erpAppendObject_(sheet, Object.assign({ event_id: Utilities.getUuid() }, record));
}

function _erpActiveAdminCount_() {
  var sheet = _erpSheet_('ERP_USERS', [
    'email', 'display_name', 'role', 'active', 'created_at', 'updated_at'
  ]);
  return _erpReadObjects_(sheet).filter(function (row) {
    return String(row.role).toUpperCase() === 'ADMIN' && _erpIsTrue_(row.active);
  }).length;
}

function _erpNormalizeEmail_(email) {
  var normalized = String(email || '').trim().toLowerCase();
  if (normalized.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new Error('Alamat email tidak valid.');
  }
  return normalized;
}

function _erpIsTrue_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE' || String(value) === '1' || String(value).toLowerCase() === 'yes';
}

function _erpSplitChunks_(text) {
  var chunks = [];
  for (var start = 0; start < text.length;) {
    var end = Math.min(start + ERP_CHUNK_SIZE_, text.length);
    if (end < text.length) {
      var previousCode = text.charCodeAt(end - 1);
      var nextCode = text.charCodeAt(end);
      if (previousCode >= 0xD800 && previousCode <= 0xDBFF && nextCode >= 0xDC00 && nextCode <= 0xDFFF) end++;
    }
    chunks.push(text.substring(start, end));
    start = end;
  }
  return chunks.length ? chunks : ['{}'];
}

function _erpSha256_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8
  );
  return bytes.map(function (byte) {
    var unsigned = byte < 0 ? byte + 256 : byte;
    return ('0' + unsigned.toString(16)).slice(-2);
  }).join('');
}
