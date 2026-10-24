import { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getActiveWorkspaceId, googleErpApi } from '../lib/googleErpApi';

interface ServerAuditEntry {
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
}

function formatValue(value: string) {
  if (!value) return '—';
  try {
    const parsed = JSON.parse(value);
    const json = JSON.stringify(parsed, null, 2);
    return json.length > 600 ? json.slice(0, 600) + '…' : json;
  } catch {
    return value.length > 600 ? value.slice(0, 600) + '…' : value;
  }
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<ServerAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const workspaceId = getActiveWorkspaceId();
      if (!workspaceId) throw new Error('Workspace cloud belum aktif. Masuk kembali dan pilih workspace.');
      const response = await googleErpApi<{ audit: ServerAuditEntry[] }>('audit.list', { workspaceId, limit: 250 });
      setRows(Array.isArray(response.audit) ? response.audit : []);
      setLoadedAt(new Date().toISOString());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal membaca audit trail server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><History size={24} className="text-gray-600" />Audit Log Server</h1>
          <p className="mt-1 text-sm text-gray-500">Catatan resmi dari Google Apps Script dan Google Sheets. Riwayat dibaca dari server, difilter menurut workspace dan role.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Muat ulang</button>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />
        <div><p className="font-semibold">Audit append-only di server</p><p className="mt-1">Penyimpanan record mencatat nilai lama/baru dan identitas sesi terautentikasi. Log lokal lama tidak dianggap bukti identitas server. Nilai yang ditampilkan dipotong untuk kemudahan baca; sumber lengkap tetap di tab AUDIT_LOG.</p></div>
      </div>

      {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={18} className="shrink-0" />{error}</div>}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <div><h2 className="font-semibold">Perubahan server ({rows.length})</h2><p className="mt-1 text-xs text-gray-500">{loadedAt ? 'Terakhir dimuat ' + new Date(loadedAt).toLocaleString('id-ID') : 'Belum dimuat'}</p></div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">Maks. 250 terbaru</span>
        </div>
        {loading ? <div className="p-8 text-center text-gray-500">Mengambil audit log dari Google Sheets…</div> : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada perubahan server pada workspace ini atau role Anda tidak memiliki izin untuk melihatnya.</div>
        ) : (
          <div className="divide-y">
            {rows.map(log => (
              <article key={log.id} className="border-l-4 border-indigo-500 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{log.aksi}</span>
                    <span className="font-mono text-xs text-gray-500">{log.tabel}</span>
                  </div>
                  <time className="text-xs text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : 'Waktu tidak tersedia'}</time>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-800">Record: {log.record_id || '—'} <span className="ml-2 text-xs font-normal text-gray-500">oleh {log.user || 'server'}</span></p>
                <details className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-gray-700">Lihat rincian nilai lama / baru</summary>
                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div><p className="mb-1 text-xs font-semibold text-red-700">Nilai lama</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 text-xs text-gray-700">{formatValue(log.nilai_lama)}</pre></div>
                    <div><p className="mb-1 text-xs font-semibold text-emerald-700">Nilai baru</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 text-xs text-gray-700">{formatValue(log.nilai_baru)}</pre></div>
                  </div>
                  {log.alasan && <p className="mt-2 text-xs text-gray-500">Keterangan server: {log.alasan}</p>}
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
