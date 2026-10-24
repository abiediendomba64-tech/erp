import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Cloud, Database, LoaderCircle, LogIn, ShieldCheck } from 'lucide-react';
import {
  ApiUser, WorkspaceData, WorkspaceSummary, configureGoogleWorkspace,
  clearGoogleWorkspace, getActiveWorkspaceId, getCloudStatus, googleErpApi,
  setSessionToken
} from '../lib/googleErpApi';
import { createEmptyWorkspaceData, readCurrentBrowserData, validateWorkspaceData } from '../lib/emptyWorkspace';

interface GoogleCredentialResponse {
  credential: string;
}
interface GoogleAccountsApi {
  id: {
    initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
    renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    cancel(): void;
    disableAutoSelect(): void;
  };
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsApi['id'] } };
  }
}

interface ActiveCloudSession {
  user: ApiUser;
  workspace: WorkspaceSummary;
  onSignOut: () => void;
}
interface Props {
  children: (session: ActiveCloudSession) => ReactNode;
}

const GOOGLE_CLIENT_ID = (import.meta.env as ImportMetaEnv & { VITE_GOOGLE_CLIENT_ID?: string }).VITE_GOOGLE_CLIENT_ID?.trim() || '';

type View = 'checking' | 'login' | 'workspace' | 'loading' | 'ready';

function niceError(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.';
}

function applySnapshot(data: WorkspaceData) {
  const valid = validateWorkspaceData(data);
  window.localStorage.setItem('abiedien.erp.app.v1', JSON.stringify(valid.operational));
  window.localStorage.setItem('abiedien.erp.accounting.v1', JSON.stringify(valid.accounting));
  return valid;
}

export default function GoogleAuthGate({ children }: Props) {
  const [view, setView] = useState<View>('checking');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [workspaceName, setWorkspaceName] = useState('ERP Properti & Konstruksi');
  const [importLocal, setImportLocal] = useState(false);
  const [localDataAvailable, setLocalDataAvailable] = useState(false);
  const [signInReady, setSignInReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const finishLogin = useCallback(async (token: string, authenticatedUser: ApiUser) => {
    setSessionToken(token);
    setUser(authenticatedUser);
    const listResponse = await googleErpApi<{ workspaces: WorkspaceSummary[] }>('workspace.list');
    const list = Array.isArray(listResponse.workspaces) ? listResponse.workspaces : [];
    setWorkspaces(list);

    const preferredId = getActiveWorkspaceId();
    const preferred = preferredId ? list.find(item => item.workspace_id === preferredId) : undefined;
    if (preferred) {
      await activateWorkspace(preferred.workspace_id);
      return;
    }
    if (list.length === 1) {
      await activateWorkspace(list[0].workspace_id);
      return;
    }
    setView('workspace');
  }, []);

  const activateWorkspace = useCallback(async (workspaceId: string) => {
    setError('');
    setView('loading');
    const result = await googleErpApi<{
      workspace: { workspace_id: string; name: string; role: ApiUser['role'] };
      data: WorkspaceData;
      version: number;
    }>('workspace.load', { workspaceId });
    const snapshot = applySnapshot(result.data);
    configureGoogleWorkspace(result.workspace.workspace_id, snapshot, result.version);
    setActiveWorkspace({
      workspace_id: result.workspace.workspace_id,
      name: result.workspace.name,
      role: result.workspace.role,
      version: result.version,
    });
    setView('ready');
  }, []);

  useEffect(() => {
    setLocalDataAvailable(Boolean(
      window.localStorage.getItem('abiedien.erp.app.v1') ||
      window.localStorage.getItem('abiedien.erp.accounting.v1')
    ));

    const existingToken = window.sessionStorage.getItem('erp_google_session_token');
    if (!existingToken) {
      setView('login');
      return;
    }

    (async () => {
      try {
        const result = await googleErpApi<{ user: ApiUser }>('auth.me');
        await finishLogin(existingToken, result.user);
      } catch {
        setSessionToken(null);
        clearGoogleWorkspace();
        setView('login');
      }
    })().catch(failure => {
      setError(niceError(failure));
      setView('login');
    });
  }, [finishLogin]);

  const handleCredential = useCallback((response: GoogleCredentialResponse) => {
    if (!response.credential || busy) return;
    setBusy(true);
    setError('');
    setSessionToken(null);
    googleErpApi<{ sessionToken: string; user: ApiUser }>(
      'auth.login',
      { idToken: response.credential },
      false
    ).then(async result => {
      await finishLogin(result.sessionToken, result.user);
    }).catch(failure => {
      setError(niceError(failure));
      setView('login');
    }).finally(() => setBusy(false));
  }, [busy, finishLogin]);

  useEffect(() => {
    if (view !== 'login' || !GOOGLE_CLIENT_ID) return;
    let timer = 0;
    let rendered = false;
    const initialize = () => {
      const googleId = window.google?.accounts?.id;
      const target = document.getElementById('google-signin-button');
      if (!googleId || !target || rendered) return;
      rendered = true;
      googleId.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
      googleId.renderButton(target, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 320,
        locale: 'id',
      });
      setSignInReady(true);
      window.clearInterval(timer);
    };
    initialize();
    timer = window.setInterval(initialize, 250);
    return () => window.clearInterval(timer);
  }, [view, handleCredential]);

  const createWorkspace = async () => {
    if (!workspaceName.trim()) {
      setError('Nama workspace wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const initialData = importLocal ? readCurrentBrowserData() : null;
      const snapshot = validateWorkspaceData(initialData || createEmptyWorkspaceData());
      const result = await googleErpApi<{ workspace_id: string }>('workspace.create', {
        name: workspaceName.trim(),
        data: snapshot,
      });
      await activateWorkspace(result.workspace_id);
    } catch (failure) {
      setError(niceError(failure));
      setView('workspace');
    } finally {
      setBusy(false);
    }
  };

  const signOut = useCallback(async () => {
    const cloud = getCloudStatus();
    if ((cloud.status === 'error' || cloud.status === 'conflict' || cloud.status === 'saving') &&
        !window.confirm('Ada perubahan yang mungkin belum tersimpan ke cloud. Keluar tetap akan membuang cache lokal yang belum sinkron. Lanjutkan?')) return;
    try {
      await googleErpApi('auth.logout');
    } catch {
      // Local session is still removed even if logout cannot reach the server; the server session expires.
    }
    setSessionToken(null);
    clearGoogleWorkspace();
    window.localStorage.removeItem('abiedien.erp.app.v1');
    window.localStorage.removeItem('abiedien.erp.accounting.v1');
    setUser(null);
    setActiveWorkspace(null);
    setWorkspaces([]);
    setView('login');
  }, []);

  if (view === 'ready' && user && activeWorkspace) {
    const workspaceUser = { ...user, role: activeWorkspace.role };
    return <>{children({ user: workspaceUser, workspace: activeWorkspace, onSignOut: signOut })}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-indigo-500 flex items-center justify-center"><Database size={26} /></div>
            <div>
              <div className="text-xl font-bold">ERP Properti & Konstruksi</div>
              <div className="text-sm text-slate-300">Login Google • Data cloud Google Sheets</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">Register tanah dan beko, buku kas, bukti, kewajiban, anggaran, unit, QC, aset, pajak, RAB, jurnal, dan laporan tetap satu sistem. Cloud menjadi sumber data; browser hanya menyimpan cache.</p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {(view === 'checking' || view === 'loading' || busy) && (
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 text-blue-900 border border-blue-100 p-4">
              <LoaderCircle className="animate-spin shrink-0" size={20} />
              <span>{view === 'checking' ? 'Memeriksa sesi login…' : view === 'loading' ? 'Memuat data workspace dari Google Sheets…' : 'Memproses permintaan…'}</span>
            </div>
          )}

          {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" /><span>{error}</span></div>}

          {view === 'login' && (
            <>
              {!GOOGLE_CLIENT_ID ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Login belum dikonfigurasi.</strong>
                  <p className="mt-1">Set environment build <code>VITE_GOOGLE_CLIENT_ID</code> pada Cloudflare Pages. Set Client ID yang sama sebagai Script Property <code>GOOGLE_CLIENT_ID</code> di Apps Script.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-600"><ShieldCheck size={18} />Akses hanya untuk email yang telah diizinkan oleh Admin.</div>
                  <div id="google-signin-button" className="min-h-11" />
                  {!signInReady && <p className="mt-2 text-xs text-slate-500">Memuat tombol login Google…</p>}
                </div>
              )}
              <div className="border-t border-slate-100 pt-4 text-xs text-slate-500">
                Login menggunakan identitas Google. Password Google tidak pernah diminta atau disimpan oleh ERP.
              </div>
            </>
          )}

          {view === 'workspace' && user && (
            <div className="space-y-4">
              <div className="text-sm text-slate-600">Login sebagai <strong className="text-slate-900">{user.nama || user.email}</strong> ({user.email}). Pilih workspace untuk membuka data proyek.</div>
              {workspaces.length > 0 ? (
                <div className="space-y-2">
                  {workspaces.map(item => (
                    <button key={item.workspace_id} disabled={busy} onClick={() => activateWorkspace(item.workspace_id).catch(failure => setError(niceError(failure)))} className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60">
                      <div><div className="font-semibold">{item.name}</div><div className="text-xs text-slate-500 mt-1">Role: {item.role} • Versi cloud {item.version}</div></div>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              ) : user.role === 'ADMIN' ? (
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <label className="block text-sm font-medium">Nama workspace / perusahaan
                    <input value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                  {localDataAvailable && (
                    <label className="flex gap-2 items-start rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                      <input type="checkbox" checked={importLocal} onChange={event => setImportLocal(event.target.checked)} className="mt-1" />
                      <span><strong>Impor data dari browser ini.</strong><br />Pilih hanya bila Anda sudah memeriksa isi data lokal. Jika tidak dicentang, workspace dimulai dengan master akun standar dan tabel operasional kosong.</span>
                    </label>
                  )}
                  <button disabled={busy} onClick={createWorkspace} className="w-full flex justify-center items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                    <Cloud size={18} /> Buat workspace cloud
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Akun Anda belum menjadi anggota workspace. Minta Admin ERP menambahkan email ini pada Manajemen User dan akses workspace.</div>
              )}
              <button className="text-sm text-slate-500 underline" onClick={signOut}>Keluar dari akun</button>
            </div>
          )}

          {view === 'ready' && <div className="text-sm text-slate-600">Workspace siap.</div>}
        </div>
      </div>
    </div>
  );
}
