import { saveCloudWorkspace, type WorkspaceRole } from './googleWorkspaceApi';
import { setCloudCacheMeta, validateWorkspaceSnapshot, type WorkspaceSnapshot } from './initialWorkspace';

export type CloudSyncStatus = 'inactive' | 'saved' | 'saving' | 'error' | 'conflict' | 'warning';
export interface CloudSyncState {
  status: CloudSyncStatus;
  message: string;
  version: number | null;
  updatedAt?: string;
}
interface CloudSession {
  idToken: string;
  workspaceId: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole;
  version: number;
}
type Slice = 'operational' | 'accounting';

let session: CloudSession | null = null;
let currentSnapshot: WorkspaceSnapshot | null = null;
let blocked = false;
let queue: Promise<void> = Promise.resolve();
let state: CloudSyncState = {
  status: 'inactive', message: 'Data cloud belum diaktifkan.', version: null,
};
const subscribers = new Set<(value: CloudSyncState) => void>();

function notify(next: CloudSyncState) {
  state = next;
  subscribers.forEach((subscriber) => subscriber(state));
}

export function subscribeCloudSync(subscriber: (value: CloudSyncState) => void) {
  subscribers.add(subscriber);
  subscriber(state);
  return () => { subscribers.delete(subscriber); };
}
export function getCloudSyncState() {
  return state;
}
export function getCloudWorkspaceSession() {
  return session;
}

export function configureCloudWorkspaceSession(
  nextSession: CloudSession,
  snapshot: WorkspaceSnapshot,
) {
  session = nextSession;
  currentSnapshot = validateWorkspaceSnapshot(snapshot);
  try { setCloudCacheMeta(nextSession.workspaceId, nextSession.version, currentSnapshot); } catch (error) {
    console.warn('Metadata cache cloud tidak dapat disimpan; proteksi backup akan meminta pemeriksaan data lokal.', error);
  }
  blocked = false;
  queue = Promise.resolve();
  notify({
    status: 'saved',
    message: 'Workspace cloud dimuat. Perubahan berikutnya disimpan ke Google Sheets.',
    version: session.version,
  });
}

export function clearCloudWorkspaceSession() {
  session = null;
  currentSnapshot = null;
  blocked = false;
  queue = Promise.resolve();
  notify({ status: 'inactive', message: 'Data cloud belum diaktifkan.', version: null });
}

export async function persistCloudSlice(slice: Slice, nextValue: unknown) {
  let resolveTask!: () => void;
  let rejectTask!: (error: Error) => void;
  const task = new Promise<void>((resolve, reject) => {
    resolveTask = resolve;
    rejectTask = reject;
  });

  queue = queue.catch(() => undefined).then(async () => {
    if (!session || !currentSnapshot) {
      throw new Error('Workspace cloud belum aktif; perubahan belum tersimpan ke server.');
    }
    if (blocked) {
      throw new Error('Penyimpanan cloud diblokir setelah konflik/error. Muat ulang dan pilih versi cloud terbaru.');
    }
    if (session.workspaceRole === 'VIEWER') {
      throw new Error('Akun VIEWER tidak diizinkan menyimpan perubahan.');
    }

    const copiedSlice = JSON.parse(JSON.stringify(nextValue)) as Record<string, unknown>;
    const candidate = validateWorkspaceSnapshot({
      ...currentSnapshot,
      [slice]: copiedSlice,
    });
    notify({
      status: 'saving',
      message: 'Menyimpan perubahan ke Google Sheets…',
      version: session.version,
    });
    const response = await saveCloudWorkspace(
      session.idToken,
      session.workspaceId,
      session.version,
      candidate,
    );

    if (!response.success) {
      if (response.code === 'VERSION_CONFLICT') {
        blocked = true;
        notify({
          status: 'conflict',
          message: 'Data cloud sudah berubah dari perangkat lain. Perubahan lokal belum dikirim. Muat ulang untuk mengambil data terbaru.',
          version: response.currentVersion ?? session.version,
        });
        throw new Error('Cloud version conflict');
      }
      throw new Error(response.message || 'Backend menolak penyimpanan.');
    }
    if (typeof response.version !== 'number') {
      throw new Error('Backend tidak memberikan versi baru. Status penyimpanan belum dapat dipastikan.');
    }

    currentSnapshot = candidate;
    session = { ...session, version: response.version };
    try { setCloudCacheMeta(session.workspaceId, response.version, candidate); } catch (error) {
      console.warn('Snapshot cloud tersimpan tetapi metadata cache lokal tidak dapat diperbarui.', error);
    }
    if (response.auditWarning) {
      notify({
        status: 'warning',
        message: 'Data tersimpan di cloud, tetapi ada peringatan audit: ' + response.auditWarning,
        version: response.version,
        updatedAt: response.updated_at,
      });
    } else {
      notify({
        status: 'saved',
        message: 'Perubahan tersimpan di Google Sheets.',
        version: response.version,
        updatedAt: response.updated_at,
      });
    }
  }).then(resolveTask).catch((error: unknown) => {
    if (state.status !== 'conflict') {
      blocked = true;
      notify({
        status: 'error',
        message: error instanceof Error
          ? 'Gagal menyimpan ke cloud: ' + error.message + ' Muat ulang sebelum melanjutkan.'
          : 'Gagal menyimpan ke cloud. Muat ulang sebelum melanjutkan.',
        version: session?.version ?? null,
      });
    }
    rejectTask(error instanceof Error ? error : new Error(String(error)));
  });

  return task;
}
