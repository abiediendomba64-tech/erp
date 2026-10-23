import type { WorkspaceSnapshot } from './initialWorkspace';

const env = import.meta.env as ImportMetaEnv & {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
};
const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();

export const isFirebaseConfigured = Boolean(apiKey && projectId);

const SESSION_STORAGE_KEY = 'abiedien.erp.firebase.session.v1';
const FIRESTORE_BASE = projectId
  ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`
  : '';

export interface FirebaseSession {
  localId: string;
  email: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserWorkspace {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'provisioning';
}

export interface LoadedWorkspace {
  snapshot: WorkspaceSnapshot;
  versions: Record<string, number>;
}

type FirestoreValue = Record<string, unknown>;
type FirestoreDoc = { name: string; fields?: Record<string, FirestoreValue>; updateTime?: string };

class FirebaseHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'FirebaseHttpError';
  }
}

function authUrl(path: string) {
  if (!apiKey) throw new Error('VITE_FIREBASE_API_KEY belum diatur.');
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(apiKey)}`;
}

function secureTokenUrl() {
  if (!apiKey) throw new Error('VITE_FIREBASE_API_KEY belum diatur.');
  return `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`;
}

async function responseJson(response: Response) {
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string; status?: string };
  };
  if (!response.ok) {
    const code = payload.error?.message || payload.error?.status || `HTTP_${response.status}`;
    const messages: Record<string, string> = {
      EMAIL_EXISTS: 'Email sudah terdaftar.',
      INVALID_EMAIL: 'Format email tidak valid.',
      INVALID_LOGIN_CREDENTIALS: 'Email atau kata sandi salah.',
      EMAIL_NOT_FOUND: 'Email belum terdaftar.',
      INVALID_PASSWORD: 'Email atau kata sandi salah.',
      WEAK_PASSWORD: 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.',
      TOO_MANY_ATTEMPTS_TRY_LATER: 'Terlalu banyak percobaan. Coba lagi nanti.',
      OPERATION_NOT_ALLOWED: 'Metode Email/Password belum diaktifkan pada Firebase Authentication.',
      API_KEY_INVALID: 'Firebase API key tidak valid.',
      PROJECT_NOT_FOUND: 'Project ID Firebase tidak ditemukan.',
      PERMISSION_DENIED: 'Akses database ditolak oleh Firestore Security Rules.',
      ABORTED: 'Transaksi berubah bersamaan. Muat ulang data cloud sebelum mencoba lagi.',
    };
    throw new FirebaseHttpError(messages[code] || code.replaceAll('_', ' '), response.status);
  }
  return payload as Record<string, unknown>;
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(authUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return responseJson(response);
}

function saveSession(session: FirebaseSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('erp-firebase-auth-changed'));
}

export function getSavedSession(): FirebaseSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<FirebaseSession>;
    if (
      typeof value.localId !== 'string' ||
      typeof value.email !== 'string' ||
      typeof value.idToken !== 'string' ||
      typeof value.refreshToken !== 'string' ||
      typeof value.expiresAt !== 'number'
    ) return null;
    return value as FirebaseSession;
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<FirebaseSession> {
  const result = await authRequest('accounts:signInWithPassword', {
    email: email.trim().toLowerCase(),
    password,
    returnSecureToken: true,
  });
  const session = sessionFromAuthResponse(result);
  saveSession(session);
  return session;
}

export async function signUp(email: string, password: string): Promise<FirebaseSession> {
  const result = await authRequest('accounts:signUp', {
    email: email.trim().toLowerCase(),
    password,
    returnSecureToken: true,
  });
  const session = sessionFromAuthResponse(result);
  saveSession(session);
  return session;
}

export async function sendPasswordReset(email: string) {
  await authRequest('accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email: email.trim().toLowerCase(),
  });
}

export async function signOut() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event('erp-firebase-auth-changed'));
}

function sessionFromAuthResponse(result: Record<string, unknown>): FirebaseSession {
  if (
    typeof result.localId !== 'string' ||
    typeof result.email !== 'string' ||
    typeof result.idToken !== 'string' ||
    typeof result.refreshToken !== 'string'
  ) throw new Error('Firebase Auth tidak mengembalikan sesi yang valid.');
  const seconds = Number(result.expiresIn || 3600);
  return {
    localId: result.localId,
    email: result.email,
    idToken: result.idToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + seconds * 1000,
  };
}

export async function getValidSession(): Promise<FirebaseSession> {
  const saved = getSavedSession();
  if (!saved) throw new Error('Sesi login sudah berakhir. Silakan masuk kembali.');
  if (saved.expiresAt > Date.now() + 120_000) return saved;
  const response = await fetch(secureTokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: saved.refreshToken,
    }),
  });
  const result = await responseJson(response);
  if (
    typeof result.id_token !== 'string' ||
    typeof result.refresh_token !== 'string' ||
    typeof result.user_id !== 'string'
  ) {
    await signOut();
    throw new Error('Sesi Firebase tidak dapat diperbarui. Silakan masuk kembali.');
  }
  const next: FirebaseSession = {
    localId: result.user_id,
    email: typeof result.user_id === 'string' ? saved.email : saved.email,
    idToken: result.id_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000,
  };
  saveSession(next);
  return next;
}

function firestoreResourceName(path: string) {
  if (!projectId) throw new Error('VITE_FIREBASE_PROJECT_ID belum diatur.');
  return `projects/${projectId}/databases/(default)/documents/${path}`;
}

function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Data ERP mengandung angka yang bukan finite number.');
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) fields[key] = encodeFirestoreValue(item);
    }
    return { mapValue: { fields } };
  }
  throw new Error('Jenis data ERP tidak didukung oleh Firestore.');
}

function decodeFirestoreValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] })?.values || [];
    return values.map(decodeFirestoreValue);
  }
  if ('mapValue' in value) {
    const fields = (value.mapValue as { fields?: Record<string, FirestoreValue> })?.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return null;
}

function encodeFields(data: Record<string, unknown>) {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) fields[key] = encodeFirestoreValue(value);
  }
  return fields;
}

function decodeFields(fields: Record<string, FirestoreValue> | undefined) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

async function firestoreRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
  query?: Record<string, string>,
) {
  const session = await getValidSession();
  const url = new URL(path.startsWith(':')
    ? `${FIRESTORE_BASE}${path}`
    : `${FIRESTORE_BASE}/${path}`);
  for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return responseJson(response);
}

async function readDocument(path: string, transaction?: string): Promise<FirestoreDoc | null> {
  const session = await getValidSession();
  const url = new URL(`${FIRESTORE_BASE}/${path}`);
  if (transaction) url.searchParams.set('transaction', transaction);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.idToken}` },
  });
  if (response.status === 404) return null;
  const payload = await responseJson(response);
  return {
    name: String(payload.name || ''),
    fields: payload.fields as Record<string, FirestoreValue> | undefined,
    updateTime: typeof payload.updateTime === 'string' ? payload.updateTime : undefined,
  };
}

async function listDocuments(path: string): Promise<FirestoreDoc[]> {
  const result: FirestoreDoc[] = [];
  let pageToken: string | undefined;
  do {
    const query: Record<string, string> = { pageSize: '1000' };
    if (pageToken) query.pageToken = pageToken;
    const payload = await firestoreRequest(path, 'GET', undefined, query);
    const documents = Array.isArray(payload.documents) ? payload.documents as FirestoreDoc[] : [];
    result.push(...documents);
    pageToken = typeof payload.nextPageToken === 'string' ? payload.nextPageToken : undefined;
  } while (pageToken);
  return result;
}

async function commitWrites(writes: Record<string, unknown>[], transaction?: string) {
  const body: Record<string, unknown> = { writes };
  if (transaction) body.transaction = transaction;
  return firestoreRequest(':commit', 'POST', body);
}

function updateWrite(path: string, data: Record<string, unknown>, fieldMask?: string[]) {
  const update: Record<string, unknown> = {
    name: firestoreResourceName(path),
    fields: encodeFields(data),
  };
  return {
    update,
    ...(fieldMask ? { updateMask: { fieldPaths: fieldMask } } : {}),
  };
}

function deleteWrite(path: string) {
  return { delete: firestoreResourceName(path) };
}

function recordIdentity(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Setiap baris cloud harus berupa object dengan ID stabil.');
  }
  const item = value as Record<string, unknown>;
  const key = [item.id, item.kode, item.id_unit, item.no_invoice].find(candidate =>
    typeof candidate === 'string' && candidate.trim().length > 0
  );
  if (typeof key !== 'string') throw new Error('Baris ERP tidak memiliki id/kode unik yang stabil.');
  return key;
}

function firestoreRecordId(key: string) {
  const bytes = new TextEncoder().encode(key);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return 'r_' + btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function recordPath(workspaceId: string, moduleName: string, key: string) {
  return `workspaces/${workspaceId}/modules/${moduleName}/records/${firestoreRecordId(key)}`;
}

function metaPath(workspaceId: string, moduleName: string) {
  return `workspaces/${workspaceId}/modules/${moduleName}/meta/state`;
}

function objectFromDocument(document: FirestoreDoc) {
  return decodeFields(document.fields);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(item as Record<string, unknown>).sort()) {
      sorted[key] = (item as Record<string, unknown>)[key];
    }
    return sorted;
  });
}

async function rollbackTransaction(transaction: string) {
  try {
    await firestoreRequest(':rollback', 'POST', { transaction });
  } catch {
    // Rollback is best effort; the server closes abandoned read-write transactions.
  }
}

interface ModuleCache {
  rows: unknown[];
  version: number;
}

let activeWorkspaceId: string | null = null;
let moduleCache = new Map<string, ModuleCache>();
let writesBlocked = false;
let writeQueue: Promise<void> = Promise.resolve();
export type CloudSaveStatus = 'ready' | 'saving' | 'saved' | 'error' | 'conflict';
export interface CloudStatus {
  status: CloudSaveStatus;
  message: string;
  workspaceId: string | null;
}
let cloudStatus: CloudStatus = { status: 'ready', message: 'Login diperlukan.', workspaceId: null };
const listeners = new Set<(status: CloudStatus) => void>();

function publish(status: CloudSaveStatus, message: string) {
  cloudStatus = { status, message, workspaceId: activeWorkspaceId };
  listeners.forEach(listener => listener(cloudStatus));
}

export function subscribeCloudStatus(listener: (status: CloudStatus) => void) {
  listeners.add(listener);
  listener(cloudStatus);
  return () => listeners.delete(listener);
}

export function getCloudStatus() {
  return cloudStatus;
}

export function clearWorkspaceSession() {
  activeWorkspaceId = null;
  moduleCache = new Map();
  writesBlocked = false;
  writeQueue = Promise.resolve();
  publish('ready', 'Tidak ada workspace aktif.');
}

export function hasActiveWorkspaceSession() {
  return Boolean(activeWorkspaceId);
}

export async function listUserWorkspaces(uid: string): Promise<UserWorkspace[]> {
  const indexes = await listDocuments(`users/${uid}/workspaces`);
  const workspaces: UserWorkspace[] = [];
  for (const index of indexes) {
    const data = objectFromDocument(index);
    const id = String(data.workspaceId || index.name.split('/').pop() || '');
    if (!id) continue;
    const workspaceDoc = await readDocument(`workspaces/${id}`);
    if (!workspaceDoc) continue;
    const workspace = objectFromDocument(workspaceDoc);
    const status = workspace.status === 'active' ? 'active' : 'provisioning';
    workspaces.push({
      id,
      name: String(workspace.name || data.name || 'Workspace ERP'),
      role: ['owner', 'admin', 'editor', 'viewer'].includes(String(data.role))
        ? data.role as UserWorkspace['role'] : 'viewer',
      status,
    });
  }
  return workspaces;
}

async function getOrCreateModuleMeta(workspaceId: string, moduleName: string) {
  const meta = await readDocument(metaPath(workspaceId, moduleName));
  return meta ? objectFromDocument(meta) : { version: 0 };
}

export async function loadWorkspace(workspace: UserWorkspace, moduleNames: readonly string[]): Promise<LoadedWorkspace> {
  const { createEmptyWorkspaceSnapshot, OPERATIONAL_MODULES, ACCOUNTING_MODULES } = await import('./initialWorkspace');
  const snapshot = createEmptyWorkspaceSnapshot();
  const versions: Record<string, number> = {};

  await Promise.all(moduleNames.map(async (moduleName) => {
    const docs = await listDocuments(`workspaces/${workspace.id}/modules/${moduleName}/records`);
    const rows = docs.map(doc => objectFromDocument(doc));
    const meta = await getOrCreateModuleMeta(workspace.id, moduleName);
    const version = Number(meta.version || 0);
    versions[moduleName] = version;
    const isOperational = (OPERATIONAL_MODULES as readonly string[]).includes(moduleName);
    const target = isOperational ? snapshot.operational : snapshot.accounting;
    target[moduleName] = rows;
  }));

  // Empty collections still have stable module keys from createEmptyWorkspaceSnapshot.
  for (const key of OPERATIONAL_MODULES) if (!Array.isArray(snapshot.operational[key])) snapshot.operational[key] = [];
  for (const key of ACCOUNTING_MODULES) if (!Array.isArray(snapshot.accounting[key])) snapshot.accounting[key] = [];

  configureWorkspaceSession(workspace.id, snapshot, versions);
  return { snapshot, versions };
}

export function configureWorkspaceSession(
  workspaceId: string,
  snapshot: WorkspaceSnapshot,
  versions: Record<string, number>,
) {
  activeWorkspaceId = workspaceId;
  moduleCache = new Map();
  for (const [moduleName, rows] of Object.entries({ ...snapshot.operational, ...snapshot.accounting })) {
    moduleCache.set(moduleName, {
      rows: Array.isArray(rows) ? structuredClone(rows) : [],
      version: versions[moduleName] ?? 0,
    });
  }
  writesBlocked = false;
  writeQueue = Promise.resolve();
  publish('saved', 'Workspace dimuat dari Firestore.');
}

async function saveModule(workspaceId: string, moduleName: string, nextRows: unknown[]) {
  const cache = moduleCache.get(moduleName);
  if (!cache) throw new Error(`Cache modul "${moduleName}" belum dimuat dari cloud.`);

  const previous = new Map<string, unknown>();
  const next = new Map<string, unknown>();
  for (const item of cache.rows) {
    const key = recordIdentity(item);
    if (previous.has(key)) throw new Error(`ID duplikat "${key}" di modul ${moduleName}.`);
    previous.set(key, item);
  }
  for (const item of nextRows) {
    const key = recordIdentity(item);
    if (next.has(key)) throw new Error(`ID duplikat "${key}" di modul ${moduleName}.`);
    next.set(key, item);
  }

  const writes: Record<string, unknown>[] = [];
  for (const [key, value] of next) {
    if (!previous.has(key) || stableStringify(previous.get(key)) !== stableStringify(value)) {
      writes.push(updateWrite(recordPath(workspaceId, moduleName, key), value as Record<string, unknown>));
    }
  }
  for (const key of previous.keys()) {
    if (!next.has(key)) writes.push(deleteWrite(recordPath(workspaceId, moduleName, key)));
  }
  if (!writes.length) return;
  // Firestore transactions have a finite per-commit write limit. Fail safely; never split
  // an ordinary multi-record correction across commits that could be only partially applied.
  if (writes.length > 450) {
    throw new Error(`Perubahan modul ${moduleName} memuat ${writes.length} baris sekaligus. Batasi perubahan per simpan agar transaksi tetap atomik.`);
  }

  const transactionResult = await firestoreRequest(':beginTransaction', 'POST', { options: { readWrite: {} } });
  const transaction = transactionResult.transaction;
  if (typeof transaction !== 'string') throw new Error('Firestore tidak membuat transaksi tulis.');
  try {
    const meta = await readDocument(metaPath(workspaceId, moduleName), transaction);
    const serverVersion = meta ? Number(objectFromDocument(meta).version || 0) : 0;
    if (serverVersion !== cache.version) {
      throw new FirebaseHttpError('Versi cloud berubah di perangkat lain. Muat ulang sebelum menyimpan perubahan berikutnya.', 409);
    }
    writes.push(updateWrite(metaPath(workspaceId, moduleName), {
      version: serverVersion + 1,
      updatedAt: new Date().toISOString(),
    }));
    await commitWrites(writes, transaction);
    moduleCache.set(moduleName, { rows: structuredClone(nextRows), version: serverVersion + 1 });
  } catch (error) {
    await rollbackTransaction(transaction);
    if (error instanceof FirebaseHttpError && (error.status === 409 || error.status === 409)) {
      writesBlocked = true;
      publish('conflict', error.message);
    }
    throw error;
  }
}

export function persistWorkspaceSnapshot(
  slice: 'operational' | 'accounting',
  nextState: Record<string, unknown>,
): Promise<void> {
  let resolveTask!: () => void;
  let rejectTask!: (error: Error) => void;
  const task = new Promise<void>((resolve, reject) => { resolveTask = resolve; rejectTask = reject; });

  writeQueue = writeQueue.then(async () => {
    if (!activeWorkspaceId) throw new Error('Workspace cloud belum siap; perubahan tidak disimpan.');
    if (writesBlocked) throw new Error('Penulisan diblokir setelah konflik. Muat ulang untuk mengambil data cloud terbaru.');
    const workspaceId = activeWorkspaceId;
    const moduleNames = Object.keys(nextState).filter(key => Array.isArray(nextState[key]));
    for (const moduleName of moduleNames) {
      await saveModule(workspaceId, moduleName, nextState[moduleName] as unknown[]);
    }
    publish('saved', 'Perubahan tersimpan di Firestore.');
  }).then(resolveTask).catch((error: unknown) => {
    if (!(error instanceof FirebaseHttpError && error.status === 409)) {
      writesBlocked = true;
      publish('error', error instanceof Error ? `Gagal menyimpan cloud: ${error.message}. Muat ulang sebelum melanjutkan.` : 'Gagal menyimpan cloud. Muat ulang sebelum melanjutkan.');
    }
    rejectTask(error instanceof Error ? error : new Error(String(error)));
  });
  return task;
}

export interface WorkspaceMember {
  uid: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  createdAt: string;
}

export async function getCurrentSessionInfo() {
  const session = await getValidSession();
  return { uid: session.localId, email: session.email };
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const docs = await listDocuments(`workspaces/${workspaceId}/members`);
  return docs.map(doc => {
    const data = objectFromDocument(doc);
    const uid = String(data.userId || doc.name.split('/').pop() || '');
    const role = ['owner', 'admin', 'editor', 'viewer'].includes(String(data.role))
      ? data.role as WorkspaceMember['role'] : 'viewer';
    return {
      uid,
      email: typeof data.email === 'string' ? data.email : '',
      role,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    };
  }).sort((a, b) => a.email.localeCompare(b.email) || a.uid.localeCompare(b.uid));
}

export async function addWorkspaceMember(
  workspaceId: string,
  workspaceName: string,
  uidInput: string,
  emailInput: string,
  role: 'admin' | 'editor' | 'viewer',
) {
  const uid = uidInput.trim();
  const email = emailInput.trim().toLowerCase();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(uid)) {
    throw new Error('Firebase UID harus 8-128 karakter dan hanya huruf, angka, garis bawah, atau tanda hubung.');
  }
  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    throw new Error('Masukkan email anggota yang benar.');
  }
  if (!['admin', 'editor', 'viewer'].includes(role)) throw new Error('Role anggota tidak valid.');
  if (await readDocument(`workspaces/${workspaceId}/members/${uid}`)) {
    throw new Error('UID tersebut sudah terdaftar sebagai anggota workspace.');
  }
  const createdAt = new Date().toISOString();
  await commitWrites([
    updateWrite(`workspaces/${workspaceId}/members/${uid}`, { userId: uid, email, role, createdAt }),
    updateWrite(`users/${uid}/workspaces/${workspaceId}`, {
      workspaceId, name: workspaceName, role, createdAt,
    }),
  ]);
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  workspaceName: string,
  uid: string,
  role: 'admin' | 'editor' | 'viewer',
) {
  if (!['admin', 'editor', 'viewer'].includes(role)) throw new Error('Role anggota tidak valid.');
  const path = `workspaces/${workspaceId}/members/${uid}`;
  const document = await readDocument(path);
  if (!document) throw new Error('Anggota tidak ditemukan.');
  const current = objectFromDocument(document);
  if (current.role === 'owner') throw new Error('Role owner tidak dapat diubah dari daftar anggota.');
  const next = { ...current, userId: uid, role };
  const indexPath = `users/${uid}/workspaces/${workspaceId}`;
  const indexDocument = await readDocument(indexPath);
  const index = indexDocument ? objectFromDocument(indexDocument) : {};
  await commitWrites([
    updateWrite(path, next),
    updateWrite(indexPath, {
      ...index, workspaceId, name: workspaceName, role,
      createdAt: typeof current.createdAt === 'string' ? current.createdAt : new Date().toISOString(),
    }),
  ]);
}

export async function createWorkspace(
  uid: string,
  email: string,
  name: string,
  snapshot: WorkspaceSnapshot,
) {
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 100) throw new Error('Nama workspace harus 2-100 karakter.');

  // Validate all module data before creating a workspace, so duplicate/invalid imports
  // cannot leave an orphaned provisioning workspace.
  const allModules = { ...snapshot.operational, ...snapshot.accounting };
  const prepared: Array<{ moduleName: string; writes: Record<string, unknown>[] }> = [];
  for (const [moduleName, rawRows] of Object.entries(allModules)) {
    if (!Array.isArray(rawRows)) throw new Error(`Data modul ${moduleName} bukan array.`);
    const unique = new Set<string>();
    const writes: Record<string, unknown>[] = [];
    for (const row of rawRows as unknown[]) {
      const identity = recordIdentity(row);
      if (unique.has(identity)) throw new Error(`ID duplikat "${identity}" pada modul ${moduleName}; impor dibatalkan.`);
      unique.add(identity);
      const rowString = stableStringify(row);
      if (rowString.length > 700_000) throw new Error(`Satu record pada modul ${moduleName} terlalu besar untuk satu dokumen cloud.`);
      writes.push(updateWrite('', row as Record<string, unknown>));
    }
    prepared.push({ moduleName, writes });
  }

  const workspaceId = crypto.randomUUID().replaceAll('-', '');
  const createdAt = new Date().toISOString();
  await commitWrites([
    updateWrite(`workspaces/${workspaceId}`, {
      ownerUid: uid,
      name: cleanName,
      status: 'provisioning',
      schemaVersion: 1,
      createdAt,
    }),
    updateWrite(`workspaces/${workspaceId}/members/${uid}`, {
      userId: uid,
      email,
      role: 'owner',
      createdAt,
    }),
    updateWrite(`users/${uid}/workspaces/${workspaceId}`, {
      workspaceId,
      name: cleanName,
      role: 'owner',
      createdAt,
    }),
  ]);

  for (const group of prepared) {
    const moduleName = group.moduleName;
    const allWrites = group.writes.map((write, index) => {
      const rawRows = allModules[moduleName] as unknown[];
      const identity = recordIdentity(rawRows[index]);
      return updateWrite(recordPath(workspaceId, moduleName, identity), rawRows[index] as Record<string, unknown>);
    });
    for (let offset = 0; offset < allWrites.length; offset += 350) {
      await commitWrites(allWrites.slice(offset, offset + 350));
    }
    await commitWrites([updateWrite(metaPath(workspaceId, moduleName), {
      version: 1,
      updatedAt: createdAt,
    })]);
  }

  await commitWrites([updateWrite(`workspaces/${workspaceId}`, { status: 'active' }, ['status'])]);
  return {
    id: workspaceId,
    name: cleanName,
    role: 'owner' as const,
    status: 'active' as const,
  };
}
export async function switchToWorkspace(workspace: UserWorkspace, moduleNames: readonly string[]) {
  const loaded = await loadWorkspace(workspace, moduleNames);
  window.localStorage.setItem('abiedien.erp.app.v1', JSON.stringify(loaded.snapshot.operational));
  window.localStorage.setItem('abiedien.erp.accounting.v1', JSON.stringify(loaded.snapshot.accounting));
  return loaded;
}
