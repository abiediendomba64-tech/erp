import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import {
  TrendingUp, TrendingDown, Wallet, FileCheck,
  FileX, AlertTriangle, Scale, LandPlot, Truck,
  Receipt, ShieldCheck, ShieldAlert
} from 'lucide-react';

export default function Dashboard() {
  const { state } = useAppContext();

  const totalMasuk = state.bukuKas.reduce((sum, k) => sum + k.masuk, 0);
  const totalKeluar = state.bukuKas.reduce((sum, k) => sum + k.keluar, 0);
  const saldo = totalMasuk - totalKeluar;

  const buktiLengkap = state.arsipBukti.filter(b => b.terverifikasi === 'Ya').length;
  const buktiTanpa = state.arsipBukti.filter(b => b.jenis === 'Tidak_Ada').length;
  const buktiKonfirmasi = state.arsipBukti.filter(b => b.terverifikasi === 'Perlu_Konfirmasi').length;

  const totalKewajiban = state.posKewajiban.reduce((sum, p) => sum + p.nilai_menurut_workbook, 0);
  const kewajibanSepakat = state.posKewajiban.filter(p => p.status === 'Sepakat').reduce((sum, p) => sum + p.nilai_menurut_workbook, 0);
  const kewajibanPenelusuran = state.posKewajiban.filter(p => p.status === 'Dalam_Penelusuran').reduce((sum, p) => sum + p.nilai_menurut_workbook, 0);

  const totalTanah = state.tanah.reduce((sum, t) => sum + t.nilai_total, 0);
  const totalBeko = state.beko.reduce((sum, b) => sum + b.nilai, 0);
  const totalNota = state.notaMaterial.reduce((sum, n) => sum + n.nominal, 0);

  const kasTanpaBukti = state.bukuKas.filter(k => k.status_verifikasi === 'TANPA_BUKTI').reduce((sum, k) => sum + k.keluar, 0);
  const kasPerluKonfirmasi = state.bukuKas.filter(k => k.status_verifikasi === 'PERLU_KONFIRMASI').reduce((sum, k) => sum + k.keluar, 0);

  const stats = [
    { label: 'Total Kas Masuk', value: formatRupiah(totalMasuk), icon: <TrendingUp size={24} />, color: 'bg-emerald-500', change: '' },
    { label: 'Total Kas Keluar', value: formatRupiah(totalKeluar), icon: <TrendingDown size={24} />, color: 'bg-red-500', change: '' },
    { label: 'Saldo Kas', value: formatRupiah(saldo), icon: <Wallet size={24} />, color: 'bg-indigo-500', change: '' },
    { label: 'Total Kewajiban', value: formatRupiah(totalKewajiban), icon: <Scale size={24} />, color: 'bg-amber-500', change: '' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Audit</h1>
        <p className="text-gray-500 mt-1">Ringkasan pembebasan tanah dan cut & fill — 3 lapisan audit</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Anti Hitung Ganda Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-800">Prinsip Anti Hitung Ganda</h3>
            <p className="text-sm text-amber-700 mt-1">
              Kesepakatan = kewajiban, dibayar = uang keluar, bukti = verifikasi, utang = sisa — empat hal dilaporkan terpisah.
              Kas tanpa bukti: <strong>{formatRupiah(kasTanpaBukti)}</strong> | Perlu konfirmasi: <strong>{formatRupiah(kasPerluKonfirmasi)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bukti Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-500" />
            Status Bukti (Lapisan 2)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Terverifikasi</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{buktiLengkap}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileX size={18} className="text-red-600" />
                <span className="text-sm font-medium text-red-800">Tanpa Bukti</span>
              </div>
              <span className="text-lg font-bold text-red-600">{buktiTanpa}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Perlu Konfirmasi</span>
              </div>
              <span className="text-lg font-bold text-amber-600">{buktiKonfirmasi}</span>
            </div>
          </div>
        </div>

        {/* Kewajiban Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            Status Kewajiban (Lapisan 3)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm font-medium text-emerald-800">Sepakat</span>
              <span className="text-sm font-bold text-emerald-600">{formatRupiah(kewajibanSepakat)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <span className="text-sm font-medium text-amber-800">Dalam Penelusuran</span>
              <span className="text-sm font-bold text-amber-600">{formatRupiah(kewajibanPenelusuran)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-800">Sengketa</span>
              <span className="text-sm font-bold text-red-600">{formatRupiah(0)}</span>
            </div>
          </div>
          {/* Selisih Rekonsiliasi */}
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-600 font-medium">Selisih Rekonsiliasi (PDF vs Workbook)</p>
            <p className="text-lg font-bold text-indigo-700">{formatRupiah(2500000)}</p>
            <p className="text-xs text-indigo-500">Rp34.700.000 (PDF) vs Rp37.200.000 (Workbook)</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <LandPlot size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Tanah</p>
              <p className="font-bold text-gray-900">{formatRupiah(totalTanah)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">{state.tanah.length} record • DP + Pelunasan</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Beko</p>
              <p className="font-bold text-gray-900">{formatRupiah(totalBeko)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">{state.beko.length} item • P×L×T×Tarif</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Receipt size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Nota Material</p>
              <p className="font-bold text-gray-900">{formatRupiah(totalNota)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">{state.notaMaterial.length} nota • Tuan Toko</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Aktivitas Audit Terakhir</h3>
        <div className="space-y-3">
          {state.auditLog.slice(-5).reverse().map(log => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-indigo-600">{log.user[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{log.aksi} — {log.tabel}</p>
                <p className="text-xs text-gray-500 truncate">{log.nilai_baru}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleDateString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
