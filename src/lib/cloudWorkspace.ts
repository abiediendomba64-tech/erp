import { callGoogleAppsScript } from './googleAppsScriptBridge';

export type CloudRole = 'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER';

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: CloudRole;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  lastLogin?: string;
}

export interface WorkspaceSnapshot {
  operational: Record<string, unknown>;
  accounting: Record<string, unknown>;
}

export interface CloudStatus {
  status: 'ready' | 'saving' | 'saved' | 'error' | 'conflict';
  message: string;
  version: number | null;
}

let activeToken: string | null = null;
let activeVersion: number | null = null;
let currentSnapshot: WorkspaceSnapshot | null = null;
let writeBlocked = false;
let queue: Promise<void> = Promise.resolve();
let status: CloudStatus = {
  status: 'ready',
  message: 'Menunggu koneksi ke Google Sheets.',
  version: null
};
const subscribers = new Set<(value: CloudStatus) => void>();

function publish(next: CloudStatus): void {
  status = next;
  subscribers.forEach(listener => listener(status));
}

export function subscribeCloudStatus(listener: (value: CloudStatus) => void): () => void {
  subscribers.add(listener);
  listener(status);
  return () => subscribers.delete(listener);
}

export function getCloudStatus(): CloudStatus {
  return status;
}

export function clearCloudWorkspace(): void {
  activeToken = null;
  activeVersion = null;
  currentSnapshot = null;
  writeBlocked = false;
  queue = Promise.resolve();
  publish({ status: 'ready', message: 'Tidak ada sesi cloud aktif.', version: null });
}

export function activateCloudWorkspace(
  token: string,
  snapshot: WorkspaceSnapshot,
  version: number
): void {
  activeToken = token;
  activeVersion = version;
  currentSnapshot = JSON.parse(JSON.stringify(snapshot)) as WorkspaceSnapshot;
  writeBlocked = false;
  queue = Promise.resolve();
  publish({
    status: 'saved',
    message: 'Data dimuat dari Google Sheets. Penyimpanan cloud aktif.',
    version
  });
}

export function writeSnapshotToBrowserCache(snapshot: WorkspaceSnapshot): void {
  // These browser values are a cache for the existing React stores, not the source of truth.
  window.localStorage.setItem('abiedien.erp.app.v1', JSON.stringify(snapshot.operational));
  window.localStorage.setItem('abiedien.erp.accounting.v1', JSON.stringify(snapshot.accounting));
}

export async function persistWorkspaceSlice(
  slice: 'operational' | 'accounting',
  value: unknown
): Promise<void> {
  let resolveTask!: () => void;
  let rejectTask!: (error: Error) => void;
  const task = new Promise<void>((resolve, reject) => {
    resolveTask = resolve;
    rejectTask = reject;
  });

  queue = queue.then(async () => {
    if (!activeToken || !currentSnapshot || activeVersion === null) {
      throw new Error('Sesi cloud belum siap. Perubahan tidak boleh dianggap tersimpan.');
    }
    if (writeBlocked) {
      throw new Error('Penulisan diblokir karena konflik/error sebelumnya. Muat ulang data cloud terlebih dahulu.');
    }

    const candidate = {
      operational: currentSnapshot.operational,
      accounting: currentSnapshot.accounting,
      [slice]: value
    } as WorkspaceSnapshot;

    publish({ status: 'saving', message: 'Menyimpan perubahan ke Google Sheets…', version: activeVersion });
    const response = await callGoogleAppsScript<{
      success?: boolean;
      version?: number;
      conflict?: boolean;
      error?: string;
    }>('apiSaveWorkspace', activeToken, candidate, activeVersion);

    if (response?.success !== true || typeof response.version !== 'number') {
      if (response?.conflict) {
        writeBlocked = true;
        publish({
          status: 'conflict',
          message: response.error || 'Data cloud berubah dari perangkat lain. Muat ulang sebelum melanjutkan.',
          version: response.version ?? activeVersion
        });
        throw new Error('Cloud version conflict');
      }
      throw new Error(response?.error || 'Server menolak perubahan.');
    }

    currentSnapshot = candidate;
    activeVersion = response.version;
    publish({
      status: 'saved',
      message: 'Tersimpan di Google Sheets.',
      version: activeVersion
    });
  }).then(resolveTask).catch((error: unknown) => {
    if (status.status !== 'conflict') {
      writeBlocked = true;
      publish({
        status: 'error',
        message: error instanceof Error
          ? 'Gagal menyimpan ke cloud: ' + error.message + '. Jangan lanjutkan input sebelum memuat ulang.'
          : 'Gagal menyimpan ke cloud. Jangan lanjutkan input sebelum memuat ulang.',
        version: activeVersion
      });
    }
    rejectTask(error instanceof Error ? error : new Error(String(error)));
  });

  return task;
}
