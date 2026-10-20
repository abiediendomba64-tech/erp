import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { FileBarChart, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

export default function LaporanPage() {
  const { state } = useAppContext();

  // Calculations
  const totalKasMasuk = state.bukuKas.reduce((s, k) => s + k.masuk, 0);
  const totalKasKeluar = state.bukuKas.reduce((s, k) => s + k.keluar, 0);
  const saldo = totalKasMasuk - totalKasKeluar;

  const kasTanpaBukti = state.bukuKas.filter(k => k.status_verifikasi === 'TANPA_BUKTI');
  const kasPerluKonfirmasi = state.bukuKas.filter(k => k.status_verifikasi === 'PERLU_KONFIRMASI');
  const kasLengkap = state.bukuKas.filter(k => k.status_verifikasi === 'LENGKAP');

  const totalTanpaBukti = kasTanpaBukti.reduce((s, k) => s + k.keluar, 0);
  const totalPerluKonfirmasi = kasPerluKonfirmasi.reduce((s, k) => s + k.keluar, 0);
  const totalLengkap = kasLengkap.reduce((s, k) => s + k.keluar, 0);

  const totalKewajiban = state.posKewajiban.reduce((s, p) => s + p.nilai_menurut_workbook, 0);
  const totalSelisih = state.posKewajiban.reduce((s, p) => s + p.selisih, 0);

  // Kategori breakdown
  const kategoriBreakdown = state.bukuKas.reduce((acc, k) => {
    const kat = k.kategori;
    if (!acc[kat]) acc[kat] = { masuk: 0, keluar: 0 };
    acc[kat].masuk += k.masuk;
    acc[kat].keluar += k.keluar;
    return acc;
  }, {} as Record<string, { masuk: number; keluar: number }>);

  // Bukti tidak lengkap
  const buktiTidakLengkap = state.arsipBukti.filter(b => b.terverifikasi !== 'Ya');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileBarChart size={24} className="text-indigo-500" />
          Laporan & Rekonsiliasi
        </h1>
        <p className="text-gray-500 mt-1">Laporan profesional dari seluruh data — buku kas, bukti, kewajiban, dan rekonsiliasi.</p>
      </div>

      {/* Report 1: Buku Kas per Proyek */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" />
            Buku Kas per Kategori
          </h3>
          <p className="text-xs text-gray-500 mt-1">BUKU_KAS dikelompokkan per kategori</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Masuk</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Keluar</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(kategoriBreakdown).map(([kat, val]) => (
                <tr key={kat} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{kat.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(val.masuk)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatRupiah(val.keluar)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(val.masuk - val.keluar)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(totalKasMasuk)}</td>
                <td className="px-4 py-3 text-right font-bold text-red-600">{formatRupiah(totalKasKeluar)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(saldo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Report 2: Daftar Bukti Tidak Lengkap */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Daftar Bukti Tidak Lengkap
          </h3>
          <p className="text-xs text-gray-500 mt-1">Transaksi yang memerlukan bukti tambahan untuk audit</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Penerima</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {buktiTidakLengkap.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-purple-600">{b.kode_bukti}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.penerima}</td>
                  <td className="px-4 py-3 text-gray-600">{b.keterangan}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRupiah(b.nominal)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${b.terverifikasi === 'Perlu_Konfirmasi' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {b.terverifikasi === 'Perlu_Konfirmasi' ? 'Perlu Konfirmasi' : 'Tidak Ada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{b.catatan_audit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report 3: Rekonsiliasi Utang Tanah */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle size={18} className="text-amber-500" />
            Rekonsiliasi Utang Tanah
          </h3>
          <p className="text-xs text-gray-500 mt-1">Perbandingan POS_KEWAJIBAN — Dokumen PDF vs Workbook terbaru</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pihak</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai Dokumen (PDF)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai Workbook</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Selisih</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.posKewajiban.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.pihak}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(p.nilai_menurut_dokumen)}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(p.nilai_menurut_workbook)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${p.selisih !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatRupiah(p.selisih)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      p.status === 'Sepakat' ? 'bg-emerald-100 text-emerald-800' :
                      p.status === 'Dalam_Penelusuran' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold">{formatRupiah(state.posKewajiban.reduce((s, p) => s + p.nilai_menurut_dokumen, 0))}</td>
                <td className="px-4 py-3 text-right font-bold">{formatRupiah(totalKewajiban)}</td>
                <td className={`px-4 py-3 text-right font-bold ${totalSelisih !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalSelisih)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Report 4: Ringkasan Verifikasi Kas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Ringkasan Verifikasi Kas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs text-emerald-600 font-medium">Kas dengan Bukti Lengkap</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{formatRupiah(totalLengkap)}</p>
            <p className="text-xs text-emerald-500 mt-1">{kasLengkap.length} transaksi</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-xs text-red-600 font-medium">Kas Tanpa Bukti</p>
            <p className="text-xl font-bold text-red-700 mt-1">{formatRupiah(totalTanpaBukti)}</p>
            <p className="text-xs text-red-500 mt-1">{kasTanpaBukti.length} transaksi</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs text-amber-600 font-medium">Kas Perlu Konfirmasi</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatRupiah(totalPerluKonfirmasi)}</p>
            <p className="text-xs text-amber-500 mt-1">{kasPerluKonfirmasi.length} transaksi</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <p className="text-sm text-indigo-800">
            <strong>Total Kewajiban (Lapisan 3):</strong> {formatRupiah(totalKewajiban)} — <em>TIDAK termasuk dalam kas keluar. Ini adalah komitmen/utang yang belum tentu dibayar.</em>
          </p>
        </div>
      </div>

      {/* Report 5: Temuan Audit */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />
          Temuan Audit Utama
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm font-medium text-red-800">1. Selisih Rekonsiliasi Rp2.500.000</p>
            <p className="text-xs text-red-600 mt-1">PDF mencatat Rp34.700.000, Workbook mencatat Rp37.200.000. Status: Dalam Penelusuran.</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm font-medium text-red-800">2. Sisa Pembayaran Sukiat Rp13.000.000</p>
            <p className="text-xs text-red-600 mt-1">Kwitansi hanya menyebut DP Rp1.400.000. Bukti pelunasan sisa Rp13.000.000 belum tersedia.</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm font-medium text-red-800">3. Sisa Pembayaran Ija 79 BT Rp33.200.000</p>
            <p className="text-xs text-red-600 mt-1">Kwitansi hanya menyebut DP Rp30.000.000. Bukti pelunasan sisa Rp33.200.000 belum tersedia.</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm font-medium text-amber-800">4. Beko Item 4 & 6 — Tanpa Kwitansi</p>
            <p className="text-xs text-amber-600 mt-1">Item 4 (Rp16.900.000) foto belum tersedia. Item 6 (Rp13.125.000) belum ada kwitansi.</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm font-medium text-amber-800">5. Enapsiah dan Bonus Ija Rp71.000.000</p>
            <p className="text-xs text-amber-600 mt-1">Perlu klarifikasi status pembayaran dan bukti pendukung.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
