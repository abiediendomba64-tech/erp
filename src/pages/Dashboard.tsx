import { useMemo } from 'react';
import { useAppContext } from '../store';
import { AUDIT_CONSTANTS, formatRupiah } from '../data';
import {
  getTanahNilaiTotal, getTanahSisa, getTanahKelebihanBayar, hasKnownLandContractValue,
  getBekoNilai, getBukuKasVerificationStatus,
  getRelatedDocuments, hasDocumentEvidence
} from '../helpers';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Scale, LandPlot, Truck, FileWarning, Files } from 'lucide-react';

export default function Dashboard() {
  const { state } = useAppContext();

  const totalMasuk = state.bukuKas.reduce((sum, record) => sum + Math.max(0, Number(record.masuk) || 0), 0);
  const totalKeluar = state.bukuKas.reduce((sum, record) => sum + Math.max(0, Number(record.keluar) || 0), 0);
  const saldoCatatan = totalMasuk - totalKeluar;

  const totalNilaiTanah = state.tanah.reduce((sum, item) => sum + getTanahNilaiTotal(item), 0);
  const totalDibayarTanah = state.tanah.reduce((sum, item) => sum + Math.max(0, Number(item.dp) || 0), 0);
  const totalSisaUtangTanah = state.tanah.reduce((sum, item) => sum + getTanahSisa(item), 0);
  const potensiKelebihanBayar = state.tanah.reduce((sum, item) => sum + getTanahKelebihanBayar(item), 0);
  const totalLuas = state.tanah.reduce((sum, item) => sum + Math.max(0, Number(item.luas_bt) || 0), 0);
  const bidangNilaiBelumDiketahui = state.tanah.filter(item => !hasKnownLandContractValue(item)).length;

  const includedBeko = state.beko.filter(item => item.termasuk_rekap !== false);
  const excludedBeko = state.beko.filter(item => item.termasuk_rekap === false);
  const totalBiayaBeko = includedBeko.reduce((sum, item) => sum + getBekoNilai(item), 0);
  const totalDiLuarBeko = excludedBeko.reduce((sum, item) => sum + getBekoNilai(item), 0);
  const bekoWithVerifiedEvidence = includedBeko
    .filter(item => getRelatedDocuments(state.arsipBukti, 'Beko', item.id, item.kode_bukti)
      .some(doc => hasDocumentEvidence(doc) && doc.terverifikasi === 'Ya' && doc.jenis !== 'Tidak_Ada'))
    .reduce((sum, item) => sum + getBekoNilai(item), 0);
  const bekoNoEvidence = totalBiayaBeko - bekoWithVerifiedEvidence;

  const bookStatusCounts = state.bukuKas.reduce((counts, record) => {
    const status = getBukuKasVerificationStatus(record, state.arsipBukti);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  const cashRowsWithoutProof = state.bukuKas.filter(record =>
    getBukuKasVerificationStatus(record, state.arsipBukti) !== 'LENGKAP'
  ).length;

  const landWithoutDocuments = state.tanah.filter(item =>
    !getRelatedDocuments(state.arsipBukti, 'Tanah', item.id, item.kode_bukti)
      .some(doc => hasDocumentEvidence(doc) && doc.terverifikasi === 'Ya')
  ).length;
  const missingDocumentRows = state.arsipBukti.filter(doc => !hasDocumentEvidence(doc)).length;

  const historicalComparisons = useMemo(() => [
    { label: 'Total masuk pada rekap lama', current: totalMasuk, reference: AUDIT_CONSTANTS.TOTAL_DANA_MASUK },
    { label: 'Total keluar pada rekap lama', current: totalKeluar, reference: AUDIT_CONSTANTS.TOTAL_PENGELUARAN },
    { label: 'Saldo kas catatan pada rekap lama', current: saldoCatatan, reference: AUDIT_CONSTANTS.SALDO_KAS_CATATAN },
    { label: 'Total nilai tanah pada rekap lama', current: totalNilaiTanah, reference: AUDIT_CONSTANTS.TOTAL_NILAI_TANAH },
    { label: 'Total pembayaran tanah pada rekap lama', current: totalDibayarTanah, reference: AUDIT_CONSTANTS.TOTAL_DIBAYAR_TANAH },
    { label: 'Total biaya beko pada rekap lama', current: totalBiayaBeko, reference: AUDIT_CONSTANTS.TOTAL_BIAYA_BEKO },
  ], [totalMasuk, totalKeluar, saldoCatatan, totalNilaiTanah, totalDibayarTanah, totalBiayaBeko]);

  const matchesOldReference = historicalComparisons.filter(item => item.current === item.reference).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Proyek & Keuangan</h1>
        <p className="mt-1 text-gray-500">Ringkasan dihitung dari catatan yang aktif. Perbandingan laporan lama adalah referensi manual, bukan bukti transaksi atau kas fisik.</p>
      </header>

      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="mt-0.5 text-amber-700" />
          <div>
            <h2 className="font-semibold text-amber-900">Jangan samakan catatan dengan bukti terverifikasi</h2>
            <p className="mt-1 text-sm text-amber-900">Angka di bawah berasal dari input/rekap yang tersimpan. Saldo kas fisik/bank belum dihitung otomatis karena belum ada rekonsiliasi rekening atau kas opname yang terhubung. Data tanpa bukti tetap ditandai perlu konfirmasi.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-gray-500">Total uang masuk tercatat</p><TrendingUp className="text-emerald-600" size={21} /></div><p className="mt-2 text-xl font-bold text-emerald-700">{formatRupiah(totalMasuk)}</p><p className="mt-1 text-xs text-gray-500">{state.bukuKas.length} transaksi kas</p></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-gray-500">Total uang keluar tercatat</p><TrendingDown className="text-red-600" size={21} /></div><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(totalKeluar)}</p><p className="mt-1 text-xs text-gray-500">Sesuai baris buku kas aktif</p></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-gray-500">Saldo buku kas</p><Wallet className="text-indigo-600" size={21} /></div><p className={`mt-2 text-xl font-bold ${saldoCatatan < 0 ? 'text-red-700' : 'text-indigo-700'}`}>{formatRupiah(saldoCatatan)}</p><p className="mt-1 text-xs text-gray-500">Saldo catatan, bukan kas fisik terkonfirmasi</p></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-gray-500">Transaksi belum lengkap buktinya</p><FileWarning className="text-amber-600" size={21} /></div><p className="mt-2 text-xl font-bold text-amber-700">{cashRowsWithoutProof}</p><p className="mt-1 text-xs text-gray-500">{bookStatusCounts.LENGKAP || 0} telah terhubung ke bukti terverifikasi</p></div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><LandPlot size={20} className="text-blue-600" /><h2 className="font-semibold">Pembebasan tanah</h2></div><p className="mt-3 text-lg font-bold">{formatRupiah(totalNilaiTanah)}</p><p className="mt-1 text-xs text-gray-500">{state.tanah.length} bidang · {totalLuas.toLocaleString('id-ID')} BT</p><div className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">Pembayaran tercatat</span><span>{formatRupiah(totalDibayarTanah)}</span></div><div className="flex justify-between"><span className="text-gray-500">Sisa menurut rumus</span><span className="font-semibold text-red-700">{formatRupiah(totalSisaUtangTanah)}</span></div></div></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><Truck size={20} className="text-orange-600" /><h2 className="font-semibold">Pekerjaan beko</h2></div><p className="mt-3 text-lg font-bold">{formatRupiah(totalBiayaBeko)}</p><p className="mt-1 text-xs text-gray-500">Nilai dihitung dari volume/tarif atau LS/unit</p><div className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">Di luar lingkup</span><span>{formatRupiah(totalDiLuarBeko)}</span></div><div className="flex justify-between"><span className="text-gray-500">Nilai tanpa bukti</span><span className="font-semibold text-red-700">{formatRupiah(bekoNoEvidence)}</span></div></div></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><Scale size={20} className="text-red-600" /><h2 className="font-semibold">Sisa utang tanah</h2></div><p className="mt-3 text-lg font-bold text-red-700">{formatRupiah(totalSisaUtangTanah)}</p><p className="mt-1 text-xs text-gray-500">Dihitung dari nilai kesepakatan dikurangi pembayaran</p><div className="mt-3 text-sm"><span className="text-gray-500">Potensi kelebihan bayar: </span><strong>{formatRupiah(potensiKelebihanBayar)}</strong></div></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><Files size={20} className="text-purple-600" /><h2 className="font-semibold">Dokumen pendukung</h2></div><p className="mt-3 text-lg font-bold">{state.arsipBukti.length}</p><p className="mt-1 text-xs text-gray-500">Catatan dokumen/kuitansi</p><div className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">Belum punya file/URL</span><span className="font-semibold text-red-700">{missingDocumentRows}</span></div><div className="flex justify-between"><span className="text-gray-500">Bidang tanah tanpa dokumen terverifikasi</span><span className="font-semibold text-amber-700">{landWithoutDocuments}</span></div></div></div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Perbandingan terhadap rekap audit lama</h2><p className="mt-1 text-xs text-gray-500">Nilai referensi lama diketik manual. Cocok ≠ transaksi sudah dibuktikan; selisih harus direkonsiliasi.</p></div>
          <p className="text-sm font-semibold">{matchesOldReference}/{historicalComparisons.length} angka cocok dengan referensi lama</p>
        </div>
        <div className="mt-4 space-y-2">
          {historicalComparisons.map(item => {
            const matches = item.current === item.reference;
            return <div key={item.label} className={`flex flex-col gap-1 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between ${matches ? 'bg-gray-50' : 'bg-amber-50'}`}>
              <span className="text-sm text-gray-700">{item.label}</span>
              <div className="flex flex-wrap items-center gap-4 text-sm"><span>Aktif: <strong>{formatRupiah(item.current)}</strong></span><span className="text-gray-500">Referensi: {formatRupiah(item.reference)}</span><span className={matches ? 'text-emerald-700' : 'text-amber-800'}>{matches ? 'Sama' : 'Selisih'}</span></div>
            </div>;
          })}
        </div>
      </section>
    </div>
  );
}
