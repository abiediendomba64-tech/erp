import { useState } from 'react';
import { useAppContext } from '../store';
import { MenuItem, UserRole } from '../types';
import { Settings, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Shield, Check } from 'lucide-react';

export default function MenuConfigPage() {
  const { state, dispatch } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const visibleMenus = state.menuConfig.filter(m => m.visible).sort((a, b) => a.order - b.order);
  const hiddenMenus = state.menuConfig.filter(m => !m.visible);
  const roleMenus = state.menuConfig.filter(m => m.role_access.includes(selectedRole)).sort((a, b) => a.order - b.order);

  const toggleVisibility = (item: MenuItem) => {
    dispatch({ type: 'UPDATE_MENU', payload: { ...item, visible: !item.visible } });
  };

  const toggleRoleAccess = (item: MenuItem, role: UserRole) => {
    const newRoles = item.role_access.includes(role)
      ? item.role_access.filter(r => r !== role)
      : [...item.role_access, role];
    dispatch({ type: 'UPDATE_MENU', payload: { ...item, role_access: newRoles } });
  };

  const moveUp = (item: MenuItem) => {
    const sorted = [...state.menuConfig].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(m => m.id === item.id);
    if (idx > 0) {
      const prev = sorted[idx - 1];
      dispatch({ type: 'UPDATE_MENU', payload: { ...item, order: prev.order } });
      dispatch({ type: 'UPDATE_MENU', payload: { ...prev, order: item.order } });
    }
  };

  const moveDown = (item: MenuItem) => {
    const sorted = [...state.menuConfig].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(m => m.id === item.id);
    if (idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      dispatch({ type: 'UPDATE_MENU', payload: { ...item, order: next.order } });
      dispatch({ type: 'UPDATE_MENU', payload: { ...next, order: item.order } });
    }
  };

  const roles: UserRole[] = ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings size={24} className="text-gray-600" />Konfigurasi Menu ERP</h1>
        <p className="text-gray-500 mt-1">Atur urutan, visibilitas, dan akses peran untuk setiap modul — fleksibel sesuai kebutuhan</p>
      </div>

      {/* Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-indigo-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-indigo-800">ERP Fleksibel — Sesuaikan Kebutuhan</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Sistem ini dirancang modular. Anda dapat mengaktifkan/menonaktifkan modul, mengatur urutan menu, dan menentukan siapa yang bisa mengakses setiap fungsi.
              Modul mencakup: <strong>Stok Barang, Produksi, Penjualan, Pembelian, Akuntansi, Penggajian, Anggaran, OCR/Vision AI, WhatsApp, Audit Log</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Role Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Filter berdasarkan Peran</h3>
        <div className="flex gap-2 flex-wrap">
          {roles.map(role => (
            <button key={role} onClick={() => setSelectedRole(role)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRole === role ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {role}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Menampilkan {roleMenus.length} menu yang dapat diakses oleh <strong>{selectedRole}</strong>
        </p>
      </div>

      {/* Menu Configuration Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Daftar Modul & Pengaturan</h3>
          <span className="text-xs text-gray-500">{visibleMenus.length} aktif / {hiddenMenus.length} tersembunyi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-center px-4 py-3 font-medium text-gray-600 w-10">⋮⋮</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Modul</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Halaman</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Urutan</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Visibilitas</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Akses Peran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...state.menuConfig].sort((a, b) => a.order - b.order).map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 ${!item.visible ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-center text-gray-400 cursor-grab"><GripVertical size={16} /></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.page}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => moveUp(item)} className="p-1 hover:bg-gray-200 rounded"><ChevronUp size={14} /></button>
                      <span className="text-xs font-bold text-gray-600 w-6 text-center">{item.order}</span>
                      <button onClick={() => moveDown(item)} className="p-1 hover:bg-gray-200 rounded"><ChevronDown size={14} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleVisibility(item)}
                      className={`p-1.5 rounded-lg transition-colors ${item.visible ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                      {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {roles.map(role => (
                        <button key={role} onClick={() => toggleRoleAccess(item, role)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${item.role_access.includes(role) ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}
                          title={role}>
                          {item.role_access.includes(role) && <Check size={10} className="inline mr-0.5" />}
                          {role.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Preview Menu untuk Role: {selectedRole}</h3>
        <div className="flex flex-wrap gap-2">
          {roleMenus.map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-xs font-bold text-gray-400">{item.order}</span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Module Description */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Deskripsi Modul ERP</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'Stok Barang', desc: 'Inventori bahan baku, barang jadi, barang dagang — tracking stok masuk/keluar, peringatan stok menipis' },
            { name: 'Produksi', desc: 'SPK (Surat Perintah Kerja) — bahan baku, tenaga kerja, overhead, HPP per unit' },
            { name: 'Penjualan', desc: 'Invoice, tracking pembayaran, jatuh tempo, status lunas/DP/kredit' },
            { name: 'Pembelian', desc: 'Purchase Order, supplier, status bayar & terima barang, utang dagang' },
            { name: 'Akuntansi', desc: 'Buku Kas 3 lapisan, arsip bukti, pos kewajiban, rekonsiliasi otomatis' },
            { name: 'Penggajian', desc: 'Slip gaji — gaji pokok, tunjangan, lembur, potongan, PPh 21, gaji bersih' },
            { name: 'Anggaran', desc: 'Budget vs realisasi per kategori, progress bar, peringatan over budget' },
            { name: 'Arus Kas', desc: 'Cash flow operasional, investasi, pendanaan — saldo berjalan otomatis' },
            { name: 'OCR / Vision AI', desc: 'Scan foto kwitansi/nota → ekstrak data otomatis → auto-entry ke sistem' },
            { name: 'WhatsApp', desc: 'Auto-pencatatan via chat — NLP untuk input transaksi, reminder jatuh tempo' },
            { name: 'Audit Log', desc: 'Append-only log — setiap perubahan tercatat dengan alasan & sumber bukti' },
            { name: 'Konfigurasi Menu', desc: 'Atur urutan, visibilitas, dan hak akses per role — fleksibel sesuai kebutuhan' },
          ].map((mod, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{mod.name}</p>
              <p className="text-xs text-gray-600 mt-1">{mod.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
