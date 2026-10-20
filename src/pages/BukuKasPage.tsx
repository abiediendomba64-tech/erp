import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getArusKasSaldo } from '../helpers';
import { BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function BukuKasPage() {
  const { state } = useAppContext();
  const totalMasuk = state.bukuKas.reduce((s, k) => s + k.masuk, 0);
  const totalKeluar = state.bukuKas.reduce((s, k) => s + k.keluar, 0);

  const statusIcon = (s: string) => {
    switch (s) { case 'LENGKAP': return <CheckCircle size={14} className="text-emerald-500" />; case 'TANPA_BUKTI': return <XCircle size={14} className="text-red-500" />; case 'PERLU_KONFIRMASI': return <AlertCircle size={14} className="text-amber-500" />; default: return null; }
  };
  const statusColor = (s: string) => {
    switch (s) { case 'LENGKAP': return 'bg-emerald-100 text-emerald-800'; case 'TANPA_BUKTI': return 'bg-red-100 text-red-800'; case 'PERLU_KONFIRMASI': return 'bg-amber-100 text-amber-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BookOpen size={24} className="text-indigo-500" />Buku Kas — Lapisan 1</h1>
        <p className="text-gray-500 mt-1">Arus kas aktual • Saldo berjalan dihitung otomatis • Status verifikasi otomatis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Masuk</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(totalMasuk)}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Keluar</p><p className="text-xl font-bold text-red-600">{formatRupiah(totalKeluar)}</p></div>
        <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 p-4"><p className="text-xs text-indigo-600">Saldo</p><p className="text-xl font-bold text-indigo-700">{formatRupiah(totalMasuk - totalKeluar)}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Tgl</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Keterangan</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Masuk</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Keluar</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.bukuKas.map(k => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600 text-xs">{k.tgl}</td>
                  <td className="px-3 py-2 text-gray-900">{k.keterangan}</td>
                  <td className="px-3 py-2"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{k.kategori.replace(/_/g, ' ')}</span></td>
                  <td className="px-3 py-2 text-right text-emerald-600 font-medium">{k.masuk > 0 ? formatRupiah(k.masuk) : '—'}</td>
                  <td className="px-3 py-2 text-right text-red-600 font-medium">{k.keluar > 0 ? formatRupiah(k.keluar) : '—'}</td>
                  <td className="px-3 py-2 text-center"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(k.status_verifikasi)}`}>{statusIcon(k.status_verifikasi)}{k.status_verifikasi.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={3} className="px-3 py-3 font-bold text-gray-700">TOTAL</td>
                <td className="px-3 py-3 text-right font-bold text-emerald-600">{formatRupiah(totalMasuk)}</td>
                <td className="px-3 py-3 text-right font-bold text-red-600">{formatRupiah(totalKeluar)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
