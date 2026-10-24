import { useEffect, useState } from 'react';
import { AppProvider } from './store';
import CloudAuthGate from './components/CloudAuthGate';
import { LoginUser } from './components/GoogleLoginPage';
import { CloudStatus, getCloudStatus, subscribeCloudStatus, WorkspaceSnapshot } from './lib/googleBackend';
import { AlertTriangle, Cloud, CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';
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

export type Page = 'dashboard' | 'auditrekap' | 'bukukas' | 'arsipbukti' | 'poskewajiban' | 'tanah' | 'beko' | 'auditlog' | 'laporan' | 'stok' | 'produksi' | 'penjualan' | 'pembelian' | 'penggajian' | 'anggaran' | 'alokasi' | 'ocr' | 'whatsapp' | 'menuconfig' | 'users' | 'settings' | 'accounting' | 'inputtransaksi' | 'laporankeuangan' | 'invoicepo' | 'rab' | 'qc' | 'aset' | 'pajak' | 'surat' | 'unit';

function CloudStatusGuard() {
  const [status, setStatus] = useState<CloudStatus>(getCloudStatus());

  useEffect(() => subscribeCloudStatus(setStatus), []);

  if (status.status === 'error' || status.status === 'conflict') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-3 text-rose-700">
            <AlertTriangle size={26} />
            <h2 className="text-lg font-bold">Perubahan belum aman tersimpan</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{status.message}</p>
          <p className="mt-2 text-xs text-slate-500">Jangan lanjut mencatat sampai data terbaru berhasil dimuat dari cloud. Data lokal lama tidak akan ditimpa secara otomatis.</p>
          <button onClick={() => window.location.reload()} className="mt-5 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
            <RefreshCw size={16} /> Muat ulang data cloud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      {status.status === 'saving' ? <LoaderCircle size={15} className="animate-spin text-indigo-600" /> : status.status === 'saved' ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Cloud size={15} className="text-slate-500" />}
      <span>{status.message}</span>
      {status.version !== null && <span className="ml-auto font-mono text-slate-400">versi {status.version}</span>}
    </div>
  );
}

function AppContent({ initialSnapshot, sessionUser, onLogout }: { initialSnapshot: WorkspaceSnapshot; sessionUser: LoginUser; onLogout: () => void }) {
  useEffect(() => {
    // Remove legacy browser-stored integration secrets as early as possible.
    // Integrations require a server-side secret store, which is not configured in this build.
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
      console.error('Pengaturan lama tidak dapat dibersihkan otomatis; periksa storage browser.', error);
    }
  }, []);

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentRole = sessionUser.role;

  const renderPage = () => {
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
    <AppProvider initialState={initialSnapshot.operational as any}>
      <AccountingProvider initialState={initialSnapshot.accounting as any}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          currentRole={currentRole}
          userEmail={sessionUser.email}
          onLogout={onLogout}
        />
        <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="p-6">
            <CloudStatusGuard />
            {currentRole === 'VIEWER' && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Mode baca saja. Tombol dan input dinonaktifkan untuk role VIEWER; perubahan data membutuhkan akun berizin.
              </div>
            )}
            <div
              className={currentRole === 'VIEWER' ? 'pointer-events-none select-none opacity-90' : ''}
              aria-disabled={currentRole === 'VIEWER'}
            >
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
      </AccountingProvider>
    </AppProvider>
  );
}

export default function App() {
  return <CloudAuthGate>{({ initialSnapshot, sessionUser, onLogout }) => <AppContent initialSnapshot={initialSnapshot} sessionUser={sessionUser} onLogout={onLogout} />}</CloudAuthGate>;
}
