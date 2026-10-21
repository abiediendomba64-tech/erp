import { useAppContext } from '../store';
import { History } from 'lucide-react';

export default function AuditLogPage() {
  const { state } = useAppContext();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History size={24} className="text-gray-600" />Audit Log</h1>
        <p className="text-gray-500 mt-1">Append-only • Setiap perubahan tercatat dengan alasan & sumber bukti</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="space-y-3">
          {state.auditLog.map(log => (
            <div key={log.id} className="border-l-4 border-indigo-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">{log.aksi}</span>
                  <span className="text-xs font-mono text-gray-500">{log.tabel}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString('id-ID')}</span>
              </div>
              <p className="text-sm text-gray-700"><span className="text-red-500 line-through">{log.nilai_lama}</span> → <span className="text-emerald-600 font-medium">{log.nilai_baru}</span></p>
              <p className="text-xs text-gray-500 mt-1">Alasan: {log.alasan} • Sumber: {log.sumber_bukti} • oleh {log.user}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
