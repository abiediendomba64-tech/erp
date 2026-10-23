import { requireSupabase } from './supabase';

export type WorkspaceSlice = 'operational' | 'accounting';
export type CloudSaveStatus = 'ready' | 'saving' | 'saved' | 'error' | 'conflict';
export interface CloudStatus {
  status: CloudSaveStatus;
  message: string;
  version: number | null;
}

let activeWorkspaceId: string | null = null;
let currentVersion: number | null = null;
let currentData: Record<string, unknown> | null = null;
let writesBlocked = false;
let writeQueue: Promise<void> = Promise.resolve();
let cloudStatus: CloudStatus = { status: 'ready', message: 'Memuat sumber data cloud…', version: null };
const listeners = new Set<(status: CloudStatus) => void>();

function publish(status: CloudStatus, message: string, version = currentVersion) {
  cloudStatus = { status, message, version };
  for (const listener of listeners) listener(cloudStatus);
}

export function subscribeCloudStatus(listener: (status: CloudStatus) => void) {
  listeners.add(listener);
  listener(cloudStatus);
  return () => listeners.delete(listener);
}

export function getCloudStatus() {
  return cloudStatus;
}

export function configureWorkspaceSession(
  workspaceId: string,
  data: Record<string, unknown>,
  version: number,
) {
  activeWorkspaceId = workspaceId;
  currentData = structuredClone(data);
  currentVersion = version;
  writesBlocked = false;
  writeQueue = Promise.resolve();
  publish('saved', 'Data ERP dimuat dari cloud.', version);
}

export function clearWorkspaceSession() {
  activeWorkspaceId = null;
  currentVersion = null;
  currentData = null;
  writesBlocked = false;
  writeQueue = Promise.resolve();
  publish('ready', 'Tidak ada workspace aktif.', null);
}

export async function persistWorkspaceSlice(slice: WorkspaceSlice, nextValue: unknown) {
  let resolveTask!: () => void;
  let rejectTask!: (error: Error) => void;
  const task = new Promise<void>((resolve, reject) => {
    resolveTask = resolve;
    rejectTask = reject;
  });

  writeQueue = writeQueue.then(async () => {
    if (!activeWorkspaceId || !currentData || currentVersion === null) {
      throw new Error('Workspace cloud belum siap; perubahan tidak dapat disimpan.');
    }
    if (writesBlocked) {
      throw new Error('Penulisan cloud diblokir setelah konflik/error. Muat ulang untuk mengambil versi terbaru.');
    }

    const candidate = { ...currentData, [slice]: nextValue };
    publish('saving', 'Menyimpan perubahan ke cloud…', currentVersion);
    const client = requireSupabase();
    const { data, error } = await client.rpc('erp_save_workspace_state', {
      p_workspace_id: activeWorkspaceId,
      p_data: candidate,
      p_expected_version: currentVersion,
    });

    if (error) throw new Error(error.message);
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || typeof result !== 'object') throw new Error('Backend tidak mengembalikan status penyimpanan yang valid.');

    const response = result as { saved?: boolean; current_version?: number; error_code?: string | null };
    if (response.saved !== true || typeof response.current_version !== 'number') {
      if (response.error_code === 'conflict') {
        writesBlocked = true;
        publish('conflict', 'Ada perubahan dari perangkat lain. Perubahan lokal belum disinkronkan; muat ulang untuk memuat versi cloud terbaru.', response.current_version ?? currentVersion);
        throw new Error('Cloud version conflict');
      }
      throw new Error(`Backend menolak penyimpanan: ${response.error_code || 'unknown_error'}`);
    }

    currentData = candidate;
    currentVersion = response.current_version;
    publish('saved', 'Semua perubahan tersimpan di cloud.', currentVersion);
  }).then(resolveTask).catch((error: unknown) => {
    if (cloudStatus.status !== 'conflict') {
      writesBlocked = true;
      publish('error', error instanceof Error ? `Gagal menyimpan ke cloud: ${error.message}. Muat ulang sebelum melanjutkan.` : 'Gagal menyimpan ke cloud. Muat ulang sebelum melanjutkan.');
    }
    rejectTask(error instanceof Error ? error : new Error(String(error)));
  });

  return task;
}
