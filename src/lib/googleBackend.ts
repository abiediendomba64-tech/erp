export type BackendUser = {
  sub: string;
  email: string;
  nama: string;
  role: 'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER';
  exp?: number;
};
export type WorkspaceSnapshot = {
  operational: Record<string, unknown>;
  accounting: Record<string, unknown>;
};
export type CloudStatus = {
  status: 'ready' | 'saving' | 'saved' | 'error' | 'conflict';
  message: string;
  version: number | null;
};
type BackendRequest = Record<string, unknown> & { action: string };
type BackendEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const env = import.meta.env as ImportMetaEnv & {
  VITE_GAS_WEB_APP_URL?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
};
export const gasWebAppUrl = (env.VITE_GAS_WEB_APP_URL || '').trim();
export const googleClientId = (env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const isGoogleBackendConfigured = Boolean(gasWebAppUrl && googleClientId);
export const SESSION_STORAGE_KEY = 'erp.cloud.session.v1';
const CHANNEL = 'erp-google-apps-script-bridge-v1';
const TRUSTED_BRIDGE_ORIGINS = new Set(['https://script.google.com', 'https://script.googleusercontent.com']);
const REQUEST_TIMEOUT_MS = 25000;
let frame: HTMLIFrameElement | null = null;
let readyPromise: Promise<void> | null = null;
let bridgeOrigin: string | null = null;
let bridgeReadyTimer: number | null = null;
let sequence = 0;
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: number }>();

function ensureBridge(): Promise<void> {
  if (!isGoogleBackendConfigured) {
    return Promise.reject(new Error('Backend Google belum dikonfigurasi. Isi VITE_GAS_WEB_APP_URL dan VITE_GOOGLE_CLIENT_ID lalu deploy ulang panel web.'));
  }
  if (frame && readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    frame = document.createElement('iframe');
    frame.title = 'ERP Google backend connection';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    frame.style.left = '-10px';
    frame.style.bottom = '-10px';
    const url = new URL(gasWebAppUrl);
    url.searchParams.set('bridge', '1');
    frame.src = url.toString();

    const onMessage = (event: MessageEvent) => {
      if (!frame || event.source !== frame.contentWindow || !TRUSTED_BRIDGE_ORIGINS.has(event.origin) ||
          !event.data || event.data.channel !== CHANNEL) return;
      if (event.data.type === 'ready') {
        bridgeOrigin = event.origin;
        if (bridgeReadyTimer !== null) window.clearTimeout(bridgeReadyTimer);
        bridgeReadyTimer = null;
        resolve();
        return;
      }
      if (!bridgeOrigin || event.origin !== bridgeOrigin) return;
      const requestId = String(event.data.requestId || '');
      const operation = pending.get(requestId);
      if (!operation) return;
      window.clearTimeout(operation.timer);
      pending.delete(requestId);
      operation.resolve(event.data.result);
    };
    window.addEventListener('message', onMessage);

    frame.onerror = () => reject(new Error('Iframe backend Google tidak dapat dimuat. Periksa URL deployment Apps Script.'));
    document.body.appendChild(frame);

    bridgeReadyTimer = window.setTimeout(() => {
      bridgeReadyTimer = null;
      if (frame && !bridgeOrigin) {
        // If the bridge did not send ready, fail visibly instead of pretending to sync.
        reject(new Error('Backend Google tidak merespons dalam 25 detik. Periksa deployment Apps Script dan daftar origin yang diizinkan.'));
      }
    }, REQUEST_TIMEOUT_MS);
  });
  return readyPromise;
}

export async function callGoogleBackend<T>(request: BackendRequest): Promise<T> {
  await ensureBridge();
  if (!frame?.contentWindow) throw new Error('Frame backend belum aktif.');
  const requestId = 'erp-' + Date.now().toString(36) + '-' + (++sequence).toString(36);
  const response = await new Promise<unknown>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('Backend Google tidak merespons. Periksa koneksi dan status Apps Script.'));
    }, REQUEST_TIMEOUT_MS);
    pending.set(requestId, { resolve, reject, timer });
    if (!bridgeOrigin) { window.clearTimeout(timer); pending.delete(requestId); reject(new Error('Origin backend belum tervalidasi.')); return; }
    frame!.contentWindow!.postMessage({ channel: CHANNEL, requestId, payload: request }, bridgeOrigin);
  });
  const envelope = response as BackendEnvelope<T>;
  if (!envelope || typeof envelope !== 'object' || !('ok' in envelope)) {
    throw new Error('Respons backend tidak valid. Data belum dipastikan tersimpan.');
  }
  if (!envelope.ok) throw new Error(envelope.error?.message || 'Backend menolak permintaan.');
  return envelope.data;
}

export function getSessionToken(): string {
  try { return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || ''; }
  catch { return ''; }
}
export function setSessionToken(value: string): void {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, value);
}
export function clearSessionToken(): void {
  try { window.sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* unavailable storage */ }
}

let currentVersion: number | null = null;
let currentSnapshot: WorkspaceSnapshot | null = null;
let currentToken = '';
let writesBlocked = false;
let writeQueue: Promise<void> = Promise.resolve();
let cloudStatus: CloudStatus = { status: 'ready', message: 'Menunggu koneksi backend Google…', version: null };
const listeners = new Set<(status: CloudStatus) => void>();

function publish(status: CloudStatus['status'], message: string, version = currentVersion) {
  cloudStatus = { status, message, version };
  listeners.forEach(listener => listener(cloudStatus));
}
export function subscribeCloudStatus(listener: (status: CloudStatus) => void) {
  listeners.add(listener);
  listener(cloudStatus);
  return () => listeners.delete(listener);
}
export function getCloudStatus() { return cloudStatus; }

export function configureCloudWorkspace(token: string, snapshot: WorkspaceSnapshot, version: number) {
  currentToken = token;
  currentSnapshot = JSON.parse(JSON.stringify(snapshot)) as WorkspaceSnapshot;
  currentVersion = version;
  writesBlocked = false;
  writeQueue = Promise.resolve();
  publish('saved', 'Terhubung ke Google Sheets cloud.', version);
}
export function clearCloudWorkspace() {
  currentToken = '';
  currentSnapshot = null;
  currentVersion = null;
  writesBlocked = false;
  writeQueue = Promise.resolve();
  publish('ready', 'Tidak ada workspace cloud aktif.', null);
}

export async function persistWorkspaceSlice(slice: 'operational' | 'accounting', nextValue: unknown): Promise<void> {
  const serialized = JSON.stringify(nextValue);
  const operation = writeQueue.then(async () => {
    if (!currentToken || !currentSnapshot || currentVersion === null) throw new Error('Sesi cloud belum siap; perubahan tidak dapat disimpan.');
    if (writesBlocked) throw new Error('Penulisan cloud diblokir setelah konflik/error. Muat ulang dan ambil versi cloud terbaru.');
    const candidate: WorkspaceSnapshot = { ...currentSnapshot, [slice]: JSON.parse(serialized) };
    publish('saving', 'Menyimpan perubahan ke Google Sheets…', currentVersion);
    const result = await callGoogleBackend<{ saved: boolean; conflict?: boolean; version?: number; error_code?: string }>({
      action: 'workspace.save',
      sessionToken: currentToken,
      snapshot: candidate,
      expectedVersion: currentVersion,
    });
    if (result.saved !== true || typeof result.version !== 'number') {
      if (result.conflict || result.error_code === 'conflict') {
        writesBlocked = true;
        publish('conflict', 'Ada perubahan dari perangkat lain. Perubahan terakhir belum tersimpan; muat ulang untuk mengambil versi cloud terbaru.', result.version ?? currentVersion);
        throw new Error('Versi cloud berubah dari perangkat lain.');
      }
      throw new Error('Backend menolak penyimpanan cloud. Perubahan belum tersimpan.');
    }
    currentSnapshot = candidate;
    currentVersion = result.version;
    publish('saved', 'Semua perubahan tersimpan di Google Sheets.', currentVersion);
  });
  writeQueue = operation.catch((error: unknown) => {
    if (cloudStatus.status !== 'conflict') {
      writesBlocked = true;
      publish('error', error instanceof Error ? 'Gagal menyimpan ke cloud: ' + error.message + ' Muat ulang sebelum melanjutkan.' : 'Gagal menyimpan ke cloud. Muat ulang sebelum melanjutkan.');
    }
  });
  await operation;
}
