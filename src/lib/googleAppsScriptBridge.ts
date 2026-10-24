const CHANNEL = 'erp-google-apps-script-bridge-v1';

type BridgeResponse<T> = {
  channel: string;
  type: 'response';
  id: string;
  ok: boolean;
  result?: T;
  error?: string;
};

type PendingCall = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: number;
};

const webAppUrl = String(import.meta.env.VITE_GAS_WEBAPP_URL || '').trim();
let bridgeFrame: HTMLIFrameElement | null = null;
let bridgeReady: Promise<HTMLIFrameElement> | null = null;
const pendingCalls = new Map<string, PendingCall>();

export const isGoogleAppsScriptConfigured = (): boolean => {
  if (!webAppUrl) return false;
  try {
    const url = new URL(webAppUrl);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' &&
      url.pathname.includes('/macros/s/') && url.pathname.endsWith('/exec');
  } catch {
    return false;
  }
};

function onBridgeMessage(event: MessageEvent): void {
  if (!bridgeFrame || event.source !== bridgeFrame.contentWindow) return;
  const data = event.data as BridgeResponse<unknown> | null;
  if (!data || data.channel !== CHANNEL || data.type !== 'response' || typeof data.id !== 'string') return;
  const pending = pendingCalls.get(data.id);
  if (!pending) return;
  window.clearTimeout(pending.timeout);
  pendingCalls.delete(data.id);
  if (data.ok) pending.resolve(data.result);
  else pending.reject(new Error(data.error || 'Permintaan backend gagal.'));
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', onBridgeMessage);
}

function ensureBridge(): Promise<HTMLIFrameElement> {
  if (!isGoogleAppsScriptConfigured()) {
    return Promise.reject(new Error('VITE_GAS_WEBAPP_URL belum diisi dengan URL deployment Google Apps Script yang valid.'));
  }
  if (bridgeFrame?.isConnected && bridgeReady) return bridgeReady;

  bridgeReady = new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    const url = new URL(webAppUrl);
    url.searchParams.set('mode', 'bridge');
    url.searchParams.set('parentOrigin', window.location.origin);
    iframe.title = 'ERP secure cloud connection';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.position = 'fixed';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';

    const timeout = window.setTimeout(() => {
      reject(new Error('Koneksi Google Apps Script timeout. Periksa URL deployment dan ALLOWED_APP_ORIGINS pada Script Properties.'));
    }, 25000);
    iframe.onload = () => {
      window.clearTimeout(timeout);
      resolve(iframe);
    };
    iframe.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Bridge Google Apps Script tidak dapat dibuka.'));
    };
    bridgeFrame = iframe;
    document.body.appendChild(iframe);
  });

  return bridgeReady;
}

export async function callGoogleAppsScript<T>(
  method: string,
  ...args: unknown[]
): Promise<T> {
  const iframe = await ensureBridge();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'req-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingCalls.delete(id);
      reject(new Error('Backend tidak menjawab tepat waktu. Periksa status deployment Apps Script.'));
    }, 60000);
    pendingCalls.set(id, {
      resolve: value => resolve(value as T),
      reject,
      timeout
    });
    iframe.contentWindow?.postMessage({
      channel: CHANNEL,
      type: 'request',
      id,
      method,
      args
    }, '*');
  });
}
