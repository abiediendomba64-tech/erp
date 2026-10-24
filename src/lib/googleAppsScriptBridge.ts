export type GoogleAppsScriptMethod =
  | 'apiGetPublicConfig'
  | 'apiLogin'
  | 'apiListWorkspaces'
  | 'apiCreateWorkspace'
  | 'apiAddUser'
  | 'apiAddWorkspaceMember'
  | 'apiLoadWorkspace'
  | 'apiSaveWorkspace'
  | 'apiGetWorkspaceAudit';

interface BridgeRequest {
  type: 'ERP_GAS_REQUEST';
  id: string;
  method: GoogleAppsScriptMethod;
  args: unknown[];
}
interface BridgeResponse {
  type: 'ERP_GAS_RESPONSE';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: number;
}

const pending = new Map<string, PendingRequest>();
let sequence = 0;
let listenerInstalled = false;

function getTrustedParentOrigin(): string {
  if (typeof window === 'undefined' || window.parent === window) {
    throw new Error('ERP cloud API hanya tersedia dari web app resmi Apps Script.');
  }
  let origin = '';
  try {
    origin = new URL(document.referrer).origin;
  } catch {
    throw new Error('Asal halaman Apps Script tidak dapat diverifikasi.');
  }
  const host = new URL(origin).hostname.toLowerCase();
  const isAppsScript = host === 'script.google.com' ||
    host === 'script.googleusercontent.com' ||
    host.endsWith('.script.googleusercontent.com');
  if (!isAppsScript) throw new Error('ERP harus dibuka dari URL resmi Apps Script, bukan dari tab frontend langsung.');
  return origin;
}

function installListener() {
  if (listenerInstalled || typeof window === 'undefined') return;
  listenerInstalled = true;
  window.addEventListener('message', (event: MessageEvent<BridgeResponse>) => {
    if (event.source !== window.parent) return;
    let parentOrigin: string;
    try { parentOrigin = getTrustedParentOrigin(); } catch { return; }
    if (event.origin !== parentOrigin) return;
    const response = event.data;
    if (!response || response.type !== 'ERP_GAS_RESPONSE' || typeof response.id !== 'string') return;
    const request = pending.get(response.id);
    if (!request) return;
    window.clearTimeout(request.timer);
    pending.delete(response.id);
    if (!response.ok) request.reject(new Error(response.error || 'Permintaan backend gagal.'));
    else request.resolve(response.result);
  });
}

export function isGoogleAppsScriptEmbedded(): boolean {
  if (typeof window === 'undefined' || window.parent === window) return false;
  try {
    getTrustedParentOrigin();
    return true;
  } catch {
    return false;
  }
}

export function callGoogleAppsScript<T>(
  method: GoogleAppsScriptMethod,
  ...args: unknown[]
): Promise<T> {
  installListener();
  const targetOrigin = getTrustedParentOrigin();
  const id = 'erp-' + Date.now().toString(36) + '-' + (++sequence).toString(36);

  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error('Backend tidak merespons dalam 30 detik. Periksa deployment Apps Script atau koneksi internet.'));
    }, 30000);
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });

    const request: BridgeRequest = {
      type: 'ERP_GAS_REQUEST',
      id,
      method,
      args,
    };
    window.parent.postMessage(request, targetOrigin);
  });
}
