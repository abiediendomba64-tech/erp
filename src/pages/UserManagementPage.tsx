import { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Edit, UserX, Shield, Save, X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { gasRpc, CloudUser } from '../lib/gasBridge';
import { useCloudAuth } from '../auth/CloudAuthGate';

type UserRole = CloudUser['role'];
interface ManagedUser {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}
interface UserForm {
  nama: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
}
const emptyForm: UserForm = { nama: '', email: '', role: 'VIEWER', status: 'active' };

const roleInfo: Record<UserRole, string> = {
  ADMIN: 'Mengatur pengguna dan semua modul ERP.',
  KEUANGAN: 'Mengelola pencatatan keuangan dan administrasi yang diizinkan server.',
  PROYEK: 'Mengelola data pekerjaan, RAB, QC, aset, dan unit yang diizinkan server.',
  VIEWER: 'Hanya membaca ringkasan/progress yang disaring backend.',
};

export default function UserManagementPage() {
  const { user, workspace } = useCloudAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await gasRpc<ManagedUser[]>('user.list', { workspaceId: workspace.id });
      setUsers(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Daftar pengguna gagal dimuat dari cloud.');
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const openEdit = (target: ManagedUser) => {
    setEditing(target);
    setForm({ nama: target.nama, email: target.email, role: target.role, status: target.status });
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nama.trim() || !form.email.trim()) {
      setError('Nama dan email Google wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await gasRpc<ManagedUser[]>('user.upsert', {
        workspaceId: workspace.id,
        nama: form.nama.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        status: form.status
      });
      setUsers(updated);
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setNotice('Data pengguna tersimpan di Google Sheets. Login memakai akun Google pada email terdaftar.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Perubahan pengguna gagal disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const disable = async (target: ManagedUser) => {
    if (target.email === user.email) {
      setError('Akun yang sedang dipakai tidak dapat dinonaktifkan dari sesi ini.');
      return;
    }
    if (!window.confirm('Nonaktifkan akses ' + target.email + '? Pengguna ini tidak dapat masuk lagi setelah sesi Google divalidasi ulang.')) return;
    setError('');
    setNotice('');
    try {
      await gasRpc('user.disable', { email: target.email });
      await loadUsers();
      setNotice('Akses pengguna dinonaktifkan di backend.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Akses pengguna gagal dinonaktifkan.');
    }
  };

  if (user.role !== 'ADMIN') {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">Menu Manajemen User hanya dapat diakses oleh Administrator. Backend tetap memeriksa role meskipun halaman dibuka secara langsung.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Users size={24} className="text-indigo-600" /> Manajemen User</h1>
          <p className="mt-1 text-sm text-slate-500">Workspace: {workspace.name}. Daftar ini dibaca dari Google Sheets, bukan seed lokal.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadUsers()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={16} /> Tambah user</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(roleInfo) as UserRole[]).map(role => (
          <div key={role} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"><Shield size={13} /> {role}</div>
            <p className="text-sm text-slate-600">{roleInfo[role]}</p>
          </div>
        ))}
      </div>

      {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-500"><Loader2 className="animate-spin" size={20} /> Mengambil data pengguna dari cloud…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Belum ada pengguna. Tambahkan email Google yang akan digunakan untuk login.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama / Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Login terakhir</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(target => (
                  <tr key={target.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{target.nama}</p><p className="text-xs text-slate-500">{target.email}</p></td>
                    <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">{target.role}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${target.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{target.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{target.lastLogin ? new Date(target.lastLogin).toLocaleString('id-ID') : 'Belum pernah'}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(target)} title="Edit user" className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"><Edit size={15} /></button>
                      {target.status === 'active' && <button onClick={() => void disable(target)} title="Nonaktifkan akses" className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50"><UserX size={15} /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Ubah pengguna' : 'Tambah pengguna'}</h2>
              <button onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium text-slate-700">Nama lengkap
                <input value={form.nama} onChange={event => setForm({ ...form, nama: event.target.value })} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="name" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Email akun Google
                <input value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} type="email" disabled={Boolean(editing)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" autoComplete="email" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Role
                <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value as UserRole })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="VIEWER">VIEWER — baca ringkasan/progress</option>
                  <option value="PROYEK">PROYEK — operasional lapangan</option>
                  <option value="KEUANGAN">KEUANGAN — transaksi &amp; laporan</option>
                  <option value="ADMIN">ADMIN — semua modul &amp; pengguna</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Status
                <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as 'active' | 'inactive' })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="active">Aktif</option><option value="inactive">Nonaktif</option>
                </select>
              </label>
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Pengguna harus masuk dengan akun Google yang emailnya sama persis. Password tidak disimpan di ERP. Hak akses divalidasi di backend pada setiap permintaan.</p>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <div className="flex gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => void save()} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan di cloud'}</button>
                <button onClick={() => setShowForm(false)} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
