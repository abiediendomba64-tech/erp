import { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { gasRpc } from '../lib/gasBridge';
import { useCloudAuth } from '../auth/CloudAuthGate';

interface CloudAuditRecord {
  id: string;
  timestamp: string;
  user: string;
  aksi: string;
  tabel: string;
  record_id: string;
  nilai_lama: string;
  nilai_baru: string;
  alasan: string;
  workspace_id: string;
  actor_email: string;
  slice: string;
  changed_keys: string;
  version_before: string | number;
  version_after: string | number;
}

export default function AuditLogPage() {
  const { user, workspace } = useCloudAuth();
  const [records, setRecords] = useState<CloudAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await gasRpc<CloudAuditRecord[]>('audit.list', { workspaceId: workspace.id, limit: 200 });
      setRecords(Array.isArray(data) ? data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audit log cloud gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => { void load(); }, [load]);

  if (!['ADMIN', 'KEUANGAN'].includes(user.role)) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">Audit log hanya dapat dibaca oleh Admin dan Keuangan. Backend memeriksa izin ini untuk setiap permintaan.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><History size={24} className="text-indigo-600" /> Audit Log Server</h1>
          <p className="mt-1 text-sm text-slate-500">Workspace: {workspace.name}. Log berasal dari Google Sheets dan dibuat oleh backend, bukan identitas yang dikirim browser.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" />
        <p>Log server hanya ditambahkan oleh backend saat workspace dibuat, data disimpan, atau akses pengguna diubah. Catatan audit lokal lama tetap merupakan data historis browser dan tidak dianggap sebagai bukti identitas server.</p>
      </div>

      {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-500"><Loader2 size={20} className="animate-spin" /> Memuat audit log cloud…</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Belum ada aktivitas server pada workspace ini.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map(record => (
              <article key={record.id} className="p-4 hover:bg-slate-50">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">{record.aksi}</span>
                    <span className="font-mono text-xs text-slate-500">{record.tabel}</span>
                    {record.slice && <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{record.slice}</span>}
                  </div>
                  <time className="text-xs text-slate-500">{record.timestamp ? new Date(record.timestamp).toLocaleString('id-ID') : '—'}</time>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">{record.record_id || 'Perubahan workspace'}</p>
                <p className="mt-1 break-words text-xs text-slate-600">{record.actor_email || record.user || 'Backend'} · {record.alasan || record.aksi}</p>
                {record.changed_keys && <p className="mt-2 break-words text-xs text-slate-600">Bagian berubah: {record.changed_keys}</p>}
                {(record.version_before !== '' || record.version_after !== '') && (
                  <p className="mt-1 text-xs text-slate-500">Versi: {record.version_before || '—'} → {record.version_after || '—'}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
