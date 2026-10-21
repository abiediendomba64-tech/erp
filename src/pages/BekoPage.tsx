import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getBekoNilai } from '../helpers';
import { AUDIT_CONSTANTS } from '../data';
import { Truck, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function BekoPage() {
  const { state } = useAppContext();

  // Item yang MASUK total (1-6)
  const itemMasuk = state.beko.filter(b => ['BK-01','BK-02','BK-03','BK-04','BK-05','BK-06'].includes(b.id));
  const itemDiLuar = state.beko.filter(b => ['BK-07','BK-08'].includes(b.id));

  const totalBiayaBeko = itemMasuk.reduce((s, b) => s + getBekoNilai(b), 0);
  const totalDiLuar = itemDiLuar.reduce((s, b) => s + getBekoNilai(b), 0);
  const mobilisasi = itemMasuk.filter(b => ['BK-01','BK-02'].includes(b.id)).reduce((s, b) => s + getBekoNilai(b), 0);
  const kubikasi = itemMasuk.filter(b => ['BK-03','BK-04','BK-05','BK-06'].includes(b.id)).reduce((s, b) => s + getBekoNilai(b), 0);
  const denganKwitansi = itemMasuk.filter(b => ['BK-01','BK-02','BK-03','BK-04','BK-05'].includes(b.id)).reduce((s, b) => s + getBekoNilai(b), 0);
  const tanpaKwitansi = itemMasuk.filter(b => b.id === 'BK-06').reduce((s, b) => s + getBekoNilai(b), 0);

  // Dana beko per tahap
  const totalDanaDiterima = state.arsipBukti.reduce((s, b) => s + b.nominal, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Truck size={24} className="text-orange-500" />Rincian Biaya Beko</h1>
        <p className="text-gray-500 mt-1">8 item • P × L × T × Tarif = Nilai • Semua dihitung otomatis</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Biaya (Item 1-6)</p><p className="text-xl font-bold text-orange-600">{formatRupiah(totalBiayaBeko)}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Di Luar Total (Item 7-8)</p><p className="text-xl font-bold text-gray-500">{formatRupiah(totalDiLuar)}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Dana Diterima (6 tahap)</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(totalDanaDiterima)}</p></div>
        <div className={`rounded-xl shadow-sm border p-4 ${totalDanaDiterima - totalBiayaBeko < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}><p className="text-xs text-gray-500">Selisih</p><p className={`text-xl font-bold ${totalDanaDiterima - totalBiayaBeko < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalDanaDiterima - totalBiayaBeko)}</p></div>
      </div>

      {/* Validation */}
      <div className={`rounded-xl p-3 border ${totalBiayaBeko === AUDIT_CONSTANTS.TOTAL_BIAYA_BEKO ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2">
          {totalBiayaBeko === AUDIT_CONSTANTS.TOTAL_BIAYA_BEKO ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-red-500" />}
          <span className="text-sm font-medium">Total biaya beko: {formatRupiah(totalBiayaBeko)} — {totalBiayaBeko === AUDIT_CONSTANTS.TOTAL_BIAYA_BEKO ? '✓ COCOK dengan laporan' : `✗ SELISIH (expected ${formatRupiah(AUDIT_CONSTANTS.TOTAL_BIAYA_BEKO)})`}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-600">No</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Uraian</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">P</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">L</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">T</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Volume</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Tarif</th>
                <th className="text-right px-3 py-3 font-medium text-gray-600">Nilai</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Masuk Total?</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Kwitansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.beko.map((b, i) => {
                const nilai = getBekoNilai(b);
                const masukTotal = ['BK-01','BK-02','BK-03','BK-04','BK-05','BK-06'].includes(b.id);
                const volume = b.panjang * b.lebar * b.tinggi;
                return (
                  <tr key={b.id} className={`hover:bg-gray-50 ${!masukTotal ? 'bg-gray-50 opacity-60' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{b.item}</td>
                    <td className="px-3 py-2 text-right">{b.panjang || '—'}</td>
                    <td className="px-3 py-2 text-right">{b.lebar || '—'}</td>
                    <td className="px-3 py-2 text-right">{b.tinggi || '—'}</td>
                    <td className="px-3 py-2 text-right">{volume > 0 ? volume.toFixed(0) : '1 ls'}</td>
                    <td className="px-3 py-2 text-right">{b.tarif > 0 ? formatRupiah(b.tarif) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatRupiah(nilai)}</td>
                    <td className="px-3 py-2 text-center">
                      {masukTotal ? <CheckCircle size={16} className="text-emerald-500 mx-auto" /> : <XCircle size={16} className="text-red-400 mx-auto" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {b.status === 'Lunas' ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Ada</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Tidak</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={7} className="px-3 py-3 font-bold text-gray-700">TOTAL (Item 1-6)</td>
                <td className="px-3 py-3 text-right font-bold text-orange-600">{formatRupiah(totalBiayaBeko)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Breakdown Biaya</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-gray-600">Mobilisasi & sewa (Item 1-2)</span><span className="font-medium">{formatRupiah(mobilisasi)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-600">Kubikasi cut fill (Item 3-6)</span><span className="font-medium">{formatRupiah(kubikasi)}</span></div>
            <div className="border-t pt-2 flex justify-between"><span className="font-bold">Total</span><span className="font-bold text-orange-600">{formatRupiah(totalBiayaBeko)}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Status Kwitansi</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-gray-600">Dengan kwitansi (Item 1-5)</span><span className="font-medium text-emerald-600">{formatRupiah(denganKwitansi)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-600">Tanpa kwitansi (Item 6)</span><span className="font-medium text-red-600">{formatRupiah(tanpaKwitansi)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-600">Di luar total (Item 7)</span><span className="font-medium text-gray-500">{formatRupiah(totalDiLuar)}</span></div>
          </div>
        </div>
      </div>

      {/* Dana Beko per Tahap */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Dana Beko Diterima Per Tahap</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.arsipBukti.map((b, i) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.catatan_audit}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(b.nominal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">TOTAL DANA BEKO DITERIMA</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(totalDanaDiterima)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rekonsiliasi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Rekonsiliasi Beko</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-sm text-gray-600">Biaya beko (total)</span><span className="font-medium">{formatRupiah(totalBiayaBeko)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-gray-600">Dana beko diterima</span><span className="font-medium">{formatRupiah(totalDanaDiterima)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-bold">Selisih (dana - biaya)</span><span className={`font-bold ${totalDanaDiterima - totalBiayaBeko < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalDanaDiterima - totalBiayaBeko)}</span></div>
          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Catatan:</strong> Selisih -{formatRupiah(10000000)} menunjukkan kekurangan dana yang ditutup dari sumber lain.
              Dana diterima vs item 1-5 (punya kwitansi): {formatRupiah(totalDanaDiterima - denganKwitansi)} (positif = ada kelebihan).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
