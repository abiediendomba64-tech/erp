import { useAppContext } from '../store';
import { Settings, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Shield, Check } from 'lucide-react';
import { useState } from 'react';
import { UserRole } from '../types';

export default function MenuConfigPage() {
  const { state, dispatch } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const roles: UserRole[] = ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'];

  const toggleVisibility = (item: any) => {
    dispatch({ type: 'UPDATE_MENU', payload: { ...item, visible: !item.visible } });
  };

  const toggleRoleAccess = (item: any, role: UserRole) => {
    const newRoles = item.role_access.includes(role)
      ? item.role_access.filter((r: UserRole) => r !== role)
      : [...item.role_access, role];
    dispatch({ type: 'UPDATE_MENU', payload: { ...item, role_access: newRoles } });
  };

  const moveUp = (item: any) => {
    const sorted = [...state.menuConfig].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(m => m.id === item.id);
    if (idx > 0) {
      const prev = sorted[idx - 1];
      dispatch({ type: 'UPDATE_MENU', payload: { ...item, order: prev.order } });
      dispatch({ type: 'UPDATE_MENU', payload: { ...prev, order: item.order } });
    }
  };

  const moveDown = (item: any) => {
    const sorted = [...state.menuConfig].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(m => m.id === item.id);
    if (idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      dispatch({ type: 'UPDATE_MENU', payload: { ...item, order: next.order } });
      dispatch({ type: 'UPDATE_MENU', payload: { ...next, order: item.order } });
    }
  };

  const visibleMenus = state.menuConfig.filter(m => m.visible);
  const hiddenMenus = state.menuConfig.filter(m => !m.visible);
  const roleMenus = state.menuConfig.filter(m => m.role_access.includes(selectedRole)).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings size={24} className="text-gray-600" />Konfigurasi Menu ERP</h1><p className="text-gray-500 mt-1">Atur urutan, visibilitas, dan akses peran untuk setiap modul — fleksibel sesuai kebutuhan</p></div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-indigo-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-indigo-800">ERP Fleksibel — Sesuaikan Kebutuhan</h3>
            <p className="text-sm text-indigo-700 mt-1">Sistem modular: Stok, Produksi, Penjualan, Pembelian, Akuntansi, Penggajian, Anggaran, OCR/Vision AI, WhatsApp, Audit Log. Atur visibilitas dan hak akses per role.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Filter berdasarkan Peran</h3>
        <div className="flex gap-2 flex-wrap">
          {roles.map(role => (
            <button key={role} onClick={() => setSelectedRole(role)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRole === role ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{role}</button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Menampilkan {roleMenus.length} menu yang dapat diakses oleh <strong>{selectedRole}</strong></p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Daftar Modul & Pengaturan</h3>
          <span className="text-xs text-gray-500">{visibleMenus.length} aktif / {hiddenMenus.length} tersembunyi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="text-center px-4 py-3 font-medium text-gray-600 w-10">⋮⋮</th><th className="text-left px-4 py-3 font-medium text-gray-600">Modul</th><th className="text-left px-4 py-3 font-medium text-gray-600">Halaman</th><th className="text-center px-4 py-3 font-medium text-gray-600">Urutan</th><th className="text-center px-4 py-3 font-medium text-gray-600">Visibilitas</th><th className="text-center px-4 py-3 font-medium text-gray-600">Akses Peran</th></tr>
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
                    <button onClick={() => toggleVisibility(item)} className={`p-1.5 rounded-lg transition-colors ${item.visible ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{item.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {roles.map(role => (
                        <button key={role} onClick={() => toggleRoleAccess(item, role)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${item.role_access.includes(role) ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>{item.role_access.includes(role) && <Check size={10} className="inline mr-0.5" />}{role.slice(0, 3)}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
