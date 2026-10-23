import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Shield, UserPlus, Users, Copy, CheckCircle2 } from 'lucide-react';
import { addWorkspaceMember, getCurrentSessionInfo, listWorkspaceMembers, updateWorkspaceMemberRole } from '../lib/workspaceBackend';
import type { WorkspaceMember } from '../lib/workspaceBackend';

type EditableRole = 'admin' | 'editor' | 'viewer';

export default function UserManagementPage({
  workspaceId,
  workspaceName,
  canManageUsers,
}: {
  workspaceId: string;
  workspaceName: string;
  canManageUsers: boolean;
}) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myUid, setMyUid] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [roles, setRoles] = useState<Record<string, EditableRole>>({});
  const [uidInput, setUidInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [newRole, setNewRole] = useState<EditableRole>('viewer');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, current] = await Promise.all([
        listWorkspaceMembers(workspaceId),
        getCurrentSessionInfo(),
      ]);
      setMembers(rows);
      setMyUid(current.uid);
      setMyEmail(current.email);
      setRoles(Object.fromEntries(rows.map(row => [row.uid, row.role === 'owner' ? 'viewer' : row.role])));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Daftar anggota gagal dimuat dari Firestore.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(myUid);
      setNotice('Firebase UID berhasil disalin. Kirim UID ini kepada pemilik workspace untuk ditambahkan.');
    } catch {
      setNotice(`Salin UID akun ini secara manual: ${myUid}`);
    }
  }

  async function addMember() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await addWorkspaceMember(workspaceId, workspaceName, uidInput, emailInput, newRole);
      setUidInput('');
      setEmailInput('');
      setNotice('Keanggotaan ditulis ke Firestore. Anggota harus memuat ulang daftar workspace untuk melihat akses baru.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Anggota tidak dapat ditambahkan.');
    } finally {
      setBusy(false);
    }
  }

  async function saveRole(uid: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await updateWorkspaceMemberRole(workspaceId, workspaceName, uid, roles[uid] || 'viewer');
      setNotice('Role anggota diperbarui di Firestore.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Role tidak dapat diperbarui.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Users size={24} className="text-indigo-600" />Anggota Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Daftar dan role dibaca langsung dari Firebase Firestore — bukan data contoh browser.</p>
        </div>
        <button disabled={loading || busy} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} />Muat ulang</button>
      </div>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 text-indigo-700" size={20} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-indigo-950">Akun aktif: {myEmail || 'Memuat…'}</p>
            <p className="mt-1 text-xs text-indigo-800">Firebase UID (bukan kata sandi/token):</p>
            <code className="mt-1 block break-all text-xs text-indigo-950">{myUid || 'Memuat UID…'}</code>
            <button disabled={!myUid} onClick={() => void copyUid()} className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Copy size={13} />Salin UID</button>
          </div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {canManageUsers && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><UserPlus size={18} />Tambah anggota yang sudah memiliki akun Firebase</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Firebase UID
              <input value={uidInput} onChange={e => setUidInput(e.target.value)} placeholder="UID anggota, bukan email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
            <label className="text-sm font-medium text-slate-700">Email anggota
              <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="nama@perusahaan.co.id" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
            <label className="text-sm font-medium text-slate-700">Role
              <select value={newRole} onChange={e => setNewRole(e.target.value as EditableRole)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="viewer">Viewer — baca</option>
                <option value="editor">Editor — baca/tulis</option>
                <option value="admin">Admin — baca/tulis</option>
              </select>
            </label>
            <div className="flex items-end">
              <button disabled={busy || !uidInput.trim() || !emailInput.trim()} onClick={() => void addMember()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><UserPlus size={16} />Tambahkan ke cloud</button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Pemilik workspace harus memasukkan UID akun anggota yang sudah dibuat. Role dan membership diverifikasi oleh Firestore Rules; proses ini tidak membuat akun Firebase baru dan tidak mengirim undangan email.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Anggota terdaftar</h2>
          <span className="text-xs text-slate-500">{loading ? 'Memuat…' : `${members.length} anggota`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600"><tr>
              <th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">Firebase UID</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && members.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Tidak ada anggota atau akses database ditolak.</td></tr>}
              {members.map(member => (
                <tr key={member.uid}>
                  <td className="px-4 py-3 text-slate-800">{member.email || '—'}{member.uid === myUid && <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-800">Anda</span>}</td>
                  <td className="px-4 py-3"><code className="break-all text-xs text-slate-500">{member.uid}</code></td>
                  <td className="px-4 py-3">
                    {canManageUsers && member.role !== 'owner'
                      ? <select value={roles[member.uid] || 'viewer'} onChange={e => setRoles(prev => ({ ...prev, [member.uid]: e.target.value as EditableRole }))} className="rounded border border-slate-300 px-2 py-1 text-xs">
                          <option value="viewer">viewer</option><option value="editor">editor</option><option value="admin">admin</option>
                        </select>
                      : <span className={`rounded-full px-2 py-1 text-xs font-medium ${member.role === 'owner' ? 'bg-indigo-100 text-indigo-800' : member.role === 'viewer' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>{member.role}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {canManageUsers && member.role !== 'owner' && roles[member.uid] !== member.role
                      ? <button disabled={busy} onClick={() => void saveRole(member.uid)} className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 size={13} />Simpan</button>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {!canManageUsers && <p className="text-xs text-slate-500">Mode baca saja. Hanya owner workspace dapat mengubah keanggotaan; hak ini juga diperiksa ulang oleh Firestore Rules.</p>}
      {canManageUsers && <p className="text-xs text-slate-500">Penghapusan/revokasi anggota sengaja belum diaktifkan; penghapusan akun Auth dan pencabutan semua sesi memerlukan prosedur administrasi backend tambahan.</p>}
    </div>
  );
}
