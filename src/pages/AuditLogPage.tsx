import { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, AlertCircle, Cloud } from 'lucide-react';
import { callGoogleBackend, getSessionToken } from '../lib/googleBackend';

interface ServerAuditRecord {
  id: string;
  timestamp: string;
  user: string;
  aksi: string;
  tabel: string;
  record_id: string;
  nilai_lama: string;
  nilai_baru: string;
  alasan: string;
  sumber_bukti: string;
}

export default function AuditLogPage() {
  const [records, setRecords] = useState<ServerAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await callGoogleBackend<{ records: ServerAuditRecord[] }>({
        action: 'audit.list',
        sessionToken: getSessionToken(),
      });
      setRecords(response.records || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Log audit server gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><History size={24} className="text-gray-600" /> Audit Log Server</h1>
          <p className="mt-1 text-sm text-gray-500">Log yang ditampilkan diambil dari Google Sheets backend. Peristiwa dihasilkan server dan tidak dapat ditulis langsung oleh browser.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Segarkan
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <Cloud size={18} className="mt-0.5 shrink-0" />
        <span>Catatan fase ini: audit merekam bootstrap dan penyimpanan modul cloud, termasuk pengguna serta versi. Jejak rinci per-field/per-transaksi harus ditambahkan ketika setiap modul dipindahkan ke operasi API khusus.</span>
      </div>

      {error && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={18} />{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Memuat log audit dari server…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Belum ada aktivitas audit cloud. Bootstrap dan penyimpanan pertama akan tercatat di sini.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map(record => (
              <article key={record.id} className="border-l-4 border-indigo-500 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{record.aksi}</span>
                    <span className="font-mono text-xs text-gray-500">{record.tabel}</span>
                    {record.record_id && <span className="font-mono text-xs text-gray-400">{record.record_id}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{record.timestamp ? new Date(record.timestamp).toLocaleString('id-ID') : '—'}</span>
                </div>
                <p className="mt-2 break-words text-sm text-gray-700">{record.nilai_baru || record.alasan || 'Aktivitas dicatat oleh backend.'}</p>
                <p className="mt-1 text-xs text-gray-500">Oleh {record.user || 'System'} · {record.sumber_bukti || 'Google Apps Script backend'}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
