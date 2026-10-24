import { FormEvent, useEffect, useState } from 'react';
import { Users, Plus, Pencil, Shield, Save, X, RefreshCw, AlertCircle, CheckCircle2, UserCheck, UserX } from 'lucide-react';
import type { UserRole } from '../types';
import { getActiveWorkspaceId, googleErpApi } from '../lib/googleErpApi';

interface ManagedUser {
  id: string;
  nama: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}
type UserDraft = Pick<ManagedUser, 'nama' | 'email' | 'phone' | 'role' | 'status'>;

const blankDraft: UserDraft = {
  nama: '', email: '', phone: '',
  role: 'VIEWER', status: 'active',
};

const roles: { value: UserRole; label: string; detail: string }[] = [
  { value: 'ADMIN', label: 'Admin', detail: 'Master, konfigurasi, pengguna, seluruh modul' },
  { value: 'KEUANGAN', label: 'Keuangan', detail: 'Buku kas, bukti, kewajiban, jurnal dan laporan' },
  { value: 'PROYEK', label: 'Tim proyek', detail: 'Tanah, beko, stok, pembelian, QC, unit dan progres' },
  { value: 'VIEWER', label: 'Pemilik / Viewer', detail: 'Ringkasan dan progres read-only' },
];

function explain(error: unknown) {
  return error instanceof Error ? error.message : 'Permintaan pengguna gagal.';
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft>(blankDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await googleErpApi<{ users: ManagedUser[] }>('users.list');
      setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (failure) {
      setError(explain(failure));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  const startAdd = () => {
    setEditingEmail(null);
    setDraft(blankDraft);
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const startEdit = (user: ManagedUser) => {
    setEditingEmail(user.email);
    setDraft({
      nama: user.nama,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
    });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const email = draft.email.trim().toLowerCase();
    if (!draft.nama.trim()) return setError('Nama pengguna wajib diisi.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Alamat email tidak valid.');
    if (!draft.phone.trim()) return setError('Nomor WhatsApp wajib diisi agar staf mudah dihubungi.');

    setSaving(true);
    try {
      const result = await googleErpApi<{ user: ManagedUser }>('users.upsert', {
        user: { ...draft, email, nama: draft.nama.trim(), phone: draft.phone.trim() },
      });
      const workspaceId = getActiveWorkspaceId();
      if (workspaceId && draft.status === 'active') {
        await googleErpApi('workspace.member.add', {
          workspaceId,
          email,
          role: draft.role,
        });
      }
      setMessage(editingEmail
        ? 'Data pengguna diperbarui pada Google Sheets. Perubahan izin berlaku saat permintaan berikutnya.'
        : 'Pengguna ditambahkan ke daftar akses dan workspace aktif. Orang tersebut harus login memakai akun Google dengan email yang sama.');
      setShowForm(false);
      setEditingEmail(null);
      setDraft(blankDraft);
      await loadUsers();
      if (!result.user) throw new Error('Backend tidak mengembalikan data pengguna setelah penyimpanan.');
    } catch (failure) {
      setError(explain(failure));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: ManagedUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = nextStatus === 'inactive' ? 'nonaktifkan' : 'aktifkan kembali';
    if (!window.confirm(`Yakin ${action} akun ${user.email}?`)) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await googleErpApi('users.upsert', {
        user: {
          email: user.email, nama: user.nama, phone: user.phone,
          role: user.role, status: nextStatus,
        },
      });
      if (nextStatus === 'active') {
        const workspaceId = getActiveWorkspaceId();
        if (workspaceId) await googleErpApi('workspace.member.add', { workspaceId, email: user.email, role: user.role });
      }
      setMessage(`Akun ${user.email} sekarang ${nextStatus === 'active' ? 'aktif' : 'nonaktif'}.`);
      await loadUsers();
    } catch (failure) {
      setError(explain(failure));
    } finally {
      setSaving(false);
    }
  };

  const roleColor: Record<UserRole, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    KEUANGAN: 'bg-blue-100 text-blue-800',
    PROYEK: 'bg-emerald-100 text-emerald-800',
    VIEWER: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Users size={24} className="text-indigo-600" />Manajemen User</h1>
          <p className="mt-1 text-sm text-gray-500">Pengguna, status dan hak akses diatur server lewat Google Apps Script, bukan daftar contoh di browser.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadUsers()} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} />Muat ulang</button>
          <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus size={17} />Tambah user</button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
      {message && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0" />{message}</div>}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><Shield size={18} className="text-indigo-600" />Hak akses per role</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {roles.map(role => (
            <div key={role.value} className="rounded-lg bg-gray-50 p-3">
              <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${roleColor[role.value]}`}>{role.label}</span>
              <p className="mt-2 text-sm font-medium">{role.value}</p>
              <p className="mt-1 text-xs leading-5 text-gray-600">{role.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {showForm && <form onSubmit={saveUser} className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingEmail ? 'Ubah pengguna' : 'Tambah pengguna baru'}</h2><button type="button" onClick={() => setShowForm(false)} aria-label="Tutup form" className="rounded p-1 hover:bg-gray-100"><X size={18} /></button></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Nama lengkap *
            <input value={draft.nama} onChange={e => setDraft({ ...draft, nama: e.target.value })} maxLength={100} className="mt-1 w-full rounded-lg border px-3 py-2" required />
          </label>
          <label className="text-sm font-medium">Email Google *
            <input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} disabled={Boolean(editingEmail)} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100" required />
          </label>
          <label className="text-sm font-medium">Nomor WhatsApp *
            <input type="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} maxLength={40} className="mt-1 w-full rounded-lg border px-3 py-2" required />
          </label>
          <label className="text-sm font-medium">Role *
            <select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as UserRole })} className="mt-1 w-full rounded-lg border px-3 py-2">
              {roles.map(role => <option key={role.value} value={role.value}>{role.value} — {role.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Status akun
            <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as UserDraft['status'] })} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="active">Aktif</option><option value="inactive">Nonaktif</option>
            </select>
          </label>
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Pengguna wajib masuk memakai Google dengan email yang sama. Sistem tidak membuat atau mengirim password. Folder Google Drive harus dibagikan secara terpisah sesuai hak akses dokumen.</p>
        <div className="mt-4 flex gap-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"><Save size={16} />{saving ? 'Menyimpan…' : 'Simpan user'}</button><button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm">Batal</button></div>
      </form>}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Daftar pengguna ({users.length})</h2></div>
        {loading ? <div className="p-8 text-center text-gray-500">Mengambil data dari Google Sheets…</div> : users.length === 0 ? <div className="p-8 text-center text-gray-500">Belum ada pengguna selain akun Admin pertama.</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">Nama / email</th><th className="p-3">WhatsApp</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Dibuat</th><th className="p-3">Aksi</th></tr></thead>
            <tbody className="divide-y">{users.map(user => (
              <tr key={user.email} className="hover:bg-gray-50">
                <td className="p-3"><div className="font-medium text-gray-900">{user.nama}</div><div className="mt-1 text-xs text-gray-500">{user.email}</div></td>
                <td className="p-3">{user.phone || '—'}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${roleColor[user.role]}`}>{user.role}</span></td>
                <td className="p-3"><span className={user.status === 'active' ? 'text-emerald-700' : 'text-gray-500'}>{user.status === 'active' ? '● Aktif' : '○ Nonaktif'}</span></td>
                <td className="p-3 text-xs text-gray-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '—'}</td>
                <td className="p-3"><div className="flex gap-2">
                  <button disabled={saving} onClick={() => startEdit(user)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"><Pencil size={13} />Edit</button>
                  <button disabled={saving} onClick={() => void toggleStatus(user)} className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs disabled:opacity-50 ${user.status === 'active' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{user.status === 'active' ? <><UserX size={13} />Nonaktifkan</> : <><UserCheck size={13} />Aktifkan</>}</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
