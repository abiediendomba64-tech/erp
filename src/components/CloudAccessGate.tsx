import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createCloudWorkspace,
  getCloudPublicConfig,
  loadCloudWorkspace,
  loginWithGoogleIdToken,
  type CloudUser,
  type CloudWorkspace,
  type PublicCloudConfig,
} from '../lib/googleWorkspaceApi';
import {
  createEmptyWorkspaceSnapshot,
  downloadLocalWorkspaceBackup,
  downloadRawLocalWorkspaceBackup,
  isLocalSnapshotSyncedForWorkspace,
  readLocalWorkspaceSnapshot,
  saveWorkspaceSnapshotToLocalCache,
  type WorkspaceSnapshot,
} from '../lib/initialWorkspace';
import { configureCloudWorkspaceSession } from '../lib/googleWorkspaceSync';

interface GoogleCredentialResponse { credential: string; }
interface GoogleIdentityClient {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(element: HTMLElement, options: Record<string, unknown>): void;
      cancel(): void;
    };
  };
}
type GatePhase = 'config' | 'login' | 'checking' | 'workspaces' | 'creating' | 'loading' | 'ready' | 'denied' | 'error' | 'standalone' | 'dev';

function loadGoogleIdentityClient(): Promise<GoogleIdentityClient> {
  const getClient = () => (window as unknown as { google?: GoogleIdentityClient }).google;
  if (getClient()?.accounts?.id) return Promise.resolve(getClient()!);

  return new Promise((resolve, reject) => {
    let script = document.getElementById('erp-google-identity') as HTMLScriptElement | null;
    if (script) {
      script.addEventListener('load', () => {
        const client = getClient();
        if (client?.accounts?.id) resolve(client);
        else reject(new Error('Library login Google gagal dimuat.'));
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('Gagal memuat login Google. Periksa koneksi dan pemblokir skrip.')), { once: true });
      return;
    }

    script = document.createElement('script');
    script.id = 'erp-google-identity';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const client = getClient();
      if (client?.accounts?.id) resolve(client);
      else reject(new Error('Login Google tidak tersedia setelah skrip dimuat.'));
    };
    script.onerror = () => reject(new Error('Gagal memuat login Google. Periksa koneksi dan pemblokir skrip.'));
    document.head.appendChild(script);
  });
}

function localSnapshotHasRecords(snapshot: WorkspaceSnapshot | null): boolean {
  if (!snapshot) return false;
  const operationalHasRows = Object.entries(snapshot.operational).some(([key, value]) =>
    key !== 'menuConfig' && Array.isArray(value) && value.length > 0
  );
  const accountingHasRows = Object.entries(snapshot.accounting).some(([key, value]) =>
    key !== 'akun' && Array.isArray(value) && value.length > 0
  );
  return operationalHasRows || accountingHasRows;
}

export default function CloudAccessGate({ children }: { children: ReactNode }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<string>('');
  const [phase, setPhase] = useState<GatePhase>('config');
  const [config, setConfig] = useState<PublicCloudConfig | null>(null);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [workspaces, setWorkspaces] = useState<CloudWorkspace[]>([]);
  const [workspaceName, setWorkspaceName] = useState('ERP Properti & Konstruksi');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [localSnapshot, setLocalSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [localHasRows, setLocalHasRows] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [localReadError, setLocalReadError] = useState('');
  const [identityReady, setIdentityReady] = useState(false);
  const [identityInitError, setIdentityInitError] = useState('');

  const captureLocalSnapshot = useCallback(() => {
    try {
      const snapshot = readLocalWorkspaceSnapshot();
      setLocalSnapshot(snapshot);
      const hasRows = localSnapshotHasRecords(snapshot);
      setLocalHasRows(hasRows);
      setBackupDownloaded(!hasRows);
      setLocalReadError('');
      return snapshot;
    } catch (readError) {
      setLocalReadError(readError instanceof Error ? readError.message : 'Cache lokal tidak dapat dibaca.');
      setLocalSnapshot(null);
      // Treat any unparseable local cache as user data, never as an empty installation.
      setLocalHasRows(
        window.localStorage.getItem('abiedien.erp.app.v1') !== null ||
        window.localStorage.getItem('abiedien.erp.accounting.v1') !== null
      );
      setBackupDownloaded(false);
      return null;
    }
  }, []);

  const completeLogin = useCallback(async (idToken: string) => {
    setPhase('checking');
    setError('');
    setNotice('');
    tokenRef.current = idToken;
    try {
      const response = await loginWithGoogleIdToken(idToken);
      setUser(response.user);
      setWorkspaces(response.workspaces);
      captureLocalSnapshot();
      if (response.workspaces.length) setPhase('workspaces');
      else if (response.user.role === 'ADMIN') setPhase('creating');
      else {
        setError('Akun ini valid tetapi belum menjadi anggota workspace ERP. Minta ADMIN menambahkan pengguna dan akses workspace.');
        setPhase('denied');
      }
    } catch (loginError) {
      tokenRef.current = '';
      setError(loginError instanceof Error ? loginError.message : 'Autentikasi gagal.');
      setPhase('error');
    }
  }, [captureLocalSnapshot]);

  useEffect(() => {
    if (window.parent === window) {
      setPhase(import.meta.env.DEV ? 'dev' : 'standalone');
      return;
    }

    let cancelled = false;
    getCloudPublicConfig()
      .then(async (publicConfig) => {
        if (cancelled) return;
        setConfig(publicConfig);
        if (!publicConfig.configured) {
          setError(publicConfig.reason || 'Konfigurasi cloud belum lengkap.');
          setPhase('error');
          return;
        }

        const identity = await loadGoogleIdentityClient();
        if (cancelled || !buttonRef.current) return;
        identity.accounts.id.initialize({
          client_id: publicConfig.googleClientId,
          callback: (response) => {
            if (response?.credential) void completeLogin(response.credential);
            else {
              setError('Google tidak mengembalikan token login.');
              setPhase('error');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        identity.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320,
          logo_alignment: 'left',
        });
        setIdentityReady(true);
        setPhase('login');
      })
      .catch((bootstrapError) => {
        if (cancelled) return;
        setError(bootstrapError instanceof Error ? bootstrapError.message : 'Backend cloud tidak dapat dihubungi.');
        setPhase('error');
      });

    return () => { cancelled = true; };
  }, [completeLogin]);

  const downloadBackup = () => {
    if (localSnapshot) {
      downloadLocalWorkspaceBackup(localSnapshot);
      setBackupDownloaded(true);
      setNotice('Permintaan unduh backup JSON telah dijalankan. Periksa folder Downloads; lampiran IndexedDB tidak termasuk.');
      return;
    }
    const downloadedRaw = downloadRawLocalWorkspaceBackup();
    if (downloadedRaw) {
      setBackupDownloaded(true);
      setNotice('Backup mentah cache lokal yang rusak telah diminta untuk diunduh. Simpan file ini dan periksa sebelum impor.');
    } else {
      setBackupDownloaded(true);
      setNotice('Tidak ada cache lokal yang ditemukan untuk dicadangkan.');
    }
  };

  const activateWorkspace = async (workspace: CloudWorkspace) => {
    const localSnapshotIsSynced = isLocalSnapshotSyncedForWorkspace(localSnapshot, workspace.id);
    if (localHasRows && !localSnapshotIsSynced && !backupDownloaded) {
      setError('Data browser berbeda dari snapshot cloud terakhir atau berasal dari workspace lain. Unduh backup sebelum menggantinya.');
      return;
    }
    setPhase('loading');
    setError('');
    try {
      const loaded = await loadCloudWorkspace(tokenRef.current, workspace.id);
      saveWorkspaceSnapshotToLocalCache(loaded.snapshot);
      configureCloudWorkspaceSession({
        idToken: tokenRef.current,
        workspaceId: loaded.workspace.id,
        workspaceName: loaded.workspace.name,
        workspaceRole: loaded.workspace.role,
        version: loaded.workspace.version,
      }, loaded.snapshot);
      setPhase('ready');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat workspace cloud.');
      setPhase('error');
    }
  };

  const createWorkspace = async (fromLocal: boolean) => {
    if (!user || user.role !== 'ADMIN') return;
    if (workspaceName.trim().length < 2) {
      setError('Nama workspace minimal 2 karakter.');
      return;
    }
    if (localHasRows && !backupDownloaded) {
      setError('Unduh backup lokal lebih dahulu sebelum membuat workspace.');
      return;
    }
    setPhase('loading');
    setError('');
    try {
      const snapshot = fromLocal && localSnapshot ? localSnapshot : createEmptyWorkspaceSnapshot();
      const created = await createCloudWorkspace(tokenRef.current, workspaceName.trim(), snapshot);
      saveWorkspaceSnapshotToLocalCache(created.snapshot);
      configureCloudWorkspaceSession({
        idToken: tokenRef.current,
        workspaceId: created.workspace.id,
        workspaceName: created.workspace.name,
        workspaceRole: created.workspace.role,
        version: created.workspace.version,
      }, created.snapshot);
      setPhase('ready');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Gagal membuat workspace.');
      setPhase('error');
    }
  };

  if (phase === 'ready') return <>{children}</>;

  if (phase === 'dev') {
    return (
      <>
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Mode pengembangan lokal: belum login cloud dan perubahan tidak tersimpan lintas perangkat. Untuk memakai data cloud, buka URL Web App Google Apps Script.
        </div>
        {children}
      </>
    );
  }

  const shell = (body: ReactNode) => (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-7 py-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">ERP • Google Cloud Workspace</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">ERP Properti &amp; Konstruksi</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Masuk dengan akun Google yang telah diizinkan ADMIN. Data operasional resmi dimuat dari workspace Google Sheets.</p>
        </div>
        <div className="space-y-5 px-7 py-6">{body}</div>
        <div className="border-t border-slate-100 bg-slate-50 px-7 py-4 text-xs leading-5 text-slate-500">
          Login dan role divalidasi di backend. Jangan membagikan file spreadsheet database kepada pengguna biasa.
        </div>
      </div>
    </div>
  );

  if (phase === 'standalone') {
    return shell(
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Akses produksi ditolak dari URL frontend langsung. Buka URL Web App Apps Script resmi agar autentikasi dan penyimpanan cloud aktif.
        </div>
      </div>
    );
  }

  if (phase === 'config' || phase === 'checking' || phase === 'loading') {
    return shell(
      <div className="space-y-3">
        <div className="h-2 overflow-hidden rounded bg-slate-100"><div className="h-full w-2/3 animate-pulse rounded bg-indigo-500" /></div>
        <p className="text-sm text-slate-600">
          {phase === 'config' ? 'Memeriksa konfigurasi backend…' : phase === 'checking' ? 'Memverifikasi akun Google dan izin pengguna…' : 'Memuat atau menyimpan workspace cloud…'}
        </p>
      </div>
    );
  }

  if (phase === 'login') {
    return shell(
      <>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {!identityReady && <p className="text-sm text-slate-600">Memuat tombol login Google…</p>}
        <div ref={buttonRef} className="flex min-h-11 justify-center" />
        <p className="text-xs leading-5 text-slate-500">Akun Google yang belum terdaftar atau dinonaktifkan akan ditolak oleh backend.</p>
        {config && !config.configured && <p className="text-sm text-red-700">{config.reason}</p>}
      </>
    );
  }

  if (phase === 'workspaces') {
    return shell(
      <>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="font-medium">{user?.display_name || user?.email}</div>
          <div className="text-slate-500">{user?.email} · Role global {user?.role}</div>
        </div>
        {localHasRows && workspaces.some((item) => !isLocalSnapshotSyncedForWorkspace(localSnapshot, item.id)) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Data browser lokal perlu diperiksa</p>
            <p className="mt-1 text-sm leading-5 text-amber-800">Sebelum memilih workspace yang berbeda atau memiliki data lokal yang belum sinkron, unduh backup JSON. Jika cache sama dengan snapshot cloud yang terakhir tersimpan, backup tambahan tidak diperlukan. Lampiran IndexedDB tidak termasuk.</p>
            <button onClick={downloadBackup} className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">
              Unduh backup lokal
            </button>
            {backupDownloaded && <p className="mt-2 text-xs text-amber-800">Permintaan unduh telah dijalankan. Periksa folder Downloads.</p>}
          </div>
        )}
        {localReadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{localReadError} Jika perlu, unduh backup mentah sebelum cache lokal diganti.</p>}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Pilih workspace</p>
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              disabled={localHasRows && !isLocalSnapshotSyncedForWorkspace(localSnapshot, workspace.id) && !backupDownloaded}
              onClick={() => void activateWorkspace(workspace)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                <span className="block font-semibold">{workspace.name}</span>
                <span className="mt-1 block text-xs text-slate-500">Role {workspace.role} · Versi cloud {workspace.version}</span>
              </span>
              <span aria-hidden="true" className="text-indigo-600">→</span>
            </button>
          ))}
        </div>
        {notice && <p className="text-xs leading-5 text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      </>
    );
  }

  if (phase === 'creating') {
    return shell(
      <>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="font-medium">{user?.display_name || user?.email}</div>
          <div className="text-slate-500">{user?.email} · Administrator</div>
        </div>
        <div>
          <label htmlFor="workspace-name" className="mb-1 block text-sm font-semibold text-slate-700">Nama workspace</label>
          <input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={100}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </div>
        {localHasRows && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Ada data lama di browser ini</p>
            <p className="mt-1 text-sm leading-5 text-amber-800">Simpan backup JSON terlebih dahulu. Impor lokal akan menyalin data yang ditemukan apa adanya, termasuk record lama yang mungkin perlu diperiksa. Workspace kosong tidak membawa data lokal.</p>
            <button onClick={downloadBackup} className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">
              Unduh backup lokal
            </button>
            {backupDownloaded && <p className="mt-2 text-xs text-amber-800">Pastikan file sudah terunduh sebelum membuat workspace.</p>}
          </div>
        )}
        {localReadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{localReadError}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <button disabled={localHasRows && !backupDownloaded} onClick={() => void createWorkspace(false)}
            className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            Buat workspace kosong
          </button>
          <button disabled={!localSnapshot || (localHasRows && !backupDownloaded)} onClick={() => void createWorkspace(true)}
            className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Impor data browser
          </button>
        </div>
        <p className="text-xs leading-5 text-slate-500">Impor bersifat eksplisit. Jangan mengimpor data sebelum memeriksa record demo/legacy dan membuat backup. Lampiran IndexedDB tidak ikut dipindahkan.</p>
        {notice && <p className="text-xs leading-5 text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      </>
    );
  }

  if (phase === 'denied') {
    return shell(
      <>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{error}</div>
        <p className="text-sm text-slate-600">Jika ini kesalahan, ADMIN harus memasukkan email Anda ke daftar ERP_USERS dan menambahkan Anda ke workspace yang sesuai.</p>
        <button onClick={() => { setError(''); setPhase('login'); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Kembali ke login</button>
      </>
    );
  }

  return shell(
    <>
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error || 'Backend ERP tidak dapat diinisialisasi.'}</div>
      {localReadError && <p className="text-sm text-slate-600">{localReadError}</p>}
      <button onClick={() => window.location.reload()} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Coba lagi</button>
      <p className="text-xs text-slate-500">Kesalahan autentikasi dan backend ditampilkan secara eksplisit. Sistem tidak menganggap data lokal sebagai data cloud.</p>
    </>
  );
}
