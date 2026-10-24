import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Database, FileWarning, RefreshCw } from 'lucide-react';
import GoogleLoginPage from './GoogleLoginPage';
import type { LoginUser } from './GoogleLoginPage';
import {
  callGoogleBackend, clearCloudWorkspace, clearSessionToken, configureCloudWorkspace,
  getSessionToken, isGoogleBackendConfigured

} from '../lib/googleBackend';
import type { WorkspaceSnapshot } from '../lib/googleBackend';
import { countSnapshotRecords, createEmptyWorkspaceSnapshot, getLegacyLocalSnapshot } from '../lib/emptyWorkspace';

type State = 'checking' | 'login' | 'bootstrap' | 'app' | 'config' | 'error';
type SnapshotResponse = { found: boolean; snapshot: WorkspaceSnapshot | null; version: number };
type UserResponse = { user: LoginUser };

export default function CloudAuthGate({ children }: { children: (props: { initialSnapshot: WorkspaceSnapshot; sessionUser: LoginUser; onLogout: () => void }) => ReactNode }) {
  const [view, setView] = useState<State>(isGoogleBackendConfigured ? 'checking' : 'config');
  const [user, setUser] = useState<LoginUser | null>(null);
  const [token, setToken] = useState('');
  const [legacy, setLegacy] = useState<WorkspaceSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [legacyError, setLegacyError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [legacyBackupDownloaded, setLegacyBackupDownloaded] = useState(false);

  const enterWorkspace = useCallback(async (sessionToken: string, currentUser: LoginUser) => {
    setLegacyBackupDownloaded(false);
    const state = await callGoogleBackend<SnapshotResponse>({
      action: 'workspace.load',
      sessionToken,
    });
    setUser(currentUser);
    setToken(sessionToken);
    if (state.found && state.snapshot) {
      setSnapshot(state.snapshot);
      configureCloudWorkspace(sessionToken, state.snapshot, state.version);
      setView('app');
      return;
    }
    setLegacy(null);
    setLegacyError('');
    try {
      const local = getLegacyLocalSnapshot();
      setLegacy(local);
    } catch (error) {
      setLegacyError(error instanceof Error ? error.message : 'Data lokal lama tidak dapat dibaca.');
    }
    setView('bootstrap');
  }, []);

  useEffect(() => {
    let active = true;
    if (!isGoogleBackendConfigured) {
      setView('config');
      return () => { active = false; };
    }
    const existingToken = getSessionToken();
    if (!existingToken) {
      setView('login');
      return () => { active = false; };
    }
    (async () => {
      try {
        const identity = await callGoogleBackend<UserResponse>({ action: 'auth.me', sessionToken: existingToken });
        if (!active) return;
        await enterWorkspace(existingToken, identity.user);
      } catch {
        clearSessionToken();
        clearCloudWorkspace();
        if (active) setView('login');
      }
    })();
    return () => { active = false; };
  }, [enterWorkspace]);

  const onLogin = useCallback(async (sessionToken: string, currentUser: LoginUser) => {
    setMessage('');
    try {
      await enterWorkspace(sessionToken, currentUser);
    } catch (error) {
      clearSessionToken();
      clearCloudWorkspace();
      throw error;
    }
  }, [enterWorkspace]);

  const initialize = async (useLegacy: boolean) => {
    if (!token || !user) return;
    setLoading(true);
    setMessage('');
    try {
      const snapshot = useLegacy && legacy ? legacy : createEmptyWorkspaceSnapshot();
      const result = await callGoogleBackend<{ found: boolean; snapshot: WorkspaceSnapshot; version: number }>({
        action: 'workspace.bootstrap',
        sessionToken: token,
        snapshot,
      });
      setSnapshot(result.snapshot);
      configureCloudWorkspace(token, result.snapshot, result.version);
      setView('app');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Database cloud gagal dibuat.');
    } finally {
      setLoading(false);
    }
  };

  const counts = legacy ? countSnapshotRecords(legacy) : null;

  const downloadLegacyBackup = () => {
    if (!legacy) return;
    const payload = {
      format: 'erp-local-migration-backup',
      exportedAt: new Date().toISOString(),
      warning: 'Backup lokal sebelum migrasi. Verifikasi data dan bukti asli sebelum dipakai sebagai laporan resmi.',
      data: legacy,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'erp-local-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setLegacyBackupDownloaded(true);
  };

  const confirmLegacyMigration = () => {
    if (!legacy || !counts) return;
    const accepted = window.confirm(
      'Pindahkan ' + counts.total + ' record dari browser ini ke database cloud? ' +
      'Data lama bisa berisi seed atau angka yang belum direkonsiliasi. Lampiran yang hanya ada di IndexedDB browser tidak ikut diunggah ke Drive. ' +
      'Pastikan backup JSON sudah diunduh dan bukti asli diperiksa. Lanjutkan?'
    );
    if (accepted) void initialize(true);
  };

  const logout = useCallback(() => {
    clearSessionToken();
    clearCloudWorkspace();
    setToken('');
    setUser(null);
    setMessage('');
    setView('login');
  }, []);

  if (view === 'checking') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Memeriksa sesi dan database cloud…</div>;
  }

  if (view === 'login') return <GoogleLoginPage onLogin={onLogin} />;

  if (view === 'config') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-xl rounded-2xl border border-amber-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Konfigurasi backend Google belum lengkap</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Panel tidak akan masuk ke mode lokal otomatis. Atur konfigurasi deployment di environment lalu deploy ulang panel web.</p>
          <pre className="mt-4 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{'VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec\nVITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'}</pre>
          <p className="mt-3 text-sm text-slate-600">Sebelum dipakai, jalankan <code>setupErpBackend()</code> di Apps Script, isi Script Properties, dan deploy sebagai Web App.</p>
        </div>
      </div>
    );
  }

  if (view === 'bootstrap') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><Database size={24} /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Siapkan database cloud ERP</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Halo {user?.nama || user?.email}. Database belum memiliki snapshot. Pilih satu kali apakah memulai kosong atau memindahkan data lama yang ada pada browser ini.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="flex gap-2 font-semibold"><FileWarning size={18} /> Data lama tidak akan dipindahkan otomatis</div>
            <p className="mt-1">Data browser dapat berisi data historis, seed lama, atau angka yang belum direkonsiliasi. Periksa terlebih dahulu. Tombol migrasi di bawah hanya menyalin data jika Anda memilihnya, dan tidak menghapus localStorage.</p>
            {counts && (
              <div className="mt-2 space-y-1">
                <p>Ditemukan {counts.operational} record operasional dan {counts.accounting} record akuntansi. Menu tidak ikut dihitung.</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  {Object.entries(counts.operationalByModule).filter(([, count]) => count > 0).map(([name, count]) => (
                    <span key={name} className="rounded bg-amber-100 px-2 py-1">{name}: {count}</span>
                  ))}
                  {Object.entries(counts.accountingByModule).filter(([, count]) => count > 0).map(([name, count]) => (
                    <span key={name} className="rounded bg-sky-100 px-2 py-1">{name}: {count}</span>
                  ))}
                </div>
              </div>
            )}
            {legacyError && <p className="mt-2">{legacyError}</p>}
          </div>
          {message && <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{message}</div>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button disabled={loading} onClick={() => initialize(false)} className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? 'Menyiapkan…' : 'Mulai database cloud kosong'}
            </button>
            <div className="flex flex-1 flex-col gap-2">
              <button disabled={loading || !legacy || !counts?.total} onClick={downloadLegacyBackup} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                {legacyBackupDownloaded ? 'Unduh backup lagi' : 'Unduh backup data lokal'}
              </button>
              <button disabled={loading || !legacy || !counts?.total || !legacyBackupDownloaded} onClick={confirmLegacyMigration} className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 disabled:opacity-50">
                {loading ? 'Memindahkan…' : 'Migrasikan data browser ini'}
              </button>
              {!legacyBackupDownloaded && legacy && counts?.total > 0 && <p className="text-xs text-slate-500">Unduh backup terlebih dahulu sebelum migrasi.</p>}
            </div>
          </div>
          <button onClick={logout} className="mt-4 text-sm text-slate-500 hover:text-slate-800">Keluar</button>
        </div>
      </div>
    );
  }

  if (view === 'error') {
    return <div className="min-h-screen p-8 text-rose-800">{message}</div>;
  }

  return user && token && snapshot ? (
    <>{children({ initialSnapshot: snapshot, sessionUser: user, onLogout: logout })}</>
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600"><RefreshCw className="mr-2 animate-spin" /> Menghubungkan ke cloud…</div>
  );
}
