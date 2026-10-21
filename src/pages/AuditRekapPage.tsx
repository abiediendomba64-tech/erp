import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, getLocalDateISO } from '../data';
import {
  getBukuKasVerificationStatus, getTanahNilaiTotal, getTanahSisa,
  getTanahKelebihanBayar, hasKnownLandContractValue, getBekoNilai,
  getRelatedDocuments, hasDocumentEvidence
} from '../helpers';
import { FileBarChart, AlertTriangle, Download, ShieldAlert, LandPlot, Truck, Wallet, FileWarning } from 'lucide-react';

export default function AuditRekapPage() {
  const { state } = useAppContext();
  const [tanggalAsOf, setTanggalAsOf] = useState(getLocalDateISO());

  const cashRows = useMemo(() => state.bukuKas
    .filter(record => record.tgl <= tanggalAsOf)
    .slice()
    .sort((a, b) => a.tgl.localeCompare(b.tgl) || a.id.localeCompare(b.id)),
  [state.bukuKas, tanggalAsOf]);

  const totalMasuk = cashRows.reduce((sum, record) => sum + Math.max(0, Number(record.masuk) || 0), 0);
  const totalKeluar = cashRows.reduce((sum, record) => sum + Math.max(0, Number(record.keluar) || 0), 0);
  const saldoCatatan = totalMasuk - totalKeluar;
  const transactionsWithEvidence = cashRows.filter(record => getBukuKasVerificationStatus(record, state.arsipBukti) === 'LENGKAP').length;
  const transactionsWithoutEvidence = cashRows.length - transactionsWithEvidence;

  const categories = useMemo(() => {
    const result = new Map<string, { in: number; out: number; count: number }>();
    for (const record of cashRows) {
      const key = record.kategori.replace(/_/g, ' ');
      const current = result.get(key) || { in: 0, out: 0, count: 0 };
      current.in += record.masuk;
      current.out += record.keluar;
      current.count++;
      result.set(key, current);
    }
    return [...result.entries()].sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out));
  }, [cashRows]);

  const unknownLandValueCount = state.tanah.filter(land => !hasKnownLandContractValue(land)).length;
  const knownLandContractTotal = state.tanah.reduce((sum, land) => sum + getTanahNilaiTotal(land), 0);
  const landPaidTotal = state.tanah.reduce((sum, land) => sum + Math.max(0, land.dp), 0);
  const landRemainingTotal = state.tanah.reduce((sum, land) => sum + getTanahSisa(land), 0);
  const landOverpaymentTotal = state.tanah.reduce((sum, land) => sum + getTanahKelebihanBayar(land), 0);

  const bekoRows = state.beko.map(item => {
    const linkedDocs = getRelatedDocuments(state.arsipBukti, 'Beko', item.id, item.kode_bukti);
    const validDocs = linkedDocs.filter(doc => hasDocumentEvidence(doc) && doc.jenis !== 'Tidak_Ada');
    const hasVerified = validDocs.some(doc => doc.terverifikasi === 'Ya');
    return { item, value: getBekoNilai(item), validDocs, hasVerified };
  });
  const includedBeko = bekoRows.filter(row => row.item.termasuk_rekap !== false);
  const excludedBeko = bekoRows.filter(row => row.item.termasuk_rekap === false);
  const totalIncludedBeko = includedBeko.reduce((sum, row) => sum + row.value, 0);
  const totalExcludedBeko = excludedBeko.reduce((sum, row) => sum + row.value, 0);
  const bekoValueWithoutEvidence = includedBeko.filter(row => !row.hasVerified).reduce((sum, row) => sum + row.value, 0);
  const documentsWithoutFile = state.arsipBukti.filter(doc => !hasDocumentEvidence(doc)).length;
  const verifiedDocuments = state.arsipBukti.filter(doc => doc.terverifikasi === 'Ya' && hasDocumentEvidence(doc)).length;
  const landWithoutDocs = state.tanah.filter(land =>
    !getRelatedDocuments(state.arsipBukti, 'Tanah', land.id, land.kode_bukti)
      .some(doc => hasDocumentEvidence(doc) && doc.terverifikasi === 'Ya')
  ).length;

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['REKAP AUDIT PROYEK — DATA AKTIF'],
      ['Tanggal cut-off kas', tanggalAsOf],
      ['Catatan', 'Angka dihitung dari state saat ini. Tidak mengonfirmasi kas fisik, keaslian kuitansi, atau status hukum dokumen.'],
      [],
      ['RINGKASAN BUKU KAS'],
      ['Total masuk tercatat', totalMasuk],
      ['Total keluar tercatat', totalKeluar],
      ['Saldo catatan', saldoCatatan],
      ['Transaksi dengan bukti lengkap', transactionsWithEvidence],
      ['Transaksi tanpa bukti lengkap', transactionsWithoutEvidence],
      [],
      ['KATEGORI KAS'],
      ['Kategori', 'Baris', 'Masuk', 'Keluar'],
      ...categories.map(([category, value]) => [category, value.count, value.in, value.out]),
      [],
      ['REGISTER TANAH'],
      ['ID', 'Pemilik', 'Luas BT', 'Harga per BT', 'Nilai kontrak diketahui', 'Pembayaran tercatat', 'Sisa dari nilai diketahui', 'Potensi kelebihan bayar', 'Nilai diketahui?'],
      ...state.tanah.map(land => [
        land.id, land.pemilik, land.luas_bt, land.harga_per_bt, getTanahNilaiTotal(land),
        land.dp, getTanahSisa(land), getTanahKelebihanBayar(land),
        hasKnownLandContractValue(land) ? 'Ya' : 'Belum diketahui'
      ]),
      [],
      ['RINCIAN BEKO'],
      ['ID', 'Pekerjaan', 'Satuan', 'Volume/kuantitas', 'Tarif', 'Nilai formula', 'Lingkup rekap', 'Bukti valid', 'Bukti terverifikasi'],
      ...bekoRows.map(({ item, value, validDocs, hasVerified }) => [
        item.id, item.item, item.satuan_volume || 'belum diisi',
        item.satuan_volume === 'm3' ? item.panjang * item.lebar * item.tinggi : item.satuan_volume === 'ls' ? 1 : item.panjang,
        item.tarif, value, item.termasuk_rekap === false ? 'Di luar' : 'Masuk',
        validDocs.length, hasVerified ? 'Ya' : 'Tidak'
      ]),
      [],
      ['ARSIP DOKUMEN'],
      ['ID', 'Jenis', 'Judul', 'Nomor', 'Tanggal', 'Modul', 'ID terkait', 'Pihak', 'Nominal', 'File/URL tersedia', 'Status', 'Pemeriksa'],
      ...state.arsipBukti.map(doc => [
        doc.id, doc.jenis, doc.judul_dokumen || doc.catatan_audit,
        doc.nomor_dokumen || doc.kode_bukti, doc.tanggal_dokumen || doc.tgl_upload,
        doc.modul_terkait || '', doc.id_terkait || '', doc.penerima || '',
        doc.nominal || 0, hasDocumentEvidence(doc) ? 'Ya' : 'Tidak',
        doc.terverifikasi, doc.diverifikasi_oleh || ''
      ])
    ];
    const escape = (value: string | number) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + rows.map(row => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-audit-${tanggalAsOf}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FileBarChart size={24} className="text-indigo-600" />Rekap Audit Operasional</h1><p className="mt-1 text-gray-500">Laporan ini dihitung dari data saat ini. Angka referensi lama tidak dianggap sebagai data transaksi baru.</p></div>
        <div className="flex flex-wrap items-end gap-2"><label className="text-sm text-gray-600">Cut-off buku kas<input type="date" value={tanggalAsOf} onChange={e => setTanggalAsOf(e.target.value)} className="mt-1 block rounded-lg border bg-white px-3 py-2" /></label><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"><Download size={16} />Ekspor CSV</button></div>
      </header>

      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h2 className="flex items-center gap-2 font-semibold text-amber-900"><ShieldAlert size={18} />Peringatan audit</h2>
        <p className="mt-1 text-sm text-amber-900">Saldo buku kas bukan kas fisik atau saldo rekening bank. “Terverifikasi” berarti pemeriksa mencatat pemeriksaan terhadap file/URL yang terhubung; aplikasi tidak mengautentikasi pemalsuan kuitansi maupun mengesahkan akta notaris/sertifikat.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><Wallet size={18} className="text-indigo-600" /><p className="text-sm text-gray-500">Saldo buku kas</p></div><p className="mt-2 text-xl font-bold">{formatRupiah(saldoCatatan)}</p><p className="mt-1 text-xs text-gray-500">Masuk {formatRupiah(totalMasuk)} · Keluar {formatRupiah(totalKeluar)}</p></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><FileWarning size={18} className="text-amber-600" /><p className="text-sm text-gray-500">Buku kas perlu bukti</p></div><p className="mt-2 text-xl font-bold text-amber-700">{transactionsWithoutEvidence}</p><p className="mt-1 text-xs text-gray-500">Dari {cashRows.length} transaksi sampai {tanggalAsOf}</p></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><LandPlot size={18} className="text-blue-600" /><p className="text-sm text-gray-500">Nilai kontrak tanah diketahui</p></div><p className="mt-2 text-xl font-bold">{formatRupiah(knownLandContractTotal)}</p><p className="mt-1 text-xs text-gray-500">{unknownLandValueCount} bidang masih tanpa nilai kontrak</p></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><Truck size={18} className="text-orange-600" /><p className="text-sm text-gray-500">Biaya beko lingkup rekap</p></div><p className="mt-2 text-xl font-bold">{formatRupiah(totalIncludedBeko)}</p><p className="mt-1 text-xs text-gray-500">Tanpa bukti terverifikasi: {formatRupiah(bekoValueWithoutEvidence)}</p></div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Ringkasan menurut kategori buku kas</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">Kategori</th><th className="px-3 py-3 text-right">Baris</th><th className="px-3 py-3 text-right">Masuk</th><th className="px-3 py-3 text-right">Keluar</th><th className="px-3 py-3 text-right">Selisih</th></tr></thead><tbody className="divide-y">{categories.map(([category, value]) => <tr key={category}><td className="px-3 py-3">{category}</td><td className="px-3 py-3 text-right">{value.count}</td><td className="px-3 py-3 text-right text-emerald-700">{formatRupiah(value.in)}</td><td className="px-3 py-3 text-right text-red-700">{formatRupiah(value.out)}</td><td className="px-3 py-3 text-right font-semibold">{formatRupiah(value.in - value.out)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Register tanah — nilai dan bukti</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[950px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">Bidang/pemilik</th><th className="px-3 py-3 text-right">Nilai kontrak diketahui</th><th className="px-3 py-3 text-right">Pembayaran</th><th className="px-3 py-3 text-right">Sisa diketahui</th><th className="px-3 py-3 text-left">Dokumen</th></tr></thead><tbody className="divide-y">{state.tanah.map(land => {
          const docs = getRelatedDocuments(state.arsipBukti, 'Tanah', land.id, land.kode_bukti);
          const verified = docs.filter(doc => hasDocumentEvidence(doc) && doc.terverifikasi === 'Ya');
          return <tr key={land.id}><td className="px-3 py-3"><p className="font-medium">{land.id} — {land.pemilik}</p><p className="text-xs text-gray-500">{land.luas_bt > 0 ? land.luas_bt+' BT × '+formatRupiah(land.harga_per_bt) : 'Luas/harga belum tersedia'}</p></td><td className="px-3 py-3 text-right">{hasKnownLandContractValue(land) ? formatRupiah(getTanahNilaiTotal(land)) : <span className="text-amber-700">Belum diketahui</span>}</td><td className="px-3 py-3 text-right">{formatRupiah(land.dp)}</td><td className="px-3 py-3 text-right">{hasKnownLandContractValue(land) ? formatRupiah(getTanahSisa(land)) : 'Belum diketahui'}</td><td className="px-3 py-3">{verified.length ? verified.map(doc => doc.judul_dokumen || doc.jenis).join(', ') : <span className="text-red-700">Belum ada dokumen terverifikasi</span>}</td></tr>;
        })}</tbody></table></div>
        {landOverpaymentTotal > 0 && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Potensi kelebihan bayar pada bidang yang nilai kontraknya diketahui: {formatRupiah(landOverpaymentTotal)}. Periksa kontrak dan bukti pembayaran.</p>}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Rincian beko / cut & fill</h2>
        <p className="mt-1 text-xs text-gray-500">Formula: m³ = P × L × T × tarif; unit = kuantitas × tarif; LS = tarif lumpsum. Kode kuitansi tanpa file/URL bukan bukti.</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">Item</th><th className="px-3 py-3 text-right">Tarif</th><th className="px-3 py-3 text-right">Nilai formula</th><th className="px-3 py-3 text-center">Scope</th><th className="px-3 py-3 text-center">Bukti</th></tr></thead><tbody className="divide-y">{bekoRows.map(({ item, value, validDocs, hasVerified }) => <tr key={item.id}><td className="px-3 py-3"><p className="font-medium">{item.id} — {item.item}</p><p className="text-xs text-gray-500">{item.catatan}</p></td><td className="px-3 py-3 text-right">{formatRupiah(item.tarif)}</td><td className="px-3 py-3 text-right font-semibold">{formatRupiah(value)}</td><td className="px-3 py-3 text-center">{item.termasuk_rekap === false ? 'Di luar rekap' : 'Dalam rekap'}</td><td className="px-3 py-3 text-center">{hasVerified ? 'Terverifikasi manual' : validDocs.length ? 'Menunggu pemeriksaan' : 'Belum ada file'}</td></tr>)}</tbody><tfoot className="border-t-2 bg-gray-50"><tr><td className="px-3 py-3 font-bold">Total lingkup rekap</td><td></td><td className="px-3 py-3 text-right font-bold">{formatRupiah(totalIncludedBeko)}</td><td colSpan={2}></td></tr><tr><td className="px-3 py-3 font-bold">Total di luar lingkup rekap</td><td></td><td className="px-3 py-3 text-right font-bold">{formatRupiah(totalExcludedBeko)}</td><td colSpan={2}></td></tr></tfoot></table></div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Dokumen dan kelengkapan arsip</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Total catatan dokumen</p><p className="text-xl font-bold">{state.arsipBukti.length}</p></div>
          <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">File/URL ditandai terverifikasi</p><p className="text-xl font-bold text-emerald-800">{verifiedDocuments}</p></div>
          <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-red-700">Belum punya file/URL</p><p className="text-xl font-bold text-red-800">{documentsWithoutFile}</p></div>
        </div>
      </section>
    </div>
  );
}
