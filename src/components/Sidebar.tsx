import {
  LayoutDashboard, BookOpen, FolderArchive, Scale,
  LandPlot, Truck, History, FileBarChart, Menu, X
} from 'lucide-react';

type Page = 'dashboard' | 'bukukas' | 'arsipbukti' | 'poskewajiban' | 'tanah' | 'beko' | 'auditlog' | 'laporan';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const menuItems: { id: Page; label: string; icon: React.ReactNode; section: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, section: 'Utama' },
  { id: 'tanah', label: 'Kwitansi Tanah', icon: <LandPlot size={20} />, section: 'Data Input' },
  { id: 'beko', label: 'Kwitansi Beko', icon: <Truck size={20} />, section: 'Data Input' },
  { id: 'bukukas', label: 'Buku Kas (Lapisan 1)', icon: <BookOpen size={20} />, section: '3 Lapisan Audit' },
  { id: 'arsipbukti', label: 'Arsip Bukti (Lapisan 2)', icon: <FolderArchive size={20} />, section: '3 Lapisan Audit' },
  { id: 'poskewajiban', label: 'Pos Kewajiban (Lapisan 3)', icon: <Scale size={20} />, section: '3 Lapisan Audit' },
  { id: 'laporan', label: 'Laporan & Rekonsiliasi', icon: <FileBarChart size={20} />, section: 'Analisis' },
  { id: 'auditlog', label: 'Audit Log', icon: <History size={20} />, section: 'Analisis' },
];

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }: SidebarProps) {
  let currentSection = '';

  return (
    <>
      {/* Mobile toggle */}
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
              <Scale size={18} />
            </div>
            {isOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm whitespace-nowrap">Sistem Audit</h1>
                <p className="text-xs text-slate-400 whitespace-nowrap">Pembebasan Tanah & Cut Fill</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute top-4 right-2 text-slate-400 hover:text-white hidden lg:block"
        >
          {isOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Navigation */}
        <nav className="mt-4 px-2 space-y-1 overflow-y-auto h-[calc(100%-120px)]">
          {menuItems.map((item) => {
            const showSection = item.section !== currentSection;
            if (showSection) currentSection = item.section;

            return (
              <div key={item.id}>
                {isOpen && showSection && (
                  <div className="text-xs text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
                    {item.section}
                  </div>
                )}
                {!isOpen && showSection && <div className="border-t border-slate-700 my-2 mx-2" />}
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    currentPage === item.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">A</div>
              <div>
                <p className="text-xs font-medium">Admin</p>
                <p className="text-xs text-slate-400">Role: ADMIN</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
