import { useAppContext } from '../store';
import { formatRupiah, formatNumber } from '../data';
import { getTanahNilaiTotal, getTanahSisa } from '../helpers';
import { AUDIT_CONSTANTS } from '../data';
import { LandPlot, CheckCircle, AlertTriangle } from 'lucide-react';

export default function TanahPage() {
  const { state } = useAppContext();

  const totalLuas = state.tanah.reduce((s, t) => s + t.luas_bt, 0);
  const totalNilai = state.tanah.reduce((s, t) => s + getTanahNilaiTotal(t), 0);
  const totalDibayar = state.tanah.reduce((s, t) => s + t.dp, 0);
  const totalSisa = state.tanah.reduce((s, t) => s + getTanahSisa(t), 0);

  // Rekap per penjual
  const rekapPenjual = state.tanah.reduce((acc, t) => {
    const nama = t.pemilik.split(' (')[0].split(' -')[0]; // Normalize
    if (!acc[nama]) acc[nama] = { luas: 0, nilai: 0, dibayar: 0, sisa: 0 };
    acc[nama].luas += t.luas_bt;
    acc[nama].nilai += getTanahNilaiTotal(t);
    acc[nama].dibayar += t.dp;
    acc[nama].sisa += getTanahSisa(t);
    return acc;
  }, {} as Record<string, { luas: number; nilai: number; dibayar: number; sisa: number }>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><LandPlot size={24} className="text-blue-500" />Register Pembebasan Tanah</h1>
        <p className="text-gray-500 mt-1">13 bidang • Satuan luas BT sesuai catatan asli • Semua nilai dihitung otomatis</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Bidang</p><p className="text-xl font-bold">{state.tanah.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Luas</p><p className="text-xl font-bold">{totalLuas} BT</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Nilai</p><p className="text-xl font-bold text-blue-600">{formatRupiah(totalNilai)}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Terbayar</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(totalDibayar)} ({((totalDibayar/totalNilai)*100).toFixed(1)}%)</p></div>
      </div>

      {/* Validation */}
      <div className={`rounded-xl p-3 border ${totalNilai === AUDIT_CONSTANTS.TOTAL_NILAI_TANAH && totalDibayar === AUDIT_CONSTANTS.TOTAL_DIBAYAR_TANAH && totalSisa === AUDIT_CONSTANTS.TOTAL_UTANG_TANAH ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2">
          {totalNilai === AUDIT_CONSTANTS.TOTAL_NILAI_TANAH ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-red-500" />}
          <span className="text-sm font-medium">
            Cross-check: Nilai {formatRupiah(totalNilai)} | Dibayar {formatRupiah(totalDibayar)} | Sisa {formatRupiah(totalSisa)} — {totalNilai === AUDIT_CONSTANTS.TOTAL_NILAI_TANAH ? '✓ COCOK' : '✗ SELISIH'}
          </span>
        </div>
      </div>

      {/* Register Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">No</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Penjual</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Luas (BT)</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Harga/BT</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Nilai</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Dibayar</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Sisa</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.tanah.map((t, i) => {
                const nilaiTotal = getTanahNilaiTotal(t);
                const sisa = getTanahSisa(t);
                return (
                  <tr key={t.id} className={`hover:bg-gray-50 ${sisa > 0 ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{t.pemilik}</td>
                    <td className="px-3 py-2 text-right">{t.luas_bt > 0 ? t.luas_bt : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{t.harga_per_bt > 0 ? formatRupiah(t.harga_per_bt) : '—'}</td>
                    <td className="px-3 py-2 text-right font-medium">{nilaiTotal > 0 ? formatRupiah(nilaiTotal) : formatRupiah(t.dp)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{formatRupiah(t.dp)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${sisa > 0 ? 'text-red-600' : 'text-gray-400'}`}>{sisa > 0 ? formatRupiah(sisa) : '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {t.status === 'Lunas' ? 'Lunas' : 'DP'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={2} className="px-3 py-3 font-bold text-gray-700">TOTAL</td>
                <td className="px-3 py-3 text-right font-bold">{totalLuas}</td>
                <td></td>
                <td className="px-3 py-3 text-right font-bold text-gray-900">{formatRupiah(totalNilai)}</td>
                <td className="px-3 py-3 text-right font-bold text-emerald-600">{formatRupiah(totalDibayar)}</td>
                <td className={`px-3 py-3 text-right font-bold ${totalSisa > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalSisa)}</td>
                <td className="px-3 py-3 text-center text-xs font-bold text-gray-500">{((totalDibayar/totalNilai)*100).toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rekap Per Penjual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Rekap Per Penjual</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Penjual</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Luas (BT)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Dibayar</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sisa</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">% Terbayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(rekapPenjual).map(([nama, data]) => (
                <tr key={nama} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{nama}</td>
                  <td className="px-4 py-3 text-right">{data.luas}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(data.nilai)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(data.dibayar)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${data.sisa > 0 ? 'text-red-600' : 'text-gray-400'}`}>{data.sisa > 0 ? formatRupiah(data.sisa) : '—'}</td>
                  <td className="px-4 py-3 text-right">{data.nilai > 0 ? `${((data.dibayar/data.nilai)*100).toFixed(1)}%` : '100.0%'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
