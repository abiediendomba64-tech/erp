import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getPosKewajibanSisaUtang, getPosKewajibanSelisihRekonsiliasi } from '../helpers';
import { Scale, CheckCircle } from 'lucide-react';

export default function PosKewajibanPage() {
  const { state } = useAppContext();
  const totalDokumen = state.posKewajiban.reduce((s, p) => s + p.nilai_menurut_dokumen, 0);
  const totalWorkbook = state.posKewajiban.reduce((s, p) => s + p.nilai_menurut_workbook, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Scale size={24} className="text-amber-500" />Sisa Utang Tanah</h1>
        <p className="text-gray-500 mt-1">Lapisan 3 — Kewajiban belum dibayar (BUKAN pengeluaran kas)</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800"><strong>Penting:</strong> Angka ini TIDAK termasuk dalam pengeluaran kas. Ini adalah komitmen/utang yang belum dilunasi.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bidang</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total Nilai</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">DP/Dibayar</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sisa Utang</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.posKewajiban.map(p => {
                const sisa = getPosKewajibanSisaUtang(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.pihak}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(p.nilai_menurut_dokumen)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(p.dp_dibayar)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatRupiah(sisa)}</td>
                    <td className="px-4 py-3 text-center"><span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Belum Lunas</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-bold text-gray-700">TOTAL UTANG TANAH</td>
                <td className="px-4 py-3 text-right font-bold">{formatRupiah(totalDokumen)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(state.posKewajiban.reduce((s, p) => s + p.dp_dibayar, 0))}</td>
                <td className="px-4 py-3 text-right font-bold text-red-600">{formatRupiah(state.posKewajiban.reduce((s, p) => s + getPosKewajibanSisaUtang(p), 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Keterangan per Bidang</h3>
        <div className="space-y-2">
          {state.posKewajiban.map(p => (
            <div key={p.id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{p.pihak}</p>
              <p className="text-xs text-gray-600 mt-1">{p.keterangan}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
