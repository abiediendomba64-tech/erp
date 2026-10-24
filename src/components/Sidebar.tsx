import {
  LayoutDashboard, BookOpen, FolderArchive, Scale,
  LandPlot, Truck, History, FileBarChart, Menu, X,
  Package, Factory, ShoppingCart, Users, PieChart,
  Scan, MessageCircle, Settings, DollarSign, Shield,
  UserCog, Plus, ClipboardList, ClipboardCheck, Building2, Calculator, Home
} from 'lucide-react';
import { Page } from '../App';
import { CloudUser } from '../lib/gasBridge';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentRole: CloudUser['role'];
}

// Menu untuk ADMIN (full access)
const adminMenu: { id: Page; label: string; icon: React.ReactNode; section: string }[] = [
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
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={20} />, section: 'Integrasi' },
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
  { id: 'unit', label: 'Register Unit Perumahan', icon: <Home size={20} />, section: 'Konstruksi' },
];

// Menu untuk CLIENT/VIEWER (read-only, data sensitif disaring oleh backend).
const clientMenu: { id: Page; label: string; icon: React.ReactNode; section: string }[] = [
  { id: 'dashboard', label: 'Ringkasan', icon: <LayoutDashboard size={20} />, section: 'Info' },
  { id: 'tanah', label: 'Progress Tanah', icon: <LandPlot size={20} />, section: 'Info' },
  { id: 'beko', label: 'Progress Beko', icon: <Truck size={20} />, section: 'Info' },
];

const financeMenu = adminMenu.filter(item => [
  'dashboard','auditrekap','laporan','tanah','beko','bukukas','arsipbukti','poskewajiban',
  'penjualan','pembelian','penggajian','anggaran','auditlog','accounting','inputtransaksi',
  'laporankeuangan','invoicepo','pajak'
].includes(item.id));

const projectMenu = adminMenu.filter(item => [
  'dashboard','tanah','beko','stok','produksi','pembelian','anggaran','rab','qc','aset','unit','surat'
].includes(item.id));

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen, currentRole }: SidebarProps) {
  const menuItems = currentRole === 'ADMIN' ? adminMenu
    : currentRole === 'KEUANGAN' ? financeMenu
      : currentRole === 'PROYEK' ? projectMenu : clientMenu;
  let currentSection = '';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-indigo-600 text-white p-2 rounded-lg shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-40 ${isOpen ? 'w-64' : 'w-16'} overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={18} />
            </div>
            {isOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm whitespace-nowrap">Audit System</h1>
                <p className="text-xs text-slate-400 whitespace-nowrap">Cloud • Hak akses server</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="absolute top-4 right-2 text-slate-400 hover:text-white hidden lg:block">
          {isOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Navigation */}
        <nav className="mt-2 px-2 space-y-0.5 overflow-y-auto h-[calc(100%-180px)]">
          {menuItems.map((item) => {
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

        {/* Footer */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 ${currentRole === 'ADMIN' ? 'bg-indigo-500' : 'bg-emerald-500'} rounded-full flex items-center justify-center text-xs font-bold`}>
                {currentRole === 'ADMIN' ? 'A' : currentRole === 'KEUANGAN' ? 'K' : currentRole === 'PROYEK' ? 'P' : 'V'}
              </div>
              <div>
                <p className="text-xs font-medium">{currentRole}</p>
                <p className="text-xs text-slate-400">Role diverifikasi oleh backend</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
