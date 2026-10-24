import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Users, Plus, Edit, Shield, Save, X, RefreshCw, UserCheck, UserX } from 'lucide-react';
import type { UserRole } from '../types';
import { callGoogleAppsScript } from '../lib/googleAppsScriptBridge';

interface CloudUserRow {
  id: string;
  nama?: string;
  name?: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'active' | 'inactive';
  createdAt?: string;
  lastLogin?: string;
}

type UserForm = { name: string; email: string; phone: string; role: UserRole; password: string };

const emptyForm: UserForm = { name: '', email: '', phone: '', role: 'VIEWER', password: '' };

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  KEUANGAN: 'Keuangan',
  PROYEK: 'Tim Proyek',
  VIEWER: 'Viewer / Klien'
};

const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: ['Semua modul', 'Kelola akun dan role', 'Persetujuan serta konfigurasi'],
  KEUANGAN: ['Buku kas dan bukti', 'Utang dan anggaran', 'Akuntansi serta laporan'],
  PROYEK: ['Register tanah dan beko', 'Stok, pembelian, produksi', 'QC serta master unit'],
  VIEWER: ['Dashboard ringkasan', 'Progress tanah teredaksi', 'Progress beko teredaksi']
};

function normalizeUser(user: CloudUserRow): CloudUserRow {
  return {
    ...user,
    name: user.name || user.nama || '',
    status: String(user.status).toUpperCase() as CloudUserRow['status']
  };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<CloudUserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<CloudUserRow | null>(null);
  const [formData, setFormData] = useState<UserForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async () => {
    const token = window.sessionStorage.getItem('erp_session_token') || '';
    if (!token) throw new Error('Sesi administrator tidak ditemukan. Login ulang.');
    const response = await callGoogleAppsScript<{
      success: boolean; users?: CloudUserRow[]; error?: string
    }>('apiListUsers', token);
    if (!response.success || !Array.isArray(response.users)) {
      throw new Error(response.error || 'Daftar user dari cloud tidak dapat dimuat.');
    }
    setUsers(response.users.map(normalizeUser));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadUsers().catch(loadError => {
      if (mounted) setError(loadError instanceof Error ? loadError.message : String(loadError));
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [loadUsers]);

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData(emptyForm);
  };

  const handleEdit = (user: CloudUserRow) => {
    setEditingUser(user);
    setFormData({
      name: user.name || user.nama || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: ''
    });
    setShowForm(true);
    setError('');
    setMessage('');
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const token = window.sessionStorage.getItem('erp_session_token') || '';
      if (!token) throw new Error('Sesi administrator tidak ditemukan. Login ulang.');
      let response: { success: boolean; error?: string };
      if (editingUser) {
        response = await callGoogleAppsScript('apiUpdateUser', token, editingUser.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          role: formData.role
        });
      } else {
        if (formData.password.length < 12) throw new Error('Kata sandi user baru minimal 12 karakter.');
        response = await callGoogleAppsScript('apiCreateUser', token, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          password: formData.password
        });
      }
      if (!response.success) throw new Error(response.error || 'Server menolak perubahan user.');
      await loadUsers();
      setMessage(editingUser ? 'Perubahan user tersimpan di cloud.' : 'User baru dibuat di cloud.');
      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: CloudUserRow) => {
    const nextStatus = String(user.status).toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMessage = nextStatus === 'INACTIVE'
      ? 'Nonaktifkan akun ini? Sesi aktif akun tersebut akan dicabut.'
      : 'Aktifkan kembali akun ini?';
    if (!window.confirm(confirmMessage)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const token = window.sessionStorage.getItem('erp_session_token') || '';
      const response = await callGoogleAppsScript<{ success: boolean; error?: string }>(
        'apiSetUserStatus', token, user.id, nextStatus
      );
      if (!response.success) throw new Error(response.error || 'Server menolak perubahan status.');
      await loadUsers();
      setMessage('Status akun diperbarui di cloud.');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : String(statusError));
    } finally {
      setSaving(false);
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
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Users size={24} className="text-indigo-500" />Manajemen User</h1>
          <p className="mt-1 text-gray-500">Akun, role, serta status dibaca dan disimpan di Google Sheets melalui backend terautentikasi.</p>
        </div>
        <div className="flex gap-2">
          <button disabled={loading || saving} onClick={() => { setLoading(true); loadUsers().catch(e => setError(String(e))).finally(() => setLoading(false)); }} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"><RefreshCw size={16} />Muat Ulang</button>
          <button onClick={() => { setEditingUser(null); setFormData(emptyForm); setShowForm(true); setError(''); setMessage(''); }} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"><Plus size={18} />Tambah User</button>
        </div>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><Shield size={18} className="text-indigo-500" />Akses berdasarkan role</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(rolePermissions) as UserRole[]).map(role => (
            <div key={role} className="rounded-lg bg-gray-50 p-3">
              <span className={`mb-2 inline-block rounded px-2 py-1 text-xs font-bold ${roleColor(role)}`}>{roleLabels[role]}</span>
              <ul className="space-y-1 text-xs text-gray-600">{rolePermissions[role].map(item => <li key={item}>• {item}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      {showForm && (
        <form onSubmit={handleSave} className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editingUser ? 'Ubah User' : 'Buat User Baru'}</h2>
            <button type="button" onClick={closeForm} className="rounded p-2 hover:bg-gray-100" aria-label="Tutup"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">Nama Lengkap *
              <input required minLength={2} maxLength={100} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            {!editingUser && <label className="text-sm font-medium text-gray-700">Email *
              <input required type="email" autoComplete="username" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>}
            <label className="text-sm font-medium text-gray-700">No. WhatsApp / Telepon
              <input type="tel" maxLength={40} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Role *
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="mt-1 w-full rounded-lg border px-3 py-2">
                <option value="ADMIN">ADMIN — Administrator</option>
                <option value="KEUANGAN">KEUANGAN — Keuangan</option>
                <option value="PROYEK">PROYEK — Tim Proyek</option>
                <option value="VIEWER">VIEWER — Viewer / Klien</option>
              </select>
            </label>
            {!editingUser && <label className="text-sm font-medium text-gray-700">Kata sandi sementara * (min. 12 karakter)
              <input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>}
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"><Save size={17} />{saving ? 'Menyimpan…' : 'Simpan ke Cloud'}</button>
            <button type="button" onClick={closeForm} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700">Batal</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Daftar akun {loading ? '(memuat…)' : `(${users.length})`}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Kontak</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Login terakhir</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{user.name || user.nama || '—'}</p><p className="mt-1 font-mono text-xs text-gray-500">{user.id}</p><p className="text-xs text-gray-600">{user.email}</p></td>
                  <td className="px-4 py-3 text-gray-600">{user.phone || '—'}</td>
                  <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-medium ${roleColor(user.role)}`}>{user.role}</span></td>
                  <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs ${String(user.status).toUpperCase() === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{String(user.status).toUpperCase() === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{user.lastLogin || 'Belum pernah login'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(user)} title="Ubah user" className="rounded border p-2 text-blue-700 hover:bg-blue-50"><Edit size={15} /></button>
                      <button disabled={saving} onClick={() => void toggleStatus(user)} title={String(user.status).toUpperCase() === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'} className="rounded border p-2 text-slate-700 hover:bg-gray-100 disabled:opacity-60">{String(user.status).toUpperCase() === 'ACTIVE' ? <UserX size={15} /> : <UserCheck size={15} />}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">Belum ada akun yang dapat ditampilkan dari backend.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-gray-500">Perubahan role dan status divalidasi server. Pengguna yang dinonaktifkan tidak dapat memakai sesi lama. Audit perubahan akun disimpan dalam sheet BACKEND_AUDIT.</p>
    </div>
  );
}
