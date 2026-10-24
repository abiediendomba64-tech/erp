import { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Edit, Shield, Save, X, RefreshCw, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';
import { callGoogleBackend, getSessionToken } from '../lib/googleBackend';

interface User {
  id: string;
  nama: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  last_login: string;
  google_sub_linked: boolean;
}

const emptyForm = (): Partial<User> => ({ role: 'VIEWER', status: 'ACTIVE', nama: '', email: '', phone: '' });

const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: ['Semua modul', 'Kelola pengguna', 'Pengaturan backend', 'Persetujuan dan audit'],
  KEUANGAN: ['Buku kas dan bukti', 'Anggaran dan pembayaran', 'Jurnal dan laporan keuangan'],
  PROYEK: ['Register tanah dan beko', 'Stok dan produksi', 'QC dan unit perumahan'],
  VIEWER: ['Dashboard', 'Progress tanah dan beko', 'Tanpa izin mengubah data'],
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callGoogleBackend<{ users: User[] }>({
        action: 'admin.users.list',
        sessionToken: getSessionToken(),
      });
      setUsers(result.users.map(user => ({ ...user, id: user.email })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Daftar pengguna gagal dimuat dari cloud.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const openCreate = () => {
    setEditingEmail(null);
    setFormData(emptyForm());
    setShowForm(true);
    setError('');
    setNotice('');
  };

  const openEdit = (user: User) => {
    setEditingEmail(user.email);
    setFormData({ ...user });
    setShowForm(true);
    setError('');
    setNotice('');
  };

  const handleSave = async () => {
    const email = String(formData.email || '').trim().toLowerCase();
    const nama = String(formData.nama || '').trim();
    if (!email || !nama) {
      setError('Nama dan email wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await callGoogleBackend<{ saved: boolean; invited?: boolean }>({
        action: 'admin.users.save',
        sessionToken: getSessionToken(),
        user: {
          email,
          nama,
          phone: String(formData.phone || '').trim(),
          role: formData.role || 'VIEWER',
          status: formData.status || 'ACTIVE',
        },
      });
      if (!result.saved) throw new Error('Backend tidak mengonfirmasi penyimpanan pengguna.');
      setShowForm(false);
      setEditingEmail(null);
      setFormData(emptyForm());
      setNotice(result.invited
        ? 'Undangan akses disimpan. Pengguna dapat login dengan akun Google yang alamat emailnya sama.'
        : 'Perubahan pengguna tersimpan di database cloud.');
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pengguna gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!window.confirm('Nonaktifkan akses ' + user.email + '? Riwayat tetap disimpan dan pengguna tidak dapat login.')) return;
    setError('');
    setNotice('');
    try {
      await callGoogleBackend({
        action: 'admin.users.save',
        sessionToken: getSessionToken(),
        user: { email: user.email, nama: user.nama, phone: user.phone, role: user.role, status: 'INACTIVE' },
      });
      setNotice('Akses pengguna dinonaktifkan pada server.');
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Akses pengguna gagal dinonaktifkan.');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Users size={24} className="text-indigo-500" /> Manajemen Pengguna</h1>
          <p className="mt-1 text-sm text-gray-500">Daftar dan role dibaca dari Google Sheets server; bukan data contoh pada browser.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadUsers()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"><RefreshCw size={16} /> Segarkan</button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={18} /> Tambah pengguna</button>
        </div>
      </div>

      {error && <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={18} />{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><Shield size={18} className="text-indigo-500" /> Hak akses server per role</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(rolePermissions) as UserRole[]).map(role => (
            <div key={role} className="rounded-lg bg-gray-50 p-3">
              <span className={`mb-2 inline-block rounded px-2 py-1 text-xs font-bold ${roleColor(role)}`}>{role}</span>
              <ul className="space-y-1 text-xs text-gray-600">
                {rolePermissions[role].map(permission => <li key={permission}>• {permission}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">{editingEmail ? 'Edit pengguna' : 'Daftarkan pengguna'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium text-gray-700">Nama lengkap
                <input value={formData.nama || ''} onChange={e => setFormData({ ...formData, nama: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" maxLength={100} required />
              </label>
              <label className="block text-sm font-medium text-gray-700">Email akun Google
                <input type="email" value={formData.email || ''} disabled={Boolean(editingEmail)} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100" maxLength={254} required />
              </label>
              <label className="block text-sm font-medium text-gray-700">Nomor WhatsApp (opsional)
                <input type="tel" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" maxLength={30} />
              </label>
              <label className="block text-sm font-medium text-gray-700">Role
                <select value={formData.role || 'VIEWER'} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="ADMIN">ADMIN — penuh</option>
                  <option value="KEUANGAN">KEUANGAN — transaksi & laporan</option>
                  <option value="PROYEK">PROYEK — lapangan & konstruksi</option>
                  <option value="VIEWER">VIEWER — baca saja</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">Status akses
                <select value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </label>
              {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
              <div className="flex gap-2 border-t border-gray-200 pt-4">
                <button onClick={() => void handleSave()} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Save size={17} /> {saving ? 'Menyimpan…' : 'Simpan ke cloud'}</button>
                <button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">WhatsApp</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Google tertaut</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat daftar pengguna cloud…</td></tr>}
              {!loading && users.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Belum ada pengguna tambahan. Gunakan “Tambah pengguna”.</td></tr>}
              {!loading && users.map(user => (
                <tr key={user.email} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{user.email}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.nama}</td>
                  <td className="px-4 py-3 text-gray-600">{user.phone || '—'}</td>
                  <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-medium ${roleColor(user.role)}`}>{user.role}</span></td>
                  <td className="px-4 py-3 text-center"><span className={user.status === 'ACTIVE' ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800' : 'rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'}>{user.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="px-4 py-3 text-center text-xs">{user.google_sub_linked ? 'Ya' : 'Menunggu login'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEdit(user)} title="Edit" className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50"><Edit size={16} /></button>
                      {user.status === 'ACTIVE' && <button onClick={() => void handleDeactivate(user)} title="Nonaktifkan" className="rounded p-1.5 text-rose-600 hover:bg-rose-50">Nonaktifkan</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
