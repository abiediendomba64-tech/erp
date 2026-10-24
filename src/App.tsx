import { useEffect, useState } from 'react';
import React from 'react';
import { AppProvider } from './store';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AuditRekapPage from './pages/AuditRekapPage';
import BukuKasPage from './pages/BukuKasPage';
import ArsipBuktiPage from './pages/ArsipBuktiPage';
import PosKewajibanPage from './pages/PosKewajibanPage';
import TanahPage from './pages/TanahPage';
import BekoPage from './pages/BekoPage';
import AuditLogPage from './pages/AuditLogPage';
import LaporanPage from './pages/LaporanPage';
import StokPage from './pages/StokPage';
import ProduksiPage from './pages/ProduksiPage';
import PenjualanPage from './pages/PenjualanPage';
import PembelianPage from './pages/PembelianPage';
import PenggajianPage from './pages/PenggajianPage';
import AnggaranPage from './pages/AnggaranPage';
import OCRPage from './pages/OCRPage';
import WhatsAppPage from './pages/WhatsAppPage';
import MenuConfigPage from './pages/MenuConfigPage';
import AlokasiDanaPage from './pages/AlokasiDanaPage';
import UserManagementPage from './pages/UserManagementPage';
import SettingsPage from './pages/SettingsPage';
import AccountingDashboard from './pages/AccountingDashboard';
import InputTransaksiPage from './pages/InputTransaksiPage';
import LaporanKeuanganPage from './pages/LaporanKeuanganPage';
import InvoicePOPage from './pages/InvoicePOPage';
import RABPage from './pages/RABPage';
import QCPage from './pages/QCPage';
import AssetsPage from './pages/AssetsPage';
import TaxesPage from './pages/TaxesPage';
import SuratPage from './pages/SuratPage';
import HousingUnitsPage from './pages/HousingUnitsPage';
import { AccountingProvider } from './store/accounting';


import type { UserRole } from './types';
import { callGoogleAppsScript, isGoogleAppsScriptConfigured } from './lib/googleAppsScriptBridge';
import {
  activateCloudWorkspace, clearCloudWorkspace, subscribeCloudStatus,
  getCloudStatus, writeSnapshotToBrowserCache, type CloudUser, type WorkspaceSnapshot,
  type CloudStatus
} from './lib/cloudWorkspace';
import {
  clearWorkspaceBrowserCache, createEmptyWorkspaceSnapshot,
  readLocalWorkspaceSnapshot, countSnapshotRows
} from './lib/workspaceSnapshot';

export type Page = 'dashboard' | 'auditrekap' | 'bukukas' | 'arsipbukti' | 'poskewajiban' | 'tanah' | 'beko' | 'auditlog' | 'laporan' | 'stok' | 'produksi' | 'penjualan' | 'pembelian' | 'penggajian' | 'anggaran' | 'alokasi' | 'ocr' | 'whatsapp' | 'menuconfig' | 'users' | 'settings' | 'accounting' | 'inputtransaksi' | 'laporankeuangan' | 'invoicepo' | 'rab' | 'qc' | 'aset' | 'pajak' | 'surat' | 'unit';

type Screen = 'checking' | 'login' | 'bootstrap' | 'ready' | 'unconfigured';

function isPageAllowed(role: UserRole, page: Page): boolean {
  if (role === 'ADMIN') return true;
  const finance: Page[] = [
    'dashboard','auditrekap','laporan','tanah','beko','bukukas','arsipbukti','poskewajiban',
    'anggaran','alokasi','auditlog','accounting','inputtransaksi','laporankeuangan',
    'invoicepo','rab','pajak'
  ];
  const project: Page[] = [
    'dashboard','tanah','beko','stok','produksi','penjualan','pembelian','anggaran',
    'qc','aset','surat','unit'
  ];
  const viewer: Page[] = ['dashboard','tanah','beko'];
  if (role === 'KEUANGAN') return finance.includes(page);
  if (role === 'PROYEK') return project.includes(page);
  return viewer.includes(page);
}

function CloudStatusBanner({ status }: { status: CloudStatus }) {
  const labels = {
    ready: 'Menunggu penyimpanan',
    saving: 'Menyimpan ke cloud…',
    saved: 'Tersimpan di Google Sheets',
    error: 'Penyimpanan cloud gagal',
    conflict: 'Konflik versi cloud'
  };
  const style = status.status === 'error' || status.status === 'conflict'
    ? 'border-red-300 bg-red-50 text-red-900'
    : status.status === 'saving'
      ? 'border-blue-200 bg-blue-50 text-blue-900'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900';

  return (
    <div className={`mb-4 flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between ${style}`}>
      <span className="font-semibold">{labels[status.status]}</span>
      <span className="text-xs sm:text-right">{status.message}{status.version !== null ? ` · Versi ${status.version}` : ''}</span>
    </div>
  );
}

function AppContent({ user, onLogout }: { user: CloudUser; onLogout: () => void }) {
  useEffect(() => {
    // Remove legacy browser-stored integration secrets. Real provider secrets stay server-side.
    try {
      const raw = window.localStorage.getItem('app_settings');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          window.localStorage.setItem('app_settings', JSON.stringify({
            ...parsed, waApiToken: '', tgBotToken: '', autoBackup: false, backupLocation: 'local'
          }));
        }
      }
    } catch (error) {
      console.error('Pengaturan integrasi lama tidak dapat dibersihkan otomatis.', error);
    }
  }, []);

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(getCloudStatus());

  useEffect(() => subscribeCloudStatus(setCloudStatus), []);

  const renderPage = () => {
    if (!isPageAllowed(user.role, currentPage)) {
      return (
        <section className="rounded-xl border bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Akses halaman dibatasi</h2>
          <p className="mt-2 text-sm text-gray-600">Role akun Anda tidak diberi izin server untuk modul ini.</p>
          <button onClick={() => setCurrentPage('dashboard')} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white">Kembali ke Dashboard</button>
        </section>
      );
    }
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'auditrekap': return <AuditRekapPage />;
      case 'bukukas': return <BukuKasPage />;
      case 'arsipbukti': return <ArsipBuktiPage />;
      case 'poskewajiban': return <PosKewajibanPage />;
      case 'tanah': return <TanahPage />;
      case 'beko': return <BekoPage />;
      case 'auditlog': return <AuditLogPage />;
      case 'laporan': return <LaporanPage />;
      case 'stok': return <StokPage />;
      case 'produksi': return <ProduksiPage />;
      case 'penjualan': return <PenjualanPage />;
      case 'pembelian': return <PembelianPage />;
      case 'penggajian': return <PenggajianPage />;
      case 'anggaran': return <AnggaranPage />;
      case 'alokasi': return <AlokasiDanaPage />;
      case 'ocr': return <OCRPage />;
      case 'whatsapp': return <WhatsAppPage />;
      case 'menuconfig': return <MenuConfigPage />;
      case 'users': return <UserManagementPage />;
      case 'settings': return <SettingsPage />;
      case 'accounting': return <AccountingDashboard />;
      case 'inputtransaksi': return <InputTransaksiPage />;
      case 'laporankeuangan': return <LaporanKeuanganPage />;
      case 'invoicepo': return <InvoicePOPage />;
      case 'rab': return <RABPage />;
      case 'qc': return <QCPage />;
      case 'aset': return <AssetsPage />;
      case 'pajak': return <TaxesPage />;
      case 'surat': return <SuratPage />;
      case 'unit': return <HousingUnitsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppProvider>
      <AccountingProvider>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
            userRole={user.role}
            userName={user.name}
            userEmail={user.email}
            onLogout={onLogout}
          />
          <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
            <div className="p-6">
              <CloudStatusBanner status={cloudStatus} />
              {renderPage()}
            </div>
          </main>
        </div>
        {(cloudStatus.status === 'error' || cloudStatus.status === 'conflict') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
            <section role="alertdialog" aria-modal="true" className="max-w-lg rounded-xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-red-800">
                {cloudStatus.status === 'conflict' ? 'Data cloud berubah di perangkat lain' : 'Perubahan belum berhasil disimpan'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-700">{cloudStatus.message}</p>
              <p className="mt-2 text-sm text-gray-600">Input baru diblokir agar tidak menumpuk perubahan yang belum tersimpan. Muat ulang untuk mengambil data cloud terbaru.</p>
              <button onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
                Muat Ulang Data Cloud
              </button>
            </section>
          </div>
        )}
      </AccountingProvider>
    </AppProvider>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<CloudUser | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bootstrapCode, setBootstrapCode] = useState('');
  const [importLocal, setImportLocal] = useState(false);
  const [localSnapshot, setLocalSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [localRows, setLocalRows] = useState(0);

  const enterWorkspace = (token: string, snapshot: WorkspaceSnapshot, version: number, signedInUser: CloudUser) => {
    try {
      // Clear any previous browser user's cache before hydrating the current signed-in account.
      clearWorkspaceBrowserCache();
      writeSnapshotToBrowserCache(snapshot);
    } catch (storageError) {
      throw new Error('Cache browser tidak dapat disiapkan. Bersihkan ruang penyimpanan browser lalu coba lagi; data cloud tidak diubah.');
    }
    activateCloudWorkspace(token, snapshot, version, signedInUser.role);
    window.sessionStorage.setItem('erp_session_token', token);
    setUser(signedInUser);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setBootstrapCode('');
    setScreen('ready');
  };

  const hydrateExistingSession = async (token: string, signedInUser?: CloudUser) => {
    const auth = signedInUser
      ? { success: true, user: signedInUser }
      : await callGoogleAppsScript<{ success: boolean; user?: CloudUser; error?: string }>('apiGetSession', token);
    if (!auth.success || !auth.user) throw new Error(auth.error || 'Sesi login tidak valid.');
    const loaded = await callGoogleAppsScript<{
      success: boolean; snapshot?: WorkspaceSnapshot; version?: number; error?: string
    }>('apiLoadWorkspace', token);
    if (!loaded.success || !loaded.snapshot || typeof loaded.version !== 'number') {
      throw new Error(loaded.error || 'Data cloud tidak dapat dimuat.');
    }
    enterWorkspace(token, loaded.snapshot, loaded.version, auth.user);
  };

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        try {
          const local = readLocalWorkspaceSnapshot();
          setLocalSnapshot(local);
          setLocalRows(countSnapshotRows(local));
        } catch (localError) {
          console.warn('Data lokal lama tidak dapat dibaca dan tidak akan dimigrasikan otomatis.', localError);
        }

        if (!isGoogleAppsScriptConfigured()) {
          if (!cancelled) setScreen('unconfigured');
          return;
        }
        const token = window.sessionStorage.getItem('erp_session_token') || '';
        if (token) {
          const auth = await callGoogleAppsScript<{ success: boolean; user?: CloudUser; error?: string }>('apiGetSession', token);
          if (auth.success && auth.user) {
            const loaded = await callGoogleAppsScript<{
              success: boolean; snapshot?: WorkspaceSnapshot; version?: number; error?: string
            }>('apiLoadWorkspace', token);
            if (loaded.success && loaded.snapshot && typeof loaded.version === 'number') {
              if (!cancelled) enterWorkspace(token, loaded.snapshot, loaded.version, auth.user);
              return;
            }
            throw new Error(loaded.error || 'Data cloud tidak dapat dimuat.');
          }
          window.sessionStorage.removeItem('erp_session_token');
          clearCloudWorkspace();
        }
        await callGoogleAppsScript<{ success: boolean }>('apiHealth');
        if (!cancelled) setScreen('login');
      } catch (initError) {
        window.sessionStorage.removeItem('erp_session_token');
        clearCloudWorkspace();
        if (!cancelled) {
          setError(initError instanceof Error ? initError.message : String(initError));
          setScreen('login');
        }
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await callGoogleAppsScript<{
        success: boolean; sessionToken?: string; user?: CloudUser; error?: string
      }>('apiLogin', email.trim(), password);
      if (!response.success || !response.sessionToken || !response.user) {
        throw new Error(response.error || 'Login gagal.');
      }
      await hydrateExistingSession(response.sessionToken, response.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setBusy(false);
    }
  };

  const handleBootstrap = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const initialSnapshot = importLocal && localSnapshot
        ? localSnapshot
        : createEmptyWorkspaceSnapshot();
      const response = await callGoogleAppsScript<{
        success: boolean; sessionToken?: string; expiresAt?: string; user?: CloudUser;
        version?: number; snapshot?: WorkspaceSnapshot; error?: string
      }>('apiBootstrapAdmin', bootstrapCode, email.trim(), password, name.trim(), phone.trim(), initialSnapshot);
      if (!response.success || !response.sessionToken || !response.user ||
          !response.snapshot || typeof response.version !== 'number') {
        throw new Error(response.error || 'Setup administrator awal gagal.');
      }
      enterWorkspace(response.sessionToken, response.snapshot, response.version, response.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    const token = window.sessionStorage.getItem('erp_session_token') || '';
    try { if (token) await callGoogleAppsScript('apiLogout', token); } catch (logoutError) {
      console.warn('Logout server tidak terkonfirmasi; token lokal tetap dihapus.', logoutError);
    }
    window.sessionStorage.removeItem('erp_session_token');
    clearCloudWorkspace();
    clearWorkspaceBrowserCache();
    clearCloudWorkspace();
    setLocalSnapshot(null);
    setLocalRows(0);
    setUser(null);
    setScreen('login');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setBootstrapCode('');
    setImportLocal(false);
  };

  if (screen === 'checking') {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="rounded-xl border bg-white p-6 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /><p className="mt-4 font-medium text-gray-800">Memuat autentikasi dan data cloud…</p></div></div>;
  }

  if (screen === 'ready' && user) return <AppContent user={user} onLogout={handleLogout} />;

  const unconfigured = screen === 'unconfigured';
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white"><Shield size={25} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ERP Properti & Konstruksi</h1>
            <p className="text-sm text-slate-500">Login aman · Google Apps Script + Sheets</p>
          </div>
        </div>

        {unconfigured ? (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <h2 className="font-semibold">Backend belum dikonfigurasi</h2>
            <p>Atur <code>VITE_GAS_WEBAPP_URL</code> pada environment build web, lalu atur <code>SPREADSHEET_ID</code>, <code>ERP_BOOTSTRAP_CODE</code>, dan <code>ALLOWED_APP_ORIGINS</code> di Apps Script Project Settings.</p>
            <p>Aplikasi tidak membuka data lokal sebagai pengganti backend; ini mencegah perubahan terlihat tersimpan padahal belum masuk ke cloud.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => { setScreen('login'); setError(''); }} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${screen === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Login</button>
              <button type="button" onClick={() => { setScreen('bootstrap'); setError(''); }} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${screen === 'bootstrap' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Setup Admin Pertama</button>
            </div>

            {screen === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Email
                  <input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Kata sandi
                  <input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
                <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? 'Memeriksa…' : 'Login ke ERP'}</button>
              </form>
            ) : screen === 'bootstrap' ? (
              <form onSubmit={handleBootstrap} className="space-y-4">
                <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900">Setup ini hanya bisa berhasil satu kali, sebelum ada akun aktif. Kode aktivasi dibaca dari Script Properties dan dihapus server setelah berhasil digunakan.</p>
                <label className="block text-sm font-medium text-slate-700">Kode aktivasi awal
                  <input required type="password" autoComplete="off" value={bootstrapCode} onChange={event => setBootstrapCode(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Nama administrator
                    <input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Telepon (opsional)
                    <input type="tel" value={phone} onChange={event => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">Email administrator
                  <input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Kata sandi baru (min. 12 karakter)
                    <input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Ulangi kata sandi
                    <input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                  </label>
                </div>
                {localRows > 0 && (
                  <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <input type="checkbox" checked={importLocal} onChange={event => setImportLocal(event.target.checked)} className="mt-1" />
                    <span><strong>Impor data lama dari browser ini</strong><br />Ada sekitar {localRows} baris data lokal. Jika dipilih, data tersebut menjadi data cloud awal. Periksa dahulu; jangan pilih bila data browser ini bukan data proyek yang akan digunakan.</span>
                  </label>
                )}
                <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? 'Menyiapkan workspace…' : 'Buat Admin dan Inisialisasi Cloud'}</button>
              </form>
            ) : null}
          </>
        )}

        {error && !unconfigured && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {error && unconfigured && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
        <p className="mt-6 text-xs leading-5 text-slate-500">Sumber data utama adalah Google Sheets. Bila cloud gagal menyimpan atau versinya konflik, input akan diblokir sampai data terbaru dimuat kembali.</p>
      </section>
    </main>
  );
}
