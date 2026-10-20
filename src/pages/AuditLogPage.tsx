import { useAppContext } from '../store';
import { History, Shield } from 'lucide-react';

export default function AuditLogPage() {
  const { state } = useAppContext();

  const aksiColor = (aksi: string) => {
    switch (aksi) {
      case 'CREATE': return 'bg-emerald-100 text-emerald-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'APPROVE': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabelColor = (tabel: string) => {
    switch (tabel) {
      case 'BUKU_KAS': return 'border-l-indigo-500';
      case 'ARSIP_BUKTI': return 'border-l-purple-500';
      case 'POS_KEWAJIBAN': return 'border-l-amber-500';
      case 'TANAH': return 'border-l-blue-500';
      case 'BEKO': return 'border-l-orange-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History size={24} className="text-gray-600" />
          Audit Log
        </h1>
        <p className="text-gray-500 mt-1">Append-only log — setiap koreksi WAJIB isi alasan/sumber bukti. Tidak ada penghapusan.</p>
      </div>

      {/* Principles */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-slate-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-slate-800">Prinsip Audit Log</h3>
            <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
              <li>Setiap perubahan menghasilkan baris baru (append-only)</li>
              <li>Menampilkan "nilai lama → nilai baru"</li>
              <li>Wajib mengisi alasan dan sumber bukti</li>
              <li>Tidak ada penghapusan data — hanya penambahan</li>
              <li>Penginput tidak bisa menyetujui transaksinya sendiri</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{state.auditLog.length}</p>
          <p className="text-xs text-gray-500">Total Log</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{state.auditLog.filter(l => l.aksi === 'CREATE').length}</p>
          <p className="text-xs text-gray-500">Create</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{state.auditLog.filter(l => l.aksi === 'UPDATE').length}</p>
          <p className="text-xs text-gray-500">Update</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{new Set(state.auditLog.map(l => l.user)).size}</p>
          <p className="text-xs text-gray-500">Users</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Timeline Aktivitas</h3>
        <div className="space-y-4">
          {[...state.auditLog].reverse().map(log => (
            <div key={log.id} className={`border-l-4 ${tabelColor(log.tabel)} pl-4 py-2`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${aksiColor(log.aksi)}`}>
                    {log.aksi}
                  </span>
                  <span className="text-xs font-mono text-gray-500">{log.tabel}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs font-mono text-gray-500">{log.record_id}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="mt-1">
                <p className="text-sm text-gray-700">
                  <span className="text-red-500 line-through">{log.nilai_lama}</span>
                  {' → '}
                  <span className="text-emerald-600 font-medium">{log.nilai_baru}</span>
                </p>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Alasan:</span> {log.alasan}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Sumber:</span> {log.sumber_bukti}
                </p>
                <p className="text-xs text-gray-400 ml-auto">
                  oleh <span className="font-medium text-gray-600">{log.user}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
