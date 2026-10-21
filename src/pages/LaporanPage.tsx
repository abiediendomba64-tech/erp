import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getTanahNilaiTotal, getTanahSisa, getBekoNilai, getPosKewajibanSelisih } from '../helpers';
import { FileBarChart, CheckCircle, AlertTriangle } from 'lucide-react';

export default function LaporanPage() {
  const { state } = useAppContext();

  const totalMasuk = state.bukuKas.reduce((s, k) => s + k.masuk, 0);
  const totalKeluar = state.bukuKas.reduce((s, k) => s + k.keluar, 0);
  const saldoCatatan = totalMasuk - totalKeluar;
  const totalNilaiTanah = state.tanah.reduce((s, t) => s + getTanahNilaiTotal(t), 0);
  const totalDibayar = state.tanah.reduce((s, t) => s + t.dp, 0);
  const totalSisaUtang = state.tanah.reduce((s, t) => s + getTanahSisa(t), 0);
  const totalBiayaBeko = state.beko.filter(b => ['BK-01','BK-02','BK-03','BK-04','BK-05','BK-06'].includes(b.id)).reduce((s, b) => s + getBekoNilai(b), 0);
  const totalDanaBeko = state.arsipBukti.reduce((s, b) => s + b.nominal, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileBarChart size={24} className="text-indigo-500" />Laporan Lengkap</h1>
        <p className="text-gray-500 mt-1">Rekapitulasi audit per 13 Oktober 2026</p>
      </div>

      {/* Ringkasan Eksekutif */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Ringkasan Eksekutif</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Total Dana Masuk:</p>
            <p className="text-2xl font-bold text-emerald-600">{formatRupiah(totalMasuk)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Total Pengeluaran:</p>
            <p className="text-2xl font-bold text-red-600">{formatRupiah(totalKeluar)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Saldo Kas (Catatan):</p>
            <p className="text-2xl font-bold text-indigo-600">{formatRupiah(saldoCatatan)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Kas Riil (Konfirmasi):</p>
            <p className="text-2xl font-bold text-amber-600">{formatRupiah(35220000)}</p>
          </div>
        </div>
      </div>

      {/* Status Verifikasi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" />Status Verifikasi</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">34</p><p className="text-xs text-gray-500">Pemeriksaan</p></div>
          <div className="p-3 bg-emerald-50 rounded-lg"><p className="text-2xl font-bold text-emerald-600">32</p><p className="text-xs text-gray-500">OK</p></div>
          <div className="p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-600">2</p><p className="text-xs text-gray-500">Selisih</p></div>
          <div className="p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-600">16</p><p className="text-xs text-gray-500">Terbuka</p></div>
          <div className="p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-600">5</p><p className="text-xs text-gray-500">Terjawab</p></div>
        </div>
      </div>

      {/* Temuan Audit */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" />Temuan Audit</h3>
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800">1. Selisih Kas Riil vs Catatan</p>
            <p className="text-xs text-amber-700 mt-1">Selisih Rp18.066.000 antara kas riil (Rp35.220.000) dan saldo catatan (Rp17.154.000)</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800">2. Utang Tanah Belum Lunas</p>
            <p className="text-xs text-amber-700 mt-1">3 bidang dengan sisa utang total Rp34.700.000 (Sanaris, DUDI, Balong)</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800">3. Beko Item 6 Tanpa Kwitansi</p>
            <p className="text-xs text-amber-700 mt-1">Biaya Rp13.125.000 belum memiliki bukti kwitansi</p>
          </div>
        </div>
      </div>

      {/* Rekomendasi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Rekomendasi</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Lakukan rekonsiliasi kas riil dengan catatan untuk menjelaskan selisih Rp18.066.000</li>
          <li>Selesaikan pelunasan utang tanah kepada Sanaris, DUDI, dan Balong</li>
          <li>Minta kwitansi untuk Beko Item 6 (Rp13.125.000)</li>
          <li>Verifikasi status "uang mengendap" Rp2.554.000</li>
          <li>Lengkapi 16 item yang masih terbuka statusnya</li>
        </ol>
      </div>
    </div>
  );
}
