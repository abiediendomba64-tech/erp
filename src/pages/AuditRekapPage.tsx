import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getTanahNilaiTotal, getTanahSisa, getBekoNilai, getPosKewajibanSelisih } from '../helpers';
import { AUDIT_CONSTANTS } from '../data';
import { FileBarChart, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function AuditRekapPage() {
  const { state } = useAppContext();

  // COMPUTED
  const totalMasuk = state.bukuKas.reduce((s, k) => s + k.masuk, 0);
  const totalKeluar = state.bukuKas.reduce((s, k) => s + k.keluar, 0);
  const saldoCatatan = totalMasuk - totalKeluar;
  const totalNilaiTanah = state.tanah.reduce((s, t) => s + getTanahNilaiTotal(t), 0);
  const totalDibayar = state.tanah.reduce((s, t) => s + t.dp, 0);
  const totalSisaUtang = state.tanah.reduce((s, t) => s + getTanahSisa(t), 0);
  const totalBiayaBeko = state.beko.filter(b => ['BK-01','BK-02','BK-03','BK-04','BK-05','BK-06'].includes(b.id)).reduce((s, b) => s + getBekoNilai(b), 0);
  const totalDanaBeko = state.arsipBukti.reduce((s, b) => s + b.nominal, 0);
  const kasRiil = AUDIT_CONSTANTS.KAS_RIIL;
  const posisiNeto = kasRiil - totalSisaUtang;

  // Pengeluaran per kategori
  const pembebasanTanah = state.bukuKas.filter(k => k.kategori === 'Pembebasan_Tanah').reduce((s, k) => s + k.keluar, 0);
  const cutFill = state.bukuKas.filter(k => k.kategori === 'Cut_Fill').reduce((s, k) => s + k.keluar, 0);
  const biayaLain = state.bukuKas.filter(k => k.kategori === 'Operasional').reduce((s, k) => s + k.keluar, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileBarChart size={24} className="text-indigo-500" />Audit Rekap Lengkap</h1>
        <p className="text-gray-500 mt-1">Rekonsiliasi lengkap per 13 Oktober 2026 • Semua angka cross-validated</p>
      </div>

      {/* LEGENDA */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Legenda</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded"></span>Biru = angka input dari dokumen</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800 rounded"></span>Hitam = rumus (computed)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded"></span>Hijau = tautan antar sheet</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-300 rounded"></span>Kuning = perlu konfirmasi</span>
        </div>
      </div>

      {/* A. PENERIMAAN DANA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-blue-50"><h3 className="font-semibold text-blue-900">A. Penerimaan Dana</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left px-4 py-2 font-medium text-gray-600">No</th><th className="text-left px-4 py-2 font-medium text-gray-600">Uraian</th><th className="text-left px-4 py-2 font-medium text-gray-600">Tanggal</th><th className="text-right px-4 py-2 font-medium text-gray-600">Jumlah</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {state.bukuKas.filter(k => k.masuk > 0).map((k, i) => (
                <tr key={k.id}><td className="px-4 py-2 text-blue-600">{i + 1}</td><td className="px-4 py-2">{k.keterangan}</td><td className="px-4 py-2 text-gray-600">{k.tgl}</td><td className="px-4 py-2 text-right font-medium text-blue-700">{formatRupiah(k.masuk)}</td></tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50 border-t-2 border-blue-200">
              <tr><td colSpan={3} className="px-4 py-3 font-bold text-blue-900">TOTAL DANA MASUK</td><td className="px-4 py-3 text-right font-bold text-blue-700">{formatRupiah(totalMasuk)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* B. PENGELUARAN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-red-50"><h3 className="font-semibold text-red-900">B. Pengeluaran Terealisasi</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left px-4 py-2 font-medium text-gray-600">No</th><th className="text-left px-4 py-2 font-medium text-gray-600">Uraian</th><th className="text-right px-4 py-2 font-medium text-gray-600">Jumlah</th><th className="text-right px-4 py-2 font-medium text-gray-600">%</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="px-4 py-2 text-blue-600">1</td><td className="px-4 py-2">Pembebasan tanah (teralokasi)</td><td className="px-4 py-2 text-right font-medium">{formatRupiah(pembebasanTanah)}</td><td className="px-4 py-2 text-right text-gray-500">{((pembebasanTanah/totalMasuk)*100).toFixed(1)}%</td></tr>
              <tr><td className="px-4 py-2 text-blue-600">2</td><td className="px-4 py-2">Cut fill & beko</td><td className="px-4 py-2 text-right font-medium">{formatRupiah(cutFill)}</td><td className="px-4 py-2 text-right text-gray-500">{((cutFill/totalMasuk)*100).toFixed(1)}%</td></tr>
              <tr><td className="px-4 py-2 text-blue-600">3</td><td className="px-4 py-2">Biaya lain-lain (ATK PT)</td><td className="px-4 py-2 text-right font-medium">{formatRupiah(biayaLain)}</td><td className="px-4 py-2 text-right text-gray-500">{((biayaLain/totalMasuk)*100).toFixed(1)}%</td></tr>
            </tbody>
            <tfoot className="bg-red-50 border-t-2 border-red-200">
              <tr><td colSpan={2} className="px-4 py-3 font-bold text-red-900">TOTAL PENGELUARAN</td><td className="px-4 py-3 text-right font-bold text-red-700">{formatRupiah(totalKeluar)}</td><td className="px-4 py-3 text-right font-bold">{((totalKeluar/totalMasuk)*100).toFixed(1)}%</td></tr>
              <tr><td colSpan={2} className="px-4 py-3 font-bold text-indigo-900">SALDO KAS (Catatan)</td><td className="px-4 py-3 text-right font-bold text-indigo-700">{formatRupiah(saldoCatatan)}</td><td className="px-4 py-3 text-right font-bold">{((saldoCatatan/totalMasuk)*100).toFixed(1)}%</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* C. KAS RIIL */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-amber-50"><h3 className="font-semibold text-amber-900">C. Kas Riil (Konfirmasi Pengelola)</h3></div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between p-2 bg-blue-50 rounded"><span className="text-sm">Kas riil yang ada (mengendap)</span><span className="font-bold text-blue-700">{formatRupiah(kasRiil)}</span></div>
          <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-sm">Saldo kas menurut catatan</span><span className="font-bold">{formatRupiah(saldoCatatan)}</span></div>
          <div className="flex justify-between p-2 bg-red-50 rounded"><span className="text-sm font-medium">Selisih: kas riil - catatan</span><span className="font-bold text-red-600">{formatRupiah(kasRiil - saldoCatatan)}</span></div>
          <div className="flex justify-between p-2 bg-amber-50 rounded"><span className="text-sm">"Uang mengendap" tertulis di buku</span><span className="font-bold text-amber-700">{formatRupiah(AUDIT_CONSTANTS.UANG_MENGENDAP)}</span></div>
          <div className="flex justify-between p-2 bg-red-50 rounded border border-red-200"><span className="text-sm font-medium">Selisih riil - mengendap tertulis</span><span className="font-bold text-red-600">{formatRupiah(kasRiil - saldoCatatan - AUDIT_CONSTANTS.UANG_MENGENDAP)}</span></div>
        </div>
      </div>

      {/* D. KOMITMEN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-red-50"><h3 className="font-semibold text-red-900">D. Komitmen Belum Dibayar & Posisi Neto</h3></div>
        <div className="p-4 space-y-3">
          {state.posKewajiban.map(p => (
            <div key={p.id} className="flex justify-between p-2 bg-amber-50 rounded">
              <span className="text-sm">Sisa utang — {p.pihak}</span>
              <span className="font-bold text-red-600">{formatRupiah(getPosKewajibanSelisih(p))}</span>
            </div>
          ))}
          <div className="flex justify-between p-2 bg-red-100 rounded border border-red-200"><span className="font-bold">TOTAL UTANG TANAH</span><span className="font-bold text-red-700">{formatRupiah(totalSisaUtang)}</span></div>
          <div className="flex justify-between p-2 bg-gray-100 rounded"><span className="text-sm">Posisi Neto (kas riil - utang)</span><span className={`font-bold ${posisiNeto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(posisiNeto)}</span></div>
          <div className={`p-3 rounded-lg text-center font-bold ${posisiNeto >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
            STATUS: {posisiNeto >= 0 ? '✓ CUKUP' : '✗ KURANG'}
          </div>
        </div>
      </div>

      {/* E. PERIODE PAK DIDI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-indigo-50"><h3 className="font-semibold text-indigo-900">E. Dana Periode 4-10 Oktober 2026 (Pak Didi)</h3></div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between p-2 bg-blue-50 rounded"><span className="text-sm">Anggaran tersalurkan</span><span className="font-bold text-blue-700">{formatRupiah(AUDIT_CONSTANTS.PERIODE_DIDI_TERSALURKAN)}</span></div>
          <div className="flex justify-between p-2 bg-blue-50 rounded"><span className="text-sm">Sisa tersimpan di Pak Didi</span><span className="font-bold text-blue-700">{formatRupiah(AUDIT_CONSTANTS.PERIODE_DIDI_TERSIMPAN)}</span></div>
          <div className="flex justify-between p-2 bg-indigo-100 rounded border border-indigo-200"><span className="font-bold">Total keseluruhan</span><span className="font-bold text-indigo-700">{formatRupiah(AUDIT_CONSTANTS.PERIODE_DIDI_TOTAL)}</span></div>
        </div>
      </div>

      {/* VERIFIKASI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" />Status Verifikasi</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{AUDIT_CONSTANTS.PEMERIKSAAN_ANGKA}</p><p className="text-xs text-gray-500">Pemeriksaan</p></div>
          <div className="p-3 bg-emerald-50 rounded-lg"><p className="text-2xl font-bold text-emerald-600">{AUDIT_CONSTANTS.PEMERIKSAAN_OK}</p><p className="text-xs text-gray-500">OK</p></div>
          <div className="p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-600">{AUDIT_CONSTANTS.PEMERIKSAAN_SELISIH}</p><p className="text-xs text-gray-500">Selisih</p></div>
          <div className="p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-600">{AUDIT_CONSTANTS.TERBUKA}</p><p className="text-xs text-gray-500">Terbuka</p></div>
          <div className="p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-600">{AUDIT_CONSTANTS.TERJAWAB}</p><p className="text-xs text-gray-500">Terjawab</p></div>
        </div>
      </div>
    </div>
  );
}
