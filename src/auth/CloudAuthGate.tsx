import { useCallback, useEffect, useRef, useState, createContext, useContext, ReactNode } from 'react';
import { Loader2, ShieldCheck, Cloud, LogOut, AlertCircle, Database } from 'lucide-react';
import { clearCloudWorkspace, configureCloudWorkspace, gasRpc, setCloudIdToken, CloudUser, CloudWorkspace, WorkspaceLoad } from '../lib/gasBridge';
import { createEmptyWorkspaceSnapshot, readLocalWorkspaceSnapshot, validateWorkspaceSnapshot, WorkspaceSnapshot } from '../lib/initialWorkspace';

interface AuthContextValue {
  user: CloudUser;
  workspace: CloudWorkspace;
  idToken: string;
  logout: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function useCloudAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useCloudAuth harus digunakan di dalam CloudAuthGate.');
  return value;
}

type Screen = 'checking' | 'login' | 'creating' | 'choose' | 'blocked' | 'ready';
const CLIENT_ID = String((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '').trim();
const WEB_APP_URL = String((import.meta as any).env?.VITE_ERP_WEB_APP_URL || '').trim();

interface Props { children: ReactNode }

export default function CloudAuthGate({ children }: Props) {
  const [screen, setScreen] = useState<Screen>('checking');
  const [user, setUser] = useState<CloudUser | null>(null);
  const [workspace, setWorkspace] = useState<CloudWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<CloudWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [workspaceName, setWorkspaceName] = useState('ERP Properti & Konstruksi');
  const [importLocal, setImportLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gisError, setGisError] = useState('');
  const buttonHost = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef('');

  const loadWorkspace = useCallback(async (token: string, workspaceId: string, role: CloudUser['role']) => {
    setBusy(true);
    setError('');
    try {
      const result = await gasRpc<WorkspaceLoad>('workspace.load', { workspaceId }, token);
      const snapshot = validateWorkspaceSnapshot({ operational: result.operational, accounting: result.accounting });
      // Replace the browser cache from the canonical cloud state before mounting data stores.
      window.localStorage.setItem('abiedien.erp.app.v1', JSON.stringify(snapshot.operational));
      window.localStorage.setItem('abiedien.erp.accounting.v1', JSON.stringify(snapshot.accounting));
      setCloudIdToken(token);
      configureCloudWorkspace(token, result.workspace.id, result.versions, role);
      setWorkspace(result.workspace);
      setScreen('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Data workspace gagal dimuat dari cloud.');
      setScreen('blocked');
    } finally {
      setBusy(false);
    }
  }, []);

  const authenticate = useCallback(async (token: string) => {
    setBusy(true);
    setError('');
    tokenRef.current = token;
    try {
      const result = await gasRpc<{ user: CloudUser; workspaces: CloudWorkspace[] }>('auth.me', {}, token);
      setCloudIdToken(token);
      setUser(result.user);
      setWorkspaces(result.workspaces || []);
      if (result.user.workspaceId) {
        await loadWorkspace(token, result.user.workspaceId, result.user.role);
        return;
      }
      if (result.user.role === 'ADMIN' && result.workspaces.length === 1) {
        await loadWorkspace(token, result.workspaces[0].id, result.user.role);
        return;
      }
      if (result.user.role === 'ADMIN' && result.workspaces.length > 1) {
        setSelectedWorkspaceId(result.workspaces[0].id);
        setScreen('choose');
        return;
      }
      if (result.user.role === 'ADMIN') {
        setScreen('creating');
        return;
      }
      setError('Akun terdaftar tetapi belum ditautkan ke workspace. Minta admin menetapkan workspace Anda di menu Manajemen User.');
      setScreen('blocked');
    } catch (cause) {
      setCloudIdToken('');
      setError(cause instanceof Error ? cause.message : 'Login Google gagal.');
      setScreen('login');
    } finally {
      setBusy(false);
    }
  }, [loadWorkspace]);

  useEffect(() => {
    const existingToken = (() => {
      try { return window.sessionStorage.getItem('erp.google.idToken.session') || ''; }
      catch { return ''; }
    })();
    if (existingToken) {
      void authenticate(existingToken);
      return;
    }
    setScreen('login');
  }, [authenticate]);

  useEffect(() => {
    if (screen !== 'login' || !buttonHost.current) return;
    if (window.parent === window) {
      setGisError(WEB_APP_URL
        ? 'Panel perlu dibuka melalui Web App Google Apps Script.'
        : 'Panel perlu dibuka melalui URL Web App Google Apps Script (/exec). Isi VITE_ERP_WEB_APP_URL untuk menampilkan tautan langsung di sini.');
      return;
    }
    if (!CLIENT_ID) {
      setGisError('Login belum dikonfigurasi: isi VITE_GOOGLE_CLIENT_ID pada environment build dan GOOGLE_CLIENT_ID di Apps Script dengan OAuth client ID yang sama.');
      return;
    }
    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !buttonHost.current) return;
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        setGisError('Google Identity belum tersedia. Periksa koneksi internet dan pemblokir skrip.');
        return;
      }
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response: { credential?: string }) => {
          if (response?.credential) void authenticate(response.credential);
          else setError('Google tidak mengembalikan token login.');
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
      });
      buttonHost.current.innerHTML = '';
      google.accounts.id.renderButton(buttonHost.current, {
        theme: 'outline', size: 'large', shape: 'rectangular',
        text: 'signin_with', logo_alignment: 'left', width: 320
      });
      setGisError('');
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if ((window as any).google?.accounts?.id) {
      renderButton();
    } else if (existing) {
      existing.addEventListener('load', renderButton, { once: true });
      existing.addEventListener('error', () => setGisError('Skrip Google Identity gagal dimuat.'), { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = renderButton;
      script.onerror = () => setGisError('Skrip Google Identity gagal dimuat.');
      document.head.appendChild(script);
    }
    return () => { cancelled = true; };
  }, [screen, authenticate]);

  const createWorkspace = async () => {
    if (!user || !tokenRef.current) return;
    if (workspaceName.trim().length < 2) {
      setError('Nama workspace minimal 2 karakter.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let snapshot: WorkspaceSnapshot = createEmptyWorkspaceSnapshot();
      if (importLocal) snapshot = readLocalWorkspaceSnapshot();
      const created = await gasRpc<{ workspaceId: string }>('workspace.create', {
        name: workspaceName.trim(),
        snapshot
      }, tokenRef.current);
      await loadWorkspace(tokenRef.current, created.workspaceId, user.role);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Workspace gagal dibuat.');
      setBusy(false);
    }
  };

  const logout = () => {
    clearCloudWorkspace();
    setUser(null);
    setWorkspace(null);
    setWorkspaces([]);
    tokenRef.current = '';
    setScreen('login');
    setError('');
  };

  if (screen === 'ready' && user && workspace) {
    return (
      <AuthContext.Provider value={{ user, workspace, idToken: tokenRef.current, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ERP Properti &amp; Konstruksi</h1>
            <p className="text-sm text-slate-500">Login terverifikasi • Database Google Sheets</p>
          </div>
        </div>

        {screen === 'checking' && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-slate-600">
            <Loader2 className="animate-spin" size={20} /> Memeriksa sesi Google…
          </div>
        )}

        {screen === 'login' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Masuk dengan akun Google yang sudah diizinkan oleh administrator. Data utama akan dimuat dari cloud, bukan dari penyimpanan lokal browser.</p>
            {window.parent === window ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900">{gisError || 'Login hanya tersedia melalui URL Web App Apps Script.'}</p>
                {WEB_APP_URL && <a href={WEB_APP_URL} className="mt-3 inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Buka Panel ERP</a>}
              </div>
            ) : (
              <div ref={buttonHost} className="min-h-11" />
            )}
            {gisError && window.parent !== window && <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">{gisError}</p>}
            {error && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
          </div>
        )}

        {screen === 'creating' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm flex gap-2">
              <Database size={18} className="shrink-0 mt-0.5" />
              Akun admin terverifikasi. Buat sumber data cloud pertama sebelum input transaksi.
            </div>
            <label className="block text-sm font-medium text-slate-700">Nama database / workspace
              <input value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={100} />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={importLocal} onChange={event => setImportLocal(event.target.checked)} className="mt-1" />
              <span>Salin data dari browser ini ke cloud. <strong>Gunakan hanya setelah memeriksa data lama/demo.</strong> Jika tidak dicentang, workspace dibuat kosong (akun perkiraan awal disiapkan).</span>
            </label>
            {error && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
            <button disabled={busy} onClick={() => void createWorkspace()} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? 'Menyiapkan workspace…' : 'Buat workspace cloud'}
            </button>
          </div>
        )}

        {screen === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Pilih workspace yang akan dibuka.</p>
            <select value={selectedWorkspaceId} onChange={event => setSelectedWorkspaceId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
              {workspaces.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
            <button disabled={busy || !selectedWorkspaceId} onClick={() => void loadWorkspace(tokenRef.current, selectedWorkspaceId, user?.role || 'VIEWER')} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? 'Memuat data…' : 'Buka workspace'}
            </button>
            {error && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
          </div>
        )}

        {screen === 'blocked' && (
          <div className="space-y-4">
            <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error || 'Workspace belum tersedia.'}</span>
            </div>
            {user && <p className="text-sm text-slate-500">Akun: {user.email} • Role server: {user.role}</p>}
            <div className="flex gap-2">
              <button onClick={logout} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-700">Keluar / ganti akun</button>
              <button onClick={() => window.location.reload()} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-white">Coba lagi</button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 flex items-start gap-2 text-xs text-slate-500">
          <Cloud size={16} className="shrink-0" />
          <span>Akses data dilindungi di server. Pengguna VIEWER hanya baca. Jika cloud gagal, status penyimpanan ditampilkan; tidak ada klaim simpan berhasil palsu.</span>
        </div>
      </div>
    </div>
  );
}

