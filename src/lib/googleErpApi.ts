/**
 * Authenticated Google Apps Script ERP API.
 *
 * The session token is an opaque application session returned by auth.login.
 * Only the token is stored in browser storage; authorization is always checked
 * again by Apps Script on every protected request.
 *
 * Configure VITE_ERP_API_URL with the deployed Apps Script Web App URL.
 * Using text/plain avoids a JSON OPTIONS preflight, but cross-origin browser
 * access must still be tested on the real hosting domain.
 */

const API_URL = String((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_ERP_API_URL || '')
  .trim()
  .replace(/\/$/, '');

const SESSION_STORAGE_KEY = 'erp.google.sessionToken';
const WORKSPACE_STORAGE_KEY = 'erp.google.activeWorkspaceId';

type ApiEnvelope<T> = T & { success?: boolean; error?: string; message?: string };
type ApiParams = Record<string, unknown>;

function getEndpoint(): string {
  if (!API_URL || API_URL.includes('YOUR_DEPLOYMENT_ID')) {
    throw new Error('URL Google Apps Script belum dikonfigurasi. Atur VITE_ERP_API_URL pada environment build.');
  }
  const separator = API_URL.includes('?') ? '&' : '?';
  return API_URL + separator + 'path=%2Fcloud-api';
}

function getSessionToken(): string {
  try {
    const token = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (token) return token;
  } catch {
    // Storage can be unavailable in restrictive browser contexts.
  }
  throw new Error('Sesi cloud belum tersedia. Login melalui Google Sign-In terlebih dahulu.');
}

function saveSessionToken(token: string): void {
  if (!token || token.length > 200) throw new Error('Token sesi dari server tidak valid.');
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    throw new Error('Browser tidak mengizinkan penyimpanan sesi. Periksa pengaturan privasi browser.');
  }
}

export function clearGoogleErpSession(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // No action needed if browser storage is unavailable.
  }
}

export function getActiveWorkspaceId(): string | null {
  try {
    const id = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

export function setActiveWorkspaceId(workspaceId: string | null): void {
  try {
    if (workspaceId && workspaceId.trim()) {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId.trim());
    } else {
      window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  } catch {
    throw new Error('Browser tidak dapat menyimpan pilihan workspace pada perangkat ini.');
  }
}

async function send<T>(action: string, params: ApiParams = {}): Promise<T> {
  if (!action.trim()) throw new Error('Nama aksi API wajib diisi.');
  const isPublicAction = action === 'auth.health' || action === 'auth.login';
  const sessionToken = isPublicAction ? undefined : getSessionToken();
  let response: Response;

  try {
    response = await fetch(getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...params,
        action,
        ...(sessionToken ? { sessionToken } : {}),
      }),
    });
  } catch {
    throw new Error('Tidak dapat menghubungi Google Apps Script. Periksa koneksi, URL deployment, izin Web App, dan CORS pada hosting frontend.');
  }

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok) throw new Error('Google Apps Script mengembalikan HTTP ' + response.status + '.');
  if (!payload || typeof payload !== 'object') {
    throw new Error('Respons Google Apps Script kosong atau bukan JSON yang valid.');
  }
  if (payload.success === false) {
    const message = String(payload.error || payload.message || 'Permintaan cloud ditolak.');
    if (/sesi|session|login kembali/i.test(message)) clearGoogleErpSession();
    throw new Error(message);
  }

  if (action === 'auth.login') {
    const result = payload as ApiEnvelope<{ sessionToken: string }>;
    if (!result.sessionToken) throw new Error('Backend login tidak mengembalikan token sesi.');
    saveSessionToken(result.sessionToken);
  } else if (action === 'auth.logout') {
    clearGoogleErpSession();
  }

  return payload as T;
}

/**
 * Run one authenticated action exposed by CloudApi.gs.
 * Examples: users.list, users.upsert, workspace.member.add.
 */
export async function googleErpApi<T = Record<string, unknown>>(
  action: string,
  params: ApiParams = {},
): Promise<T> {
  return send<T>(action, params);
}

/** Exchange a Google Identity Services ID token for a server-side session. */
export async function loginGoogleErp(idToken: string): Promise<{
  success: boolean;
  sessionToken: string;
  user: { email: string; nama: string; phone: string; role: string; status: string };
  expiresAt: string;
}> {
  if (!idToken.trim()) throw new Error('Google Sign-In ID token wajib diisi.');
  return send<{
    success: boolean;
    sessionToken: string;
    user: { email: string; nama: string; phone: string; role: string; status: string };
    expiresAt: string;
  }>('auth.login', { idToken });
}

export async function logoutGoogleErp(): Promise<void> {
  try {
    await send('auth.logout');
  } finally {
    clearGoogleErpSession();
  }
}
