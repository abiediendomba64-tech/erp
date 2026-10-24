export interface ApiUser {
  email: string;
  nama: string;
  role: 'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER';
  status: 'active' | 'inactive';
  phone?: string;
}

export interface WorkspaceSummary {
  workspace_id: string;
  name: string;
  role: ApiUser['role'];
  version: number;
}

export interface WorkspaceData {
  operational: Record<string, unknown>;
  accounting: Record<string, unknown>;
}

export interface CloudStatus {
  status: 'ready' | 'saving' | 'saved' | 'error' | 'conflict';
  message: string;
  version: number | null;
}

const SESSION_KEY = 'erp_google_session_token';
const ACTIVE_WORKSPACE_KEY = 'erp_google_workspace_id';

type ApiResponse<T = unknown> = {
  success?: boolean;
  error?: string;
  error_code?: string;
  [key: string]: unknown;
} & T;

let sessionToken: string | null = null;
let activeWorkspaceId: string | null = null;
let cloudData: WorkspaceData | null = null;
let cloudVersion: number | null = null;
let writesBlocked = false;
let writeQueue: Promise<void> = Promise.resolve();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSlices: Partial<Record<WorkspaceSlice, unknown>> = {};
let pendingWaiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
let status: CloudStatus = {
  status: 'ready',
  message: 'Cloud ERP belum terhubung.',
  version: null,
};
const statusListeners = new Set<(value: CloudStatus) => void>();

function publish(next: CloudStatus) {
  status = next;
  statusListeners.forEach(listener => listener(status));
}

export function subscribeCloudStatus(listener: (value: CloudStatus) => void) {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
}

export function getCloudStatus() {
  return status;
}

export function getSessionToken() {
  if (sessionToken) return sessionToken;
  if (typeof window !== 'undefined') sessionToken = window.sessionStorage.getItem(SESSION_KEY);
  return sessionToken;
}

export function setSessionToken(token: string | null) {
  sessionToken = token;
  if (typeof window !== 'undefined') {
    if (token) window.sessionStorage.setItem(SESSION_KEY, token);
    else window.sessionStorage.removeItem(SESSION_KEY);
  }
}

export function getActiveWorkspaceId() {
  return activeWorkspaceId || (typeof window !== 'undefined' ? window.sessionStorage.getItem(ACTIVE_WORKSPACE_KEY) : null);
}

export function setActiveWorkspaceId(id: string | null) {
  activeWorkspaceId = id;
  if (typeof window !== 'undefined') {
    if (id) window.sessionStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    else window.sessionStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  }
}

export async function googleErpApi<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
  requireSession = true,
): Promise<T> {
  const token = getSessionToken();
  if (requireSession && !token) throw new Error('Sesi login berakhir. Silakan masuk kembali.');

  let response: Response;
  try {
    response = await fetch('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ action, ...(token ? { sessionToken: token } : {}), ...payload }),
    });
  } catch {
    throw new Error('Tidak dapat menghubungi backend cloud. Periksa deployment Pages dan koneksi internet.');
  }

  let result: ApiResponse<T>;
  try {
    result = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error('Respons backend tidak valid. Periksa konfigurasi Pages Function dan Apps Script.');
  }
  if (!response.ok || result.success === false) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Permintaan backend gagal.');
  }
  return result as T;
}

export function configureGoogleWorkspace(
  workspaceId: string,
  data: WorkspaceData,
  version: number,
) {
  cancelPendingWrites('Workspace cloud diperbarui; perubahan yang masih menunggu belum dikirim.');
  activeWorkspaceId = workspaceId;
  cloudData = structuredClone(data);
  cloudVersion = version;
  writesBlocked = false;
  writeQueue = Promise.resolve();
  setActiveWorkspaceId(workspaceId);
  publish({ status: 'saved', message: 'Data ERP berhasil dimuat dari Google Sheets.', version });
}

export function clearGoogleWorkspace() {
  cancelPendingWrites('Sesi cloud berakhir sebelum perubahan tertunda dikirim.');
  activeWorkspaceId = null;
  cloudData = null;
  cloudVersion = null;
  writesBlocked = false;
  writeQueue = Promise.resolve();
  setActiveWorkspaceId(null);
  publish({ status: 'ready', message: 'Tidak ada workspace aktif.', version: null });
}

function cancelPendingWrites(message: string) {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = null;
  pendingSlices = {};
  const waiting = pendingWaiters;
  pendingWaiters = [];
  waiting.forEach(item => item.reject(new Error(message)));
}

export function persistGoogleWorkspaceSlice(
  slice: WorkspaceSlice,
  nextSlice: unknown,
): Promise<void> {
  if (!activeWorkspaceId || !cloudData || cloudVersion === null) {
    return Promise.reject(new Error('Workspace cloud belum siap; perubahan tidak dapat disimpan.'));
  }
  if (writesBlocked) {
    return Promise.reject(new Error('Penyimpanan diblokir setelah konflik/error. Muat ulang agar mengambil versi cloud terbaru.'));
  }

  pendingSlices[slice] = structuredClone(nextSlice);
  const task = new Promise<void>((resolve, reject) => {
    pendingWaiters.push({ resolve, reject });
  });
  // Coalesce operational + accounting reducers from one UI action into a single Sheets write.
  // This cuts Apps Script calls and reduces the risk of the two stores saving different versions.
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const slices = pendingSlices;
    const waiters = pendingWaiters;
    pendingSlices = {};
    pendingWaiters = [];

    const run = async () => {
      if (!activeWorkspaceId || !cloudData || cloudVersion === null) {
        throw new Error('Workspace cloud belum siap; perubahan tidak dapat disimpan.');
      }
      if (writesBlocked) {
        throw new Error('Penyimpanan diblokir setelah konflik/error. Muat ulang agar mengambil versi cloud terbaru.');
      }

      const candidate: WorkspaceData = { ...cloudData, ...slices };
      publish({ status: 'saving', message: 'Menyimpan perubahan ke Google Sheets…', version: cloudVersion });
      const response = await googleErpApi<{
        result?: { saved?: boolean; version?: number; error_code?: string | null };
        saved?: boolean;
        version?: number;
        error_code?: string | null;
      }>('state.save', {
        workspaceId: activeWorkspaceId,
        expectedVersion: cloudVersion,
        data: candidate,
      });

      const result = (response as { result?: { saved?: boolean; version?: number; error_code?: string | null } }).result ||
        response as { saved?: boolean; version?: number; error_code?: string | null };
      if (result.saved !== true || typeof result.version !== 'number') {
        if (result.error_code === 'conflict') {
          writesBlocked = true;
          publish({
            status: 'conflict',
            message: 'Ada perubahan dari perangkat lain. Perubahan lokal belum disinkronkan; muat ulang untuk mengambil versi cloud terbaru.',
            version: result.version ?? cloudVersion,
          });
          throw new Error('Cloud version conflict.');
        }
        throw new Error(`Backend menolak penyimpanan: ${result.error_code || 'unknown_error'}`);
      }

      cloudData = candidate;
      cloudVersion = result.version;
      publish({ status: 'saved', message: 'Semua perubahan tersimpan di Google Sheets.', version: cloudVersion });
    };

    const queued = writeQueue.then(run);
    writeQueue = queued.then(
      () => { waiters.forEach(item => item.resolve()); },
      (error: unknown) => {
        const failure = error instanceof Error ? error : new Error(String(error));
        if (status.status !== 'conflict') {
          writesBlocked = true;
          publish({
            status: 'error',
            message: `Gagal menyimpan ke cloud: ${failure.message}. Muat ulang sebelum melanjutkan.`,
            version: cloudVersion,
          });
        }
        waiters.forEach(item => item.reject(failure));
      },
    );
  }, 200);

  return task;
}
