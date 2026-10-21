import { useState } from 'react';
import { formatRupiah } from '../data';
import { semuaPeriode, rekapitulasi, temuanAudit, PeriodeDana, AlokasiItem } from '../data/alokasiDana';
import { AlertTriangle, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, FileWarning } from 'lucide-react';

export default function AlokasiDanaPage() {
  const [selectedPeriode, setSelectedPeriode] = useState<PeriodeDana | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const kategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'tanah': return 'bg-blue-100 text-blue-700';
      case 'beko': return 'bg-orange-100 text-orange-700';
      case 'material': return 'bg-purple-100 text-purple-700';
      case 'pajak': return 'bg-red-100 text-red-700';
      case 'biaya_pt': return 'bg-pink-100 text-pink-700';
      case 'lainnya': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'terbayar': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'belum_terbayar': return <XCircle size={16} className="text-red-500" />;
      case 'dalam_proses': return <Clock size={16} className="text-amber-500" />;
      case 'deal': return <Clock size={16} className="text-blue-500" />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'terbayar': return 'bg-emerald-100 text-emerald-800';
      case 'belum_terbayar': return 'bg-red-100 text-red-800';
      case 'dalam_proses': return 'bg-amber-100 text-amber-800';
      case 'deal': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign size={24} className="text-emerald-500" />
          Rincian Alokasi Dana Per Periode
        </h1>
        <p className="text-gray-500 mt-1">Perhitungan detail berdasarkan klarifikasi pengguna - semua angka bisa diverifikasi</p>
      </div>

      {/* TEMUAN AUDIT */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
          <AlertTriangle size={18} />
          Temuan Audit - Perlu Klarifikasi
        </h3>
        <div className="space-y-2">
          {temuanAudit.map(temuan => (
            <div key={temuan.id} className={`p-3 rounded-lg border ${severityColor(temuan.severity)}`}>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white">{temuan.severity}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{temuan.judul}</p>
                  <p className="text-xs mt-1">{temuan.deskripsi}</p>
                  {'selisih' in temuan && temuan.selisih !== undefined && (
                    <p className="text-xs font-mono mt-1">
                      Selisih: <span className="font-bold">{formatRupiah(Math.abs(temuan.selisih))}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REKAPITULASI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-500" />
          Rekapitulasi Keseluruhan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <p className="text-xs text-emerald-600">Total Dana Masuk</p>
            <p className="text-xl font-bold text-emerald-700">{formatRupiah(rekapitulasi.total_dana_masuk)}</p>
            <p className="text-xs text-emerald-500 mt-1">6 periode (termasuk dana awal 204jt)</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-xs text-blue-600">Total Alokasi</p>
            <p className="text-xl font-bold text-blue-700">{formatRupiah(rekapitulasi.total_alokasi)}</p>
            <p className="text-xs text-blue-500 mt-1">Semua periode digabung</p>
          </div>
          <div className={`rounded-lg p-4 border ${rekapitulasi.total_sisa >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-gray-600">Total Sisa</p>
            <p className={`text-xl font-bold ${rekapitulasi.total_sisa >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
              {formatRupiah(rekapitulasi.total_sisa)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {rekapitulasi.total_sisa >= 0 ? 'Masih ada sisa' : 'OVER ALLOCATION!'}
            </p>
          </div>
        </div>

        {/* Per Kategori */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Tanah</p>
            <p className="font-bold text-blue-700">{formatRupiah(rekapitulasi.total_tanah)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs text-orange-600">Beko</p>
            <p className="font-bold text-orange-700">{formatRupiah(rekapitulasi.total_beko)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-purple-600">Material</p>
            <p className="font-bold text-purple-700">{formatRupiah(rekapitulasi.total_material)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-600">Pajak</p>
            <p className="font-bold text-red-700">{formatRupiah(rekapitulasi.total_pajak)}</p>
          </div>
          <div className="bg-pink-50 rounded-lg p-3">
            <p className="text-xs text-pink-600">Biaya PT</p>
            <p className="font-bold text-pink-700">{formatRupiah(rekapitulasi.total_biaya_pt)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Lainnya</p>
            <p className="font-bold text-gray-700">{formatRupiah(rekapitulasi.total_lainnya)}</p>
          </div>
        </div>
      </div>

      {/* DETAIL PER PERIODE */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Detail Per Periode</h3>
        
        {semuaPeriode.map((periode) => {
          const isOver = periode.sisa < 0;
          return (
            <div key={periode.id} className={`bg-white rounded-xl shadow-sm border ${isOver ? 'border-red-300' : 'border-gray-100'}`}>
              <div 
                className={`p-4 cursor-pointer hover:bg-gray-50 ${isOver ? 'bg-red-50' : ''}`}
                onClick={() => {
                  setSelectedPeriode(periode);
                  setShowDetail(!showDetail || selectedPeriode?.id !== periode.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isOver ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {periode.nomor}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Periode {periode.nomor} - {periode.tanggal}</p>
                      <p className="text-sm text-gray-500">{periode.alokasi.length} alokasi</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Dana</p>
                    <p className="font-bold text-gray-900">{formatRupiah(periode.jumlah_dana)}</p>
                    <p className={`text-sm font-bold ${isOver ? 'text-red-600' : periode.sisa > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      Sisa: {formatRupiah(periode.sisa)}
                    </p>
                  </div>
                </div>
                
                {isOver && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>OVER ALLOCATION: Alokasi melebihi dana sebesar {formatRupiah(Math.abs(periode.sisa))}</span>
                  </div>
                )}
              </div>

              {showDetail && selectedPeriode?.id === periode.id && (
                <div className="border-t border-gray-200 p-4">
                  <div className="space-y-2">
                    {periode.alokasi.map((alokasi) => (
                      <div key={alokasi.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">{statusIcon(alokasi.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${kategoriColor(alokasi.kategori)}`}>
                              {alokasi.kategori.replace('_', ' ')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${statusColor(alokasi.status)}`}>
                              {alokasi.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900">{alokasi.keterangan}</p>
                          <p className="text-sm text-gray-600">Penerima: {alokasi.penerima}</p>
                          <p className="text-xs text-gray-500 mt-1">{alokasi.catatan}</p>
                          {alokasi.bukti && (
                            <p className="text-xs text-gray-400 mt-1">Bukti: {alokasi.bukti}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatRupiah(alokasi.nominal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-800">
                      <strong>Catatan Periode:</strong> {periode.catatan}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded p-2 border">
                      <p className="text-xs text-gray-500">Dana</p>
                      <p className="font-bold text-gray-900">{formatRupiah(periode.jumlah_dana)}</p>
                    </div>
                    <div className="bg-white rounded p-2 border">
                      <p className="text-xs text-gray-500">Terpakai</p>
                      <p className="font-bold text-blue-600">{formatRupiah(periode.total_terpakai)}</p>
                    </div>
                    <div className={`rounded p-2 border ${periode.sisa >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-xs text-gray-500">Sisa</p>
                      <p className={`font-bold ${periode.sisa >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatRupiah(periode.sisa)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* VERIFIKASI PERHITUNGAN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileWarning size={18} className="text-amber-500" />
          Verifikasi Perhitungan
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Total Dana Masuk:</p>
            <div className="text-xs font-mono space-y-1">
              <p>Periode 0 (sebelum 28 Sep): {formatRupiah(204000000)}</p>
              <p>Periode 1 (28 Agt): {formatRupiah(32500000)}</p>
              <p>Periode 2 (30 Sep): {formatRupiah(50000000)}</p>
              <p>Periode 3 (28 Sep): {formatRupiah(50000000)}</p>
              <p>Periode 4 (5 Okt): {formatRupiah(60000000)}</p>
              <p>Periode 5 (13 Okt): {formatRupiah(15000000)}</p>
              <p className="border-t pt-1 mt-1 font-bold">
                TOTAL: {formatRupiah(rekapitulasi.total_dana_masuk)}
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-2">⚠️ Perbedaan dengan Klaim Pengguna:</p>
            <div className="text-xs space-y-1">
              <p>Klaim pengguna: <strong>Rp416.500.000</strong></p>
              <p>Hasil perhitungan: <strong>{formatRupiah(rekapitulasi.total_dana_masuk)}</strong></p>
              <p className="font-bold text-red-600">
                Selisih: {formatRupiah(416500000 - rekapitulasi.total_dana_masuk)}
              </p>
              <p className="mt-2 text-amber-700">
                Perlu klarifikasi: Apakah ada dana lain yang belum tercatat, atau ada kesalahan input?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
