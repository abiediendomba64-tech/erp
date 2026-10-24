export interface CloudUser {
  id: string;
  email: string;
  nama: string;
  role: 'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER';
  status: string;
  workspaceId: string;
}
export interface CloudWorkspace {
  id: string;
  name: string;
  status: string;
}
export interface WorkspaceLoad {
  workspace: CloudWorkspace;
  operational: Record<string, unknown>;
  accounting: Record<string, unknown>;
  versions: { operational: number; accounting: number };
}
export interface CloudStatus {
  state: 'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'conflict';
  message: string;
  updatedAt?: string;
}
type Slice = 'operational' | 'accounting';

const TOKEN_KEY = 'erp.google.idToken.session';
const pending = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();
let requestCounter = 0;
let workspaceId = '';
let activeRole: CloudUser['role'] | '' = '';
let idToken = '';
let versions: Record<Slice, number> = { operational: 0, accounting: 0 };
let blocked: Record<Slice, boolean> = { operational: false, accounting: false };
let failedSnapshots: Partial<Record<Slice, unknown>> = {};
const inFlightSlices = new Set<Slice>();
let queues: Record<Slice, Promise<void>> = { operational: Promise.resolve(), accounting: Promise.resolve() };
let cloudStatus: CloudStatus = { state: 'idle', message: 'Belum terhubung ke Google Apps Script.' };
const listeners = new Set<(status: CloudStatus) => void>();

function notifyStatus(state: CloudStatus['state'], message: string) {
  const requestedState = state;
  const failed = (Object.keys(failedSnapshots) as Slice[]).filter(key => failedSnapshots[key] !== undefined);
  const conflicted = (Object.keys(blocked) as Slice[]).filter(key => blocked[key]);
  if (conflicted.length) {
    state = 'conflict';
    message = 'Ada konflik versi cloud. Perubahan yang tertinggal belum tersimpan; buat backup lalu muat ulang.';
  } else if (failed.length && requestedState !== 'conflict') {
    state = 'error';
    if (requestedState === 'saved' || requestedState === 'saving' || !message) {
      message = 'Sebagian perubahan belum tersimpan ke cloud. Coba lagi atau buat backup.';
    }
  } else if (inFlightSlices.size && requestedState === 'saved') {
    state = 'saving';
    message = 'Masih ada bagian ERP yang sedang disimpan ke cloud…';
  } else if (!workspaceId && requestedState === 'saved') {
    state = 'idle';
    message = 'Tidak ada workspace aktif.';
  }
  cloudStatus = { state, message, updatedAt: new Date().toISOString() };
  listeners.forEach(listener => listener(cloudStatus));
}

function getParentOrigin(): string {
  if (window.parent === window) return '';
  try {
    return document.referrer ? new URL(document.referrer).origin : '';
  } catch {
    return '';
  }
}

window.addEventListener('message', event => {
  const parentOrigin = getParentOrigin();
  if (!parentOrigin || event.source !== window.parent || event.origin !== parentOrigin) return;
  const message = event.data;
  if (!message || message.type !== 'erp-gas-response' || typeof message.requestId !== 'string') return;
  const task = pending.get(message.requestId);
  if (!task) return;
  pending.delete(message.requestId);
  const response = message.response;
  if (!response || response.success !== true) {
    const error = new Error(String(response?.error || 'Backend ERP menolak permintaan.'));
    (error as Error & { code?: string }).code = response?.code;
    task.reject(error);
    return;
  }
  task.resolve(response.data);
});

export function setCloudIdToken(token: string): void {
  idToken = token;
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Memory-only sessions remain functional if sessionStorage is blocked.
  }
}

export function getCloudIdToken(): string {
  if (idToken) return idToken;
  try {
    idToken = window.sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    idToken = '';
  }
  return idToken;
}

export function clearCloudIdToken(): void {
  idToken = '';
  try { window.sessionStorage.removeItem(TOKEN_KEY); } catch { /* no-op */ }
}

export async function gasRpc<T = any>(action: string, payload: Record<string, unknown> = {}, tokenOverride?: string): Promise<T> {
  const token = tokenOverride || getCloudIdToken();
  if (!token) throw new Error('Sesi belum aktif. Masuk menggunakan akun Google.');
  const targetOrigin = getParentOrigin();
  if (!targetOrigin) throw new Error('Panel ERP harus dibuka melalui URL Web App Google Apps Script. Jalur API langsung diblokir.');
  const requestId = 'rpc-' + Date.now() + '-' + (++requestCounter);
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('Backend tidak merespons. Periksa koneksi atau status Apps Script.'));
    }, 30000);
    pending.set(requestId, {
      resolve: value => { window.clearTimeout(timeout); resolve(value as T); },
      reject: error => { window.clearTimeout(timeout); reject(error); }
    });
    window.parent.postMessage({
      type: 'erp-gas-request',
      requestId,
      action,
      payload,
      idToken: token
    }, targetOrigin);
  });
}

export function configureCloudWorkspace(
  token: string,
  id: string,
  nextVersions: { operational: number; accounting: number },
  role: CloudUser['role']
): void {
  setCloudIdToken(token);
  workspaceId = id;
  activeRole = role;
  versions = { operational: nextVersions.operational, accounting: nextVersions.accounting };
  blocked = { operational: false, accounting: false };
  failedSnapshots = {};
  inFlightSlices.clear();
  queues = { operational: Promise.resolve(), accounting: Promise.resolve() };
  notifyStatus('saved', 'Terhubung. Data utama dimuat dari Google Sheets.');
}

export function getActiveWorkspaceId(): string { return workspaceId; }

export function getCloudStatus(): CloudStatus {
  return cloudStatus;
}
export function subscribeCloudStatus(listener: (status: CloudStatus) => void): () => void {
  listeners.add(listener);
  listener(cloudStatus);
  return () => listeners.delete(listener);
}

export async function persistWorkspaceSlice(slice: Slice, data: unknown): Promise<void> {
  if (activeRole === 'VIEWER') return;
  const operation = queues[slice].then(async () => {
    if (!workspaceId || !getCloudIdToken()) throw new Error('Workspace cloud belum aktif. Perubahan belum disimpan.');
    if (blocked[slice]) throw new Error('Penyimpanan diblokir setelah konflik cloud; muat ulang agar data tetap konsisten.');
    inFlightSlices.add(slice);
    notifyStatus('saving', 'Menyimpan perubahan ERP ke Google Sheets…');
    try {
      const result = await gasRpc<{ version: number; changedKeys?: string[]; unchanged?: boolean }>('workspace.save', {
        workspaceId,
        slice,
        data,
        expectedVersion: versions[slice]
      });
      if (!Number.isInteger(result.version)) throw new Error('Backend tidak mengembalikan versi penyimpanan yang valid.');
      versions[slice] = result.version;
      delete failedSnapshots[slice];
      inFlightSlices.delete(slice);
      notifyStatus('saved', 'Perubahan ERP selesai diproses oleh Google Sheets.');
    } catch (error) {
      inFlightSlices.delete(slice);
      failedSnapshots[slice] = data;
      const code = (error as Error & { code?: string }).code || '';
      if (code === 'version_conflict') {
        blocked[slice] = true;
        notifyStatus('conflict', 'Ada perubahan dari perangkat lain. Perubahan lokal belum sinkron; buat backup lalu muat ulang dari cloud.');
      } else {
        notifyStatus('error', 'Gagal menyimpan ke cloud: ' + (error instanceof Error ? error.message : String(error)));
      }
      throw error;
    }
  });
  queues[slice] = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function retryFailedCloudWrites(): Promise<void> {
  const slices = (Object.keys(failedSnapshots) as Slice[]).filter(slice => failedSnapshots[slice] !== undefined);
  if (!slices.length) {
    notifyStatus('idle', 'Tidak ada penyimpanan gagal yang dapat dicoba ulang.');
    return;
  }
  for (const slice of slices) {
    if (blocked[slice]) continue;
    const snapshot = failedSnapshots[slice];
    await persistWorkspaceSlice(slice, snapshot);
  }
}

export function clearCloudWorkspace(): void {
  workspaceId = '';
  activeRole = '';
  versions = { operational: 0, accounting: 0 };
  blocked = { operational: false, accounting: false };
  failedSnapshots = {};
  inFlightSlices.clear();
  queues = { operational: Promise.resolve(), accounting: Promise.resolve() };
  clearCloudIdToken();
  notifyStatus('idle', 'Sesi ERP ditutup.');
}
