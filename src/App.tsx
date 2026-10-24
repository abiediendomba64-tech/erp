import { useEffect, useState } from 'react';
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
import CloudAccessGate from './components/CloudAccessGate';
import CloudSyncStatusBar from './components/CloudSyncStatusBar';
import { getCloudWorkspaceSession } from './lib/googleWorkspaceSync';

export type Page = 'dashboard' | 'auditrekap' | 'bukukas' | 'arsipbukti' | 'poskewajiban' | 'tanah' | 'beko' | 'auditlog' | 'laporan' | 'stok' | 'produksi' | 'penjualan' | 'pembelian' | 'penggajian' | 'anggaran' | 'alokasi' | 'ocr' | 'whatsapp' | 'menuconfig' | 'users' | 'settings' | 'accounting' | 'inputtransaksi' | 'laporankeuangan' | 'invoicepo' | 'rab' | 'qc' | 'aset' | 'pajak' | 'surat' | 'unit';

function AppContent() {
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

  const cloudSession = getCloudWorkspaceSession();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentRole] = useState<'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER'>(() =>
    cloudSession?.workspaceRole ?? (import.meta.env.DEV ? 'ADMIN' : 'VIEWER')
  );

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
    <AppProvider>
      <AccountingProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          currentRole={currentRole}
        />
        <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <CloudSyncStatusBar />
          {cloudSession && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{cloudSession.workspaceName}</p>
                <p className="truncate text-xs text-slate-500">{cloudSession.idToken ? 'Google account authenticated' : 'Session missing'} · Role {cloudSession.workspaceRole}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keluar ERP
              </button>
            </div>
          )}
          <div className="p-6">
            {renderPage()}
          </div>
        </main>
      </div>
      </AccountingProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <CloudAccessGate>
      <AppContent />
    </CloudAccessGate>
  );
}
