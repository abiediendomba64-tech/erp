import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, getLocalDateISO } from '../data';
import {
  getTanahNilaiTotal, getTanahSisa, getTanahKelebihanBayar,
  getBekoNilai, getBukuKasVerificationStatus,
  getRelatedDocuments, hasDocumentEvidence
} from '../helpers';
import { FileBarChart, AlertTriangle, Download, Printer, FileWarning, Scale, LandPlot, Truck, FolderArchive } from 'lucide-react';

export default function LaporanPage() {
  const { state } = useAppContext();
  const [tanggalAsOf, setTanggalAsOf] = useState(getLocalDateISO());

  const transaksiKasPerTanggal = useMemo(() => state.bukuKas
    .filter(record => record.tgl <= tanggalAsOf)
    .slice()
    .sort((a, b) => a.tgl.localeCompare(b.tgl) || a.id.localeCompare(b.id)),
  [state.bukuKas, tanggalAsOf]);

  const totalMasuk = transaksiKasPerTanggal.reduce((sum, record) => sum + Math.max(0, Number(record.masuk) || 0), 0);
  const totalKeluar = transaksiKasPerTanggal.reduce((sum, record) => sum + Math.max(0, Number(record.keluar) || 0), 0);
  const saldoCatatan = totalMasuk - totalKeluar;

  const nilaiTanah = state.tanah.reduce((sum, item) => sum + getTanahNilaiTotal(item), 0);
  const pembayaranTanah = state.tanah.reduce((sum, item) => sum + Math.max(0, Number(item.dp) || 0), 0);
  const sisaTanah = state.tanah.reduce((sum, item) => sum + getTanahSisa(item), 0);
  const kelebihanBayarTanah = state.tanah.reduce((sum, item) => sum + getTanahKelebihanBayar(item), 0);
  const nilaiBeko = state.beko.filter(item => item.termasuk_rekap !== false).reduce((sum, item) => sum + getBekoNilai(item), 0);
  const nilaiBekoDiLuar = state.beko.filter(item => item.termasuk_rekap === false).reduce((sum, item) => sum + getBekoNilai(item), 0);
  const nilaiBekoDenganBukti = state.beko.filter(item =>
    item.termasuk_rekap !== false &&
    getRelatedDocuments(state.arsipBukti, 'Beko', item.id, item.kode_bukti)
      .some(document => document.terverifikasi === 'Ya' && hasDocumentEvidence(document) && document.jenis !== 'Tidak_Ada')
  ).reduce((sum, item) => sum + getBekoNilai(item), 0);
  const nilaiBekoBelumDidukung = Math.max(0, nilaiBeko - nilaiBekoDenganBukti);

  const kasBelumDidukung = transaksiKasPerTanggal.filter(record =>
    getBukuKasVerificationStatus(record, state.arsipBukti) !== 'LENGKAP'
  );
  const tanahTanpaDokumen = state.tanah.filter(item =>
    !getRelatedDocuments(state.arsipBukti, 'Tanah', item.id, item.kode_bukti)
      .some(document => document.terverifikasi === 'Ya' && hasDocumentEvidence(document))
  );
  const utangTanah = state.posKewajiban.reduce((sum, item) => sum + Math.max(0, item.nilai_menurut_dokumen - item.dp_dibayar), 0);
  const arsipWithoutFile = state.arsipBukti.filter(document => !hasDocumentEvidence(document));
  const verifiedArchive = state.arsipBukti.filter(document => document.terverifikasi === 'Ya' && hasDocumentEvidence(document));

  const temuan = [
    {
      id: 'kas',
      judul: 'Transaksi kas yang belum memiliki bukti terverifikasi',
      jumlah: kasBelumDidukung.length,
      uraian: kasBelumDidukung.length
        ? `${kasBelumDidukung.length} baris buku kas belum terhubung ke file/URL bukti yang diperiksa.`
        : 'Semua baris pada periode ini memiliki bukti yang ditandai terverifikasi manual.',
      nominal: kasBelumDidukung.reduce((sum, record) => sum + record.masuk + record.keluar, 0)
    },
    {
      id: 'tanah',
      judul: 'Bidang tanah tanpa dokumen hukum terhubung',
      jumlah: tanahTanpaDokumen.length,
      uraian: `${tanahTanpaDokumen.length} bidang belum memiliki lampiran terverifikasi yang terhubung pada ID bidang tanah.`,
      nominal: tanahTanpaDokumen.reduce((sum, item) => sum + getTanahNilaiTotal(item), 0)
    },
    {
      id: 'beko',
      judul: 'Biaya beko tanpa bukti pembayaran terverifikasi',
      jumlah: state.beko.filter(item => item.termasuk_rekap !== false &&
        !getRelatedDocuments(state.arsipBukti, 'Beko', item.id, item.kode_bukti)
          .some(document => document.terverifikasi === 'Ya' && hasDocumentEvidence(document) && document.jenis !== 'Tidak_Ada')).length,
      uraian: 'Biaya dihitung dari volume/tarif, tetapi kode kuitansi atau status Lunas saja tidak membuktikan pembayaran.',
      nominal: nilaiBekoBelumDidukung
    },
    {
      id: 'arsip',
      judul: 'Catatan dokumen tanpa file atau URL',
      jumlah: arsipWithoutFile.length,
      uraian: 'Catatan metadata yang belum memiliki berkas tidak dihitung sebagai bukti asli.',
      nominal: arsipWithoutFile.reduce((sum, document) => sum + (Number(document.nominal) || 0), 0)
    }
  ];

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['LAPORAN OPERASIONAL PROYEK'],
      ['Tanggal cut-off buku kas', tanggalAsOf],
      ['Catatan', 'Nilai berasal dari data input saat ini; bukan konfirmasi kas fisik/bank dan bukan opini hukum.'],
      [],
      ['RINGKASAN BUKU KAS'],
      ['Total masuk', totalMasuk],
      ['Total keluar', totalKeluar],
      ['Saldo catatan', saldoCatatan],
      ['Transaksi belum ada bukti terverifikasi', kasBelumDidukung.length],
      [],
      ['REGISTER TANAH'],
      ['ID', 'Pemilik', 'Luas BT', 'Harga/BT', 'Nilai kontrak formula', 'Pembayaran tercatat', 'Sisa formula', 'Kelebihan bayar'],
      ...state.tanah.map(item => [item.id, item.pemilik, item.luas_bt, item.harga_per_bt, getTanahNilaiTotal(item), item.dp, getTanahSisa(item), getTanahKelebihanBayar(item)]),
      [],
      ['RINCIAN BEKO / PEKERJAAN TANAH'],
      ['ID', 'Uraian', 'Satuan', 'P', 'L', 'T', 'Tarif', 'Nilai formula', 'Lingkup rekap', 'Status pembayaran'],
      ...state.beko.map(item => [item.id, item.item, item.satuan_volume || '', item.panjang, item.lebar, item.tinggi, item.tarif, getBekoNilai(item), item.termasuk_rekap === false ? 'Di luar' : 'Masuk', item.status_pembayaran || item.status]),
      [],
      ['ARSIP BUKTI / DOKUMEN'],
      ['ID arsip', 'Jenis', 'Judul', 'Nomor dokumen', 'Tanggal dokumen', 'Modul terkait', 'ID terkait', 'Pihak', 'Nominal', 'Tautan', 'Status'],
      ...state.arsipBukti.map(document => [
        document.id, document.jenis, document.judul_dokumen || document.catatan_audit,
        document.nomor_dokumen || document.kode_bukti, document.tanggal_dokumen || document.tgl_upload,
        document.modul_terkait || '', document.id_terkait || '', document.penerima || '',
        document.nominal || 0, document.link_drive || (document.local_file_key ? 'file tersimpan lokal di browser' : ''),
        document.terverifikasi
      ]),
      [],
      ['DAFTAR TEMUAN'],
      ['Temuan', 'Jumlah', 'Uraian', 'Nominal terkait'],
      ...temuan.map(item => [item.judul, item.jumlah, item.uraian, item.nominal])
    ];
    const cell = (value: string | number) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `laporan-proyek-${tanggalAsOf}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FileBarChart size={24} className="text-indigo-600" />Laporan Operasional Proyek</h1><p className="mt-1 text-gray-500">Angka dihitung dari register, buku kas dan arsip dokumen yang sedang tersimpan.</p></div>
        <div className="flex flex-wrap gap-2"><label className="text-sm text-gray-600">Cut-off kas<input type="date" value={tanggalAsOf} onChange={event => setTanggalAsOf(event.target.value)} className="mt-1 block rounded-lg border bg-white px-3 py-2" /></label><button onClick={() => window.print()} className="mt-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"><Printer size={16} />Cetak</button><button onClick={exportCsv} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"><Download size={16} />Ekspor CSV</button></div>
      </header>

      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Batas interpretasi laporan</p>
        <p className="mt-1">Saldo ini adalah selisih catatan masuk-keluar sampai tanggal yang dipilih. Sistem belum membaca rekening bank, belum melakukan kas opname, dan belum menyatukan setiap modul ke satu database cloud. Kuitansi, akta, perjanjian, atau status lunas tidak boleh dianggap terverifikasi kecuali dokumen terkait benar-benar dilampirkan dan diperiksa.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Kas masuk tercatat</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatRupiah(totalMasuk)}</p><p className="mt-1 text-xs text-gray-500">Sampai {tanggalAsOf}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Kas keluar tercatat</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(totalKeluar)}</p><p className="mt-1 text-xs text-gray-500">Sampai {tanggalAsOf}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Saldo catatan</p><p className={`mt-2 text-xl font-bold ${saldoCatatan < 0 ? 'text-red-700' : 'text-indigo-700'}`}>{formatRupiah(saldoCatatan)}</p><p className="mt-1 text-xs text-gray-500">Bukan saldo rekening terkonfirmasi</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Utang tanah menurut register</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(utangTanah)}</p><p className="mt-1 text-xs text-gray-500">Berdasarkan data kewajiban yang diinput</p></div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><LandPlot size={18} className="text-blue-600" /><h2 className="font-semibold">Pembebasan tanah</h2></div><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Nilai formula</span><strong>{formatRupiah(nilaiTanah)}</strong></div><div className="flex justify-between"><span>Pembayaran tercatat</span><strong>{formatRupiah(pembayaranTanah)}</strong></div><div className="flex justify-between"><span>Sisa formula</span><strong className="text-red-700">{formatRupiah(sisaTanah)}</strong></div>{kelebihanBayarTanah > 0 && <p className="rounded bg-red-50 p-2 text-xs text-red-800">Potensi kelebihan bayar: {formatRupiah(kelebihanBayarTanah)}</p>}</div></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><Truck size={18} className="text-orange-600" /><h2 className="font-semibold">Beko / cut & fill</h2></div><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Biaya di lingkup rekap</span><strong>{formatRupiah(nilaiBeko)}</strong></div><div className="flex justify-between"><span>Di luar lingkup</span><strong>{formatRupiah(nilaiBekoDiLuar)}</strong></div><div className="flex justify-between"><span>Belum didukung dokumen terverifikasi</span><strong className="text-red-700">{formatRupiah(nilaiBekoBelumDidukung)}</strong></div></div></div>
        <div className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><FolderArchive size={18} className="text-purple-600" /><h2 className="font-semibold">Arsip dokumen</h2></div><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Semua catatan dokumen</span><strong>{state.arsipBukti.length}</strong></div><div className="flex justify-between"><span>File/URL tidak tersedia</span><strong className="text-red-700">{arsipWithoutFile.length}</strong></div><div className="flex justify-between"><span>File/URL ditandai terverifikasi</span><strong className="text-emerald-700">{verifiedArchive.length}</strong></div><div className="flex justify-between"><span>Bidang tanah tanpa dokumen</span><strong className="text-amber-700">{tanahTanpaDokumen.length}</strong></div></div></div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} className="text-amber-600" />Temuan berdasarkan data aktif</h2>
        <div className="mt-4 space-y-3">
          {temuan.map(item => <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium text-amber-950">{item.judul}</p><p className="mt-1 text-sm text-amber-900">{item.uraian}</p></div><div className="shrink-0 text-right"><p className="text-sm text-amber-800">{item.jumlah} item</p><p className="font-semibold">{formatRupiah(item.nominal)}</p></div></div></div>)}
          {temuan.every(item => item.jumlah === 0) && <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Tidak ditemukan temuan pada empat pemeriksaan data di halaman ini. Tetap periksa dokumen asli sebelum laporan digunakan secara resmi.</p>}
        </div>
      </section>

      <p className="text-xs text-gray-500">Dokumen hukum (AJB, PPJB, akta notaris, sertifikat, PBB, kontrak, SPK, BAST) merupakan kategori arsip. Aplikasi tidak memvalidasi keaslian hukum dokumen secara otomatis. Status diverifikasi manual harus diputuskan oleh pengguna yang benar-benar memeriksa dokumen aslinya.</p>
    </div>
  );
}
