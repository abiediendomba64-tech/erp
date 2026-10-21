import { useState } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Eye, Save, X } from 'lucide-react';
import { UserRole } from '../types';

interface User {
  id: string;
  nama: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

const initialUsers: User[] = [
  { id: 'U-001', nama: 'Administrator', email: 'admin@proyek.com', phone: '081234567890', role: 'ADMIN', status: 'active', createdAt: '2026-01-01', lastLogin: '2026-10-21' },
  { id: 'U-002', nama: 'Keuangan', email: 'keuangan@proyek.com', phone: '081234567891', role: 'KEUANGAN', status: 'active', createdAt: '2026-01-01', lastLogin: '2026-10-20' },
  { id: 'U-003', nama: 'Proyek Manager', email: 'proyek@proyek.com', phone: '081234567892', role: 'PROYEK', status: 'active', createdAt: '2026-01-01', lastLogin: '2026-10-19' },
  { id: 'U-004', nama: 'Viewer Client', email: 'client@proyek.com', phone: '081234567893', role: 'VIEWER', status: 'active', createdAt: '2026-06-01', lastLogin: '2026-10-15' },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    role: 'VIEWER',
    status: 'active'
  });

  const handleSave = () => {
    if (editingUser) {
      // Update
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } as User : u));
    } else {
      // Create
      const newUser: User = {
        id: `U-${String(users.length + 1).padStart(3, '0')}`,
        nama: formData.nama || '',
        email: formData.email || '',
        phone: formData.phone || '',
        role: formData.role as UserRole,
        status: formData.status as 'active' | 'inactive',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers([...users, newUser]);
    }
    setShowForm(false);
    setEditingUser(null);
    setFormData({ role: 'VIEWER', status: 'active' });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData(user);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin hapus user ini?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const roleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'KEUANGAN': return 'bg-blue-100 text-blue-800';
      case 'PROYEK': return 'bg-emerald-100 text-emerald-800';
      case 'VIEWER': return 'bg-gray-100 text-gray-800';
    }
  };

  const rolePermissions: Record<UserRole, string[]> = {
    'ADMIN': ['Semua akses', 'Kelola user', 'Konfigurasi sistem', 'Approve transaksi', 'Export data'],
    'KEUANGAN': ['Buku kas', 'Arsip bukti', 'Utang', 'Laporan keuangan', 'Export data'],
    'PROYEK': ['Register tanah', 'Beko', 'Stok', 'Produksi', 'Laporan proyek'],
    'VIEWER': ['Dashboard (read-only)', 'Progress tanah', 'Progress beko'],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-indigo-500" />
            Manajemen User
          </h1>
          <p className="text-gray-500 mt-1">Tambah, edit, hapus user dan atur hak akses</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingUser(null); setFormData({ role: 'VIEWER', status: 'active' }); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus size={18} /> Tambah User
        </button>
      </div>

      {/* Role Permissions Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield size={18} className="text-indigo-500" />
          Hak Akses per Role
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(rolePermissions) as UserRole[]).map(role => (
            <div key={role} className="p-3 bg-gray-50 rounded-lg">
              <div className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${roleColor(role)}`}>
                {role}
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                {rolePermissions[role].map((perm, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-emerald-500">✓</span> {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Tambah User Baru'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingUser(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.nama || ''}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Nama lengkap user"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="email@domain.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">No. WhatsApp *</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="081234567890"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ADMIN">ADMIN - Full Access</option>
                  <option value="KEUANGAN">KEUANGAN - Keuangan & Laporan</option>
                  <option value="PROYEK">PROYEK - Lapangan & Stok</option>
                  <option value="VIEWER">VIEWER - Read Only</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Simpan
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingUser(null); }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">WhatsApp</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{user.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.nama}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                      {user.status === 'active' ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{user.lastLogin || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Catatan:</strong> Saat ini user management masih disimpan di browser (localStorage). 
          Untuk produksi, perlu backend API dengan database dan authentication yang proper.
        </p>
      </div>
    </div>
  );
}
