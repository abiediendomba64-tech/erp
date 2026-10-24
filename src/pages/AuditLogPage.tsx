import { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, Cloud, Monitor } from 'lucide-react';
import { useAppContext } from '../store';
import { callGoogleAppsScript } from '../lib/googleAppsScriptBridge';

interface ServerAuditRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entity: string;
  recordId: string;
  details: string;
}

export default function AuditLogPage() {
  const { state } = useAppContext();
  const [serverRecords, setServerRecords] = useState<ServerAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');

  const loadServerAudit = useCallback(async () => {
    setServerError('');
    const token = window.sessionStorage.getItem('erp_session_token') || '';
    if (!token) throw new Error('Sesi login tidak ditemukan.');
    const response = await callGoogleAppsScript<{
      success: boolean;
      records?: ServerAuditRecord[];
      error?: string
    }>('apiListBackendAudit', token, 300);
    if (!response.success || !Array.isArray(response.records)) {
      throw new Error(response.error || 'Audit server tidak dapat dimuat.');
    }
    setServerRecords(response.records);
  }, []);

  useEffect(() => {
    let active = true;
    loadServerAudit().catch(error => {
      if (active) setServerError(error instanceof Error ? error.message : String(error));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadServerAudit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><History size={24} className="text-gray-600" />Audit Log</h1>
          <p className="mt-1 text-gray-500">Audit backend server dibedakan dari catatan perubahan yang berasal dari store aplikasi.</p>
        </div>
        <button disabled={loading} onClick={() => { setLoading(true); loadServerAudit().catch(error => setServerError(error instanceof Error ? error.message : String(error))).finally(() => setLoading(false)); }} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"><RefreshCw size={16} />Muat Ulang Audit Server</button>
      </div>

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b p-4"><Cloud size={18} className="text-indigo-600" /><h2 className="font-semibold">Log backend di Google Sheets</h2><span className="ml-auto rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{serverRecords.length} catatan</span></div>
        <div className="p-4">
          {serverError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}
          {loading ? <p className="py-6 text-center text-sm text-gray-500">Memuat audit server…</p>
            : serverRecords.length === 0 && !serverError ? <p className="py-8 text-center text-sm text-gray-500">Belum ada catatan server yang tersedia.</p>
            : <div className="space-y-3">
              {serverRecords.map(record => (
                <article key={record.id} className="border-l-4 border-indigo-500 py-2 pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">{record.action}</span>
                    <span className="text-xs text-gray-500">{record.entity} · {record.recordId}</span>
                    <time className="ml-auto text-xs text-gray-400">{record.timestamp ? new Date(record.timestamp).toLocaleString('id-ID') : '—'}</time>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-800">{record.actorEmail || record.actorId || 'SYSTEM'}</p>
                  {record.details && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-gray-500">{record.details}</pre>}
                </article>
              ))}
            </div>}
        </div>
      </section>

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b p-4"><Monitor size={18} className="text-gray-500" /><h2 className="font-semibold">Catatan perubahan di store aplikasi</h2><span className="ml-auto rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{state.auditLog.length} catatan</span></div>
        <div className="space-y-3 p-4">
          {state.auditLog.map(log => (
            <article key={log.id} className="border-l-4 border-gray-300 py-2 pl-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{log.aksi}</span>
                <span className="font-mono text-xs text-gray-500">{log.tabel}</span>
                <time className="ml-auto text-xs text-gray-400">{new Date(log.timestamp).toLocaleString('id-ID')}</time>
              </div>
              <p className="break-words text-sm text-gray-700"><span className="text-red-500 line-through">{log.nilai_lama}</span> → <span className="font-medium text-emerald-600">{log.nilai_baru}</span></p>
              <p className="mt-1 text-xs text-gray-500">Alasan: {log.alasan} • Sumber: {log.sumber_bukti} • oleh {log.user}</p>
            </article>
          ))}
          {state.auditLog.length === 0 && <p className="py-4 text-center text-sm text-gray-500">Belum ada catatan aplikasi di workspace ini.</p>}
        </div>
      </section>
    </div>
  );
}
