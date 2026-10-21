import { useState } from 'react';
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

export type Page = 'dashboard' | 'auditrekap' | 'bukukas' | 'arsipbukti' | 'poskewajiban' | 'tanah' | 'beko' | 'auditlog' | 'laporan' | 'stok' | 'produksi' | 'penjualan' | 'pembelian' | 'penggajian' | 'anggaran' | 'alokasi' | 'ocr' | 'whatsapp' | 'menuconfig';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentRole, setCurrentRole] = useState<'ADMIN' | 'VIEWER'>('ADMIN');

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
      default: return <Dashboard />;
    }
  };

  return (
    <AppProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
        />
        <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="p-6">
            {renderPage()}
          </div>
        </main>
      </div>
    </AppProvider>
  );
}

export default function App() {
  return <AppContent />;
}
