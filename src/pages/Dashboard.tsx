import { useAppContext } from '../store';
import { formatRupiah, formatNumber } from '../data';
import { getTanahNilaiTotal, getTanahSisa, getBekoNilai, getPosKewajibanSelisih, getArusKasSaldo } from '../helpers';
import { AUDIT_CONSTANTS } from '../data';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Scale,
  LandPlot, Truck, CheckCircle, XCircle, FileWarning
} from 'lucide-react';

export default function Dashboard() {
  const { state } = useAppContext();

  // === REAL-TIME COMPUTED VALUES ===
  const totalMasuk = state.bukuKas.reduce((s, k) => s + k.masuk, 0);
  const totalKeluar = state.bukuKas.reduce((s, k) => s + k.keluar, 0);
  const saldoCatatan = totalMasuk - totalKeluar;

  const totalNilaiTanah = state.tanah.reduce((s, t) => s + getTanahNilaiTotal(t), 0);
  const totalDibayarTanah = state.tanah.reduce((s, t) => s + t.dp, 0);
  const totalSisaUtangTanah = state.tanah.reduce((s, t) => s + getTanahSisa(t), 0);
  const totalLuas = state.tanah.reduce((s, t) => s + t.luas_bt, 0);

  const totalBiayaBeko = state.beko.filter(b => ['BK-01','BK-02','BK-03','BK-04','BK-05','BK-06'].includes(b.id)).reduce((s, b) => s + getBekoNilai(b), 0);
  const totalDanaBekoDiterima = state.arsipBukti.reduce((s, b) => s + b.nominal, 0);

  const totalUtang = state.posKewajiban.reduce((s, p) => s + (p.nilai_menurut_workbook - p.nilai_menurut_dokumen + p.nilai_menurut_dokumen), 0);
  const sisaUtang = state.posKewajiban.reduce((s, p) => s + getPosKewajibanSelisih(p), 0);

  const posisiNetoCatatan = saldoCatatan - totalSisaUtangTanah;
  const kasRiil = AUDIT_CONSTANTS.KAS_RIIL;
  const posisiNetoRiil = kasRiil - totalSisaUtangTanah;

  // === CROSS-VALIDATION ===
  const validations = [
    { label: 'Total Dana Masuk', computed: totalMasuk, expected: AUDIT_CONSTANTS.TOTAL_DANA_MASUK },
    { label: 'Total Pengeluaran', computed: totalKeluar, expected: AUDIT_CONSTANTS.TOTAL_PENGELUARAN },
    { label: 'Saldo Kas Catatan', computed: saldoCatatan, expected: AUDIT_CONSTANTS.SALDO_KAS_CATATAN },
    { label: 'Total Nilai Tanah', computed: totalNilaiTanah, expected: AUDIT_CONSTANTS.TOTAL_NILAI_TANAH },
    { label: 'Total Dibayar Tanah', computed: totalDibayarTanah, expected: AUDIT_CONSTANTS.TOTAL_DIBAYAR_TANAH },
    { label: 'Sisa Utang Tanah', computed: totalSisaUtangTanah, expected: AUDIT_CONSTANTS.TOTAL_UTANG_TANAH },
    { label: 'Total Biaya Beko', computed: totalBiayaBeko, expected: AUDIT_CONSTANTS.TOTAL_BIAYA_BEKO },
    { label: 'Dana Beko Diterima', computed: totalDanaBekoDiterima, expected: AUDIT_CONSTANTS.TOTAL_DANA_BEKO_DITERIMA },
  ];

  const okCount = validations.filter(v => v.computed === v.expected).length;
  const selisihCount = validations.filter(v => v.computed !== v.expected).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Audit — Real Time</h1>
        <p className="text-gray-500 mt-1">Data per 13 Oktober 2026 • Semua nilai dihitung otomatis (anti-drift)</p>
      </div>

      {/* Cross-Validation Banner */}
      <div className={`rounded-xl p-4 border ${selisihCount === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          {selisihCount === 0 ? <CheckCircle className="text-emerald-500" size={24} /> : <AlertTriangle className="text-amber-500" size={24} />}
          <div>
            <h3 className={`font-semibold ${selisihCount === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
              Cross-Validation: {okCount}/{validations.length} OK {selisihCount > 0 && `• ${selisihCount} SELISIH`}
            </h3>
            <p className={`text-sm ${selisihCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              Semua angka utama terverifikasi otomatis dari data input
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Dana Masuk</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatRupiah(totalMasuk)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><TrendingUp size={24} className="text-emerald-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatRupiah(totalKeluar)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><TrendingDown size={24} className="text-red-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo Kas (Catatan)</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{formatRupiah(saldoCatatan)}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center"><Wallet size={24} className="text-indigo-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Kas Riil (Konfirmasi)</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{formatRupiah(kasRiil)}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><Wallet size={24} className="text-amber-600" /></div>
          </div>
        </div>
      </div>

      {/* Selisih Kas */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle size={18} />Selisih Kas Riil vs Catatan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div><p className="text-xs text-amber-600">Kas Riil</p><p className="font-bold text-amber-800">{formatRupiah(kasRiil)}</p></div>
          <div><p className="text-xs text-amber-600">Saldo Catatan</p><p className="font-bold text-amber-800">{formatRupiah(saldoCatatan)}</p></div>
          <div><p className="text-xs text-amber-600">Selisih</p><p className="font-bold text-red-600">{formatRupiah(kasRiil - saldoCatatan)}</p></div>
        </div>
      </div>

      {/* Posisi Neto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Posisi Neto (Menurut Catatan)</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-gray-600">Saldo Kas</span><span className="font-medium">{formatRupiah(saldoCatatan)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-600">Utang Tanah</span><span className="font-medium text-red-600">- {formatRupiah(totalSisaUtangTanah)}</span></div>
            <div className="border-t pt-2 flex justify-between"><span className="font-bold">Posisi Neto</span><span className={`font-bold ${posisiNetoCatatan < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(posisiNetoCatatan)}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Posisi Neto (Kas Riil)</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-gray-600">Kas Riil</span><span className="font-medium">{formatRupiah(kasRiil)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-600">Utang Tanah</span><span className="font-medium text-red-600">- {formatRupiah(totalSisaUtangTanah)}</span></div>
            <div className="border-t pt-2 flex justify-between"><span className="font-bold">Posisi Neto</span><span className={`font-bold ${posisiNetoRiil >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(posisiNetoRiil)}</span></div>
            <div className="mt-2 p-2 bg-emerald-50 rounded text-xs text-emerald-700 font-medium">STATUS: {posisiNetoRiil >= 0 ? 'CUKUP ✓' : 'KURANG ✗'}</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><LandPlot size={20} className="text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Total Tanah</p><p className="font-bold">{formatRupiah(totalNilaiTanah)}</p></div>
          </div>
          <p className="text-xs text-gray-500">{state.tanah.length} bidang • {totalLuas} BT • {((totalDibayarTanah/totalNilaiTanah)*100).toFixed(1)}% terbayar</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"><Truck size={20} className="text-orange-600" /></div>
            <div><p className="text-xs text-gray-500">Beko (Item 1-6)</p><p className="font-bold">{formatRupiah(totalBiayaBeko)}</p></div>
          </div>
          <p className="text-xs text-gray-500">Dana diterima: {formatRupiah(totalDanaBekoDiterima)} • Selisih: {formatRupiah(totalDanaBekoDiterima - totalBiayaBeko)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><Scale size={20} className="text-red-600" /></div>
            <div><p className="text-xs text-gray-500">Utang Tanah</p><p className="font-bold text-red-600">{formatRupiah(totalSisaUtangTanah)}</p></div>
          </div>
          <p className="text-xs text-gray-500">{state.posKewajiban.length} pihak • Sanaris, DUDI, Balong</p>
        </div>
      </div>

      {/* Verification Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Status Verifikasi Angka</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-gray-900">{AUDIT_CONSTANTS.PEMERIKSAAN_ANGKA}</p><p className="text-xs text-gray-500">Total Pemeriksaan</p></div>
          <div className="p-3 bg-emerald-50 rounded-lg"><p className="text-2xl font-bold text-emerald-600">{AUDIT_CONSTANTS.PEMERIKSAAN_OK}</p><p className="text-xs text-gray-500">OK</p></div>
          <div className="p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-600">{AUDIT_CONSTANTS.PEMERIKSAAN_SELISIH}</p><p className="text-xs text-gray-500">Selisih</p></div>
          <div className="p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-600">{AUDIT_CONSTANTS.TERBUKA}</p><p className="text-xs text-gray-500">Terbuka</p></div>
          <div className="p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-600">{AUDIT_CONSTANTS.TERJAWAB}</p><p className="text-xs text-gray-500">Terjawab</p></div>
        </div>
      </div>

      {/* Cross-Validation Detail */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" />Detail Cross-Validation</h3>
        <div className="space-y-2">
          {validations.map((v, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${v.computed === v.expected ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <span className="text-sm font-medium text-gray-700">{v.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono">{formatRupiah(v.computed)}</span>
                {v.computed === v.expected ? (
                  <CheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <span className="text-xs text-red-600">Expected: {formatRupiah(v.expected)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
