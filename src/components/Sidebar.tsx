import {
  LayoutDashboard, BookOpen, FolderArchive, Scale, LandPlot, Truck, History,
  FileBarChart, Menu, X, Package, Factory, ShoppingCart, Users, PieChart,
  Scan, MessageCircle, Settings, DollarSign, Shield, Plus, ClipboardList,
  ClipboardCheck, Building2, Calculator, Home, LogOut
} from 'lucide-react';
import type { Page } from '../App';
import type { UserRole } from '../types';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userRole: UserRole;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

type MenuEntry = { id: Page; label: string; icon: React.ReactNode; section: string };

const adminMenu: MenuEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, section: 'Utama' },
  { id: 'auditrekap', label: 'Audit Rekap', icon: <FileBarChart size={20} />, section: 'Utama' },
  { id: 'laporan', label: 'Laporan', icon: <FileBarChart size={20} />, section: 'Utama' },
  { id: 'tanah', label: 'Register Tanah', icon: <LandPlot size={20} />, section: 'Audit' },
  { id: 'beko', label: 'Rincian Beko', icon: <Truck size={20} />, section: 'Audit' },
  { id: 'bukukas', label: 'Buku Kas (L1)', icon: <BookOpen size={20} />, section: '3 Lapisan' },
  { id: 'arsipbukti', label: 'Arsip Bukti (L2)', icon: <FolderArchive size={20} />, section: '3 Lapisan' },
  { id: 'poskewajiban', label: 'Utang Tanah (L3)', icon: <Scale size={20} />, section: '3 Lapisan' },
  { id: 'stok', label: 'Stok Barang', icon: <Package size={20} />, section: 'ERP' },
  { id: 'produksi', label: 'Produksi', icon: <Factory size={20} />, section: 'ERP' },
  { id: 'penjualan', label: 'Penjualan', icon: <ShoppingCart size={20} />, section: 'ERP' },
  { id: 'pembelian', label: 'Pembelian', icon: <Truck size={20} />, section: 'ERP' },
  { id: 'penggajian', label: 'Penggajian', icon: <DollarSign size={20} />, section: 'ERP' },
  { id: 'anggaran', label: 'Anggaran', icon: <PieChart size={20} />, section: 'ERP' },
  { id: 'alokasi', label: 'Alokasi Dana Detail', icon: <DollarSign size={20} />, section: 'ERP' },
  { id: 'ocr', label: 'OCR / Vision AI', icon: <Scan size={20} />, section: 'Integrasi' },
  { id: 'whatsapp', label: 'WhatsApp / Telegram', icon: <MessageCircle size={20} />, section: 'Integrasi' },
  { id: 'users', label: 'Manajemen User', icon: <Users size={20} />, section: 'Sistem' },
  { id: 'settings', label: 'Pengaturan', icon: <Settings size={20} />, section: 'Sistem' },
  { id: 'auditlog', label: 'Audit Log', icon: <History size={20} />, section: 'Sistem' },
  { id: 'menuconfig', label: 'Konfigurasi', icon: <Settings size={20} />, section: 'Sistem' },
  { id: 'accounting', label: 'Dashboard Akuntansi', icon: <FileBarChart size={20} />, section: 'Akuntansi' },
  { id: 'inputtransaksi', label: 'Input Transaksi', icon: <Plus size={20} />, section: 'Akuntansi' },
  { id: 'laporankeuangan', label: 'Laporan Keuangan', icon: <FileBarChart size={20} />, section: 'Akuntansi' },
  { id: 'invoicepo', label: 'Invoice & PO', icon: <FileBarChart size={20} />, section: 'Akuntansi' },
  { id: 'rab', label: 'RAB / BOQ Proyek', icon: <ClipboardList size={20} />, section: 'Akuntansi' },
  { id: 'qc', label: 'Quality Control (QC)', icon: <ClipboardCheck size={20} />, section: 'Konstruksi' },
  { id: 'aset', label: 'Register Aset', icon: <Building2 size={20} />, section: 'Aset & Pajak' },
  { id: 'pajak', label: 'Register Pajak', icon: <Calculator size={20} />, section: 'Aset & Pajak' },
  { id: 'surat', label: 'Surat & Dokumen', icon: <FolderArchive size={20} />, section: 'Dokumen' },
  { id: 'unit', label: 'Register Unit Perumahan', icon: <Home size={20} />, section: 'Konstruksi' }
];

const financePages: Page[] = [
  'dashboard','auditrekap','laporan','tanah','beko','bukukas','arsipbukti','poskewajiban',
  'anggaran','alokasi','auditlog','accounting','inputtransaksi','laporankeuangan',
  'invoicepo','rab','pajak'
];
const projectPages: Page[] = [
  'dashboard','tanah','beko','stok','produksi','penjualan','pembelian','anggaran',
  'qc','aset','surat','unit'
];
const viewerPages: Page[] = ['dashboard','tanah','beko'];

const labels: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  KEUANGAN: 'Keuangan',
  PROYEK: 'Tim Proyek',
  VIEWER: 'Viewer / Klien'
};

const roleMenuOrder: Record<UserRole, Page[]> = {
  ADMIN: adminMenu.map(item => item.id),
  KEUANGAN: financePages,
  PROYEK: projectPages,
  VIEWER: viewerPages
};

export default function Sidebar({
  currentPage, setCurrentPage, isOpen, setIsOpen,
  userRole, userName, userEmail, onLogout
}: SidebarProps) {
  const menuItems = adminMenu.filter(item => roleMenuOrder[userRole].includes(item.id));
  let currentSection = '';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-indigo-600 text-white p-2 rounded-lg shadow-lg"
        aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-40 ${isOpen ? 'w-64' : 'w-16'} overflow-hidden`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={18} />
            </div>
            {isOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm whitespace-nowrap">ERP Properti & Konstruksi</h1>
                <p className="text-xs text-emerald-300 whitespace-nowrap">Google Sheets • Cloud</p>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Ciutkan menu' : 'Perluas menu'}
          className="absolute top-4 right-2 text-slate-400 hover:text-white hidden lg:block">
          {isOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        <nav className="mt-2 px-2 space-y-0.5 overflow-y-auto h-[calc(100%-150px)]">
          {menuItems.map(item => {
            const showSection = item.section !== currentSection;
            if (showSection) currentSection = item.section;
            return (
              <div key={item.id}>
                {isOpen && showSection && (
                  <div className="text-xs text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1 font-semibold">{item.section}</div>
                )}
                {!isOpen && showSection && <div className="border-t border-slate-700 my-2 mx-2" />}
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {isOpen && <span className="whitespace-nowrap truncate">{item.label}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700 bg-slate-900">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {(userName || userEmail || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{userName || userEmail}</p>
                <p className="text-xs text-slate-400 truncate">{labels[userRole]} · {userEmail}</p>
              </div>
            </div>
            <button onClick={onLogout} className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
              <LogOut size={15} /> Keluar
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
