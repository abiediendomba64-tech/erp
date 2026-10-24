import { useEffect, useState } from 'react';
import { Users, Plus, Edit, Shield, Save, X, RefreshCw, UserCheck, UserX } from 'lucide-react';
import {
  addCloudUser,
  listCloudUsers,
  addWorkspaceMember,
  type CloudManagedUser,
  type WorkspaceRole,
} from '../lib/googleWorkspaceApi';
import { getCloudWorkspaceSession } from '../lib/googleWorkspaceSync';

const roleOptions: WorkspaceRole[] = ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'];

export default function UserManagementPage() {
  const [users, setUsers] = useState<CloudManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'VIEWER' as WorkspaceRole,
    active: true,
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const session = getCloudWorkspaceSession();

  const loadUsers = async () => {
    if (!session) {
      setError('Manajemen pengguna cloud hanya tersedia setelah login melalui URL Apps Script resmi.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listCloudUsers(session.idToken, session.workspaceId);
      setUsers(result.users);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat pengguna dari backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  const resetForm = () => {
    setEditingEmail(null);
    setForm({ email: '', display_name: '', role: 'VIEWER', active: true });
    setShowForm(false);
  };

  const editUser = (user: CloudManagedUser) => {
    setEditingEmail(user.email);
    setForm({
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      active: user.active,
    });
    setMessage('');
    setError('');
    setShowForm(true);
  };

  const saveUser = async () => {
    if (!session) return;
    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Masukkan alamat email Google yang valid.');
      return;
    }
    if (form.display_name.trim().length > 100) {
      setError('Nama maksimal 100 karakter.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await addCloudUser(
        session.idToken,
        email,
        form.role,
        form.display_name.trim(),
        form.active,
      );
      if (form.active) {
        await addWorkspaceMember(
          session.idToken,
          session.workspaceId,
          email,
          form.role,
        );
      }
      setMessage(form.active
        ? 'Pengguna disimpan dan akses workspace disinkronkan.'
        : 'Pengguna dinonaktifkan di backend. Keanggotaan tersimpan untuk kebutuhan audit, tetapi login pengguna ditolak.');
      resetForm();
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan pengguna ke cloud.');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Users size={24} /> Manajemen User</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Halaman ini tidak memakai daftar user contoh. Buka ERP melalui login Google dan workspace cloud untuk mengelola akun sebenarnya.
        </div>
      </div>
    );
  }

  if (session.workspaceRole !== 'ADMIN') {
    return (
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Users size={24} /> Manajemen User</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Akses ditolak. Pengelolaan pengguna hanya tersedia untuk ADMIN workspace.
        </div>
      </div>
    );
  }

  const roleLabel = (role: WorkspaceRole) => {
    const labels: Record<WorkspaceRole, string> = {
      ADMIN: 'Admin penuh',
      KEUANGAN: 'Keuangan',
      PROYEK: 'Tim proyek',
      VIEWER: 'Lihat saja',
    };
    return labels[role];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users size={24} className="text-indigo-600" /> Manajemen User
          </h1>
          <p className="mt-1 text-sm text-slate-500">Daftar pengguna dan role aktual dari backend Google Apps Script.</p>
          <p className="mt-1 text-xs text-slate-500">Workspace: {session.workspaceName} · {session.workspaceId}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadUsers()} disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Muat ulang
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); setMessage(''); setError(''); }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus size={16} /> Tambah user
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roleOptions.map((role) => (
          <div key={role} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Shield size={16} /> {role}</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{roleLabel(role)}</p>
            <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
              {users.filter((user) => user.active && user.role === role).length}
            </p>
            <p className="text-xs text-slate-500">akun aktif</p>
          </div>
        ))}
      </div>

      {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingEmail ? 'Edit pengguna' : 'Tambah pengguna'}</h2>
            <button onClick={resetForm} aria-label="Tutup formulir" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Email Google *
              <input type="email" autoComplete="email" disabled={Boolean(editingEmail)} value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Nama tampilan
              <input type="text" maxLength={100} value={form.display_name}
                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Role
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as WorkspaceRole })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                {roleOptions.map((role) => <option key={role} value={role}>{role} — {roleLabel(role)}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-indigo-600" />
              <span>
                <span className="block font-medium">Akun aktif</span>
                <span className="block text-xs text-slate-500">Akun nonaktif akan ditolak saat login.</span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => void saveUser()} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50">
              <Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan ke cloud'}
            </button>
            <button onClick={resetForm} disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Pengguna</th>
                <th className="px-4 py-3 text-left font-semibold">Role akun</th>
                <th className="px-4 py-3 text-left font-semibold">Role workspace</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Memuat pengguna cloud…</td></tr>}
              {!loading && users.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Belum ada pengguna terdaftar. Tambahkan email Google yang benar-benar digunakan.</td></tr>}
              {!loading && users.map((user) => (
                <tr key={user.email} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{user.display_name || '—'}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{user.role}</span></td>
                  <td className="px-4 py-3 text-slate-600">{user.workspace_role || <span className="text-amber-700">Belum ditambahkan</span>}</td>
                  <td className="px-4 py-3">
                    <span className={\`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold \${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}\`}>
                      {user.active ? <UserCheck size={13} /> : <UserX size={13} />}
                      {user.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => editUser(user)} title="Edit pengguna" className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
                      <Edit size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Pengguna tidak dihapus agar jejak audit tetap dapat ditelusuri. Untuk memutus akses, nonaktifkan akun. Hak akses diverifikasi kembali oleh backend setiap pemanggilan data.
      </p>
    </div>
  );
}
