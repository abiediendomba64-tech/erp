import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { FolderArchive, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function ArsipBuktiPage() {
  const { state } = useAppContext();
  const statusColor = (s: string) => {
    switch (s) { case 'Ya': return 'bg-emerald-100 text-emerald-800'; case 'Tidak': return 'bg-red-100 text-red-800'; case 'Perlu_Konfirmasi': return 'bg-amber-100 text-amber-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FolderArchive size={24} className="text-purple-500" />Arsip Bukti — Lapisan 2</h1>
        <p className="text-gray-500 mt-1">Dana beko diterima per tahap • Metadata dokumen</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Penerima</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tgl Upload</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.arsipBukti.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-purple-600">{b.kode_bukti}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.catatan_audit}</td>
                  <td className="px-4 py-3 text-gray-600">{b.penerima}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatRupiah(b.nominal)}</td>
                  <td className="px-4 py-3 text-gray-600">{b.tgl_upload}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(b.terverifikasi)}`}>{b.terverifikasi.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr><td colSpan={3} className="px-4 py-3 font-bold">TOTAL</td><td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(state.arsipBukti.reduce((s, b) => s + b.nominal, 0))}</td><td colSpan={2}></td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
