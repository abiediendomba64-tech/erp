import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, getLocalDateISO } from '../data';
import { saveLocalDocumentFile } from '../utils/localDocuments';
import type { ArsipBukti } from '../types';
import { FileText, Printer, Archive, ChevronDown, ShieldAlert } from 'lucide-react';

type DraftKind = 'kwitansi' | 'perjanjian_tanah' | 'spk' | 'bast' | 'surat_pernyataan';

type DraftForm = {
  kind: DraftKind;
  nomor: string;
  tanggal: string;
  namaUsaha: string;
  pihakPertama: string;
  pihakKedua: string;
  objek: string;
  lokasi: string;
  luas: string;
  nomorSertifikat: string;
  nilaiKontrak: string;
  jumlahPembayaran: string;
  terbilang: string;
  metodePembayaran: string;
  jadwalPembayaran: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  hasilPekerjaan: string;
  saksiPertama: string;
  saksiKedua: string;
  catatan: string;
};

const initialForm: DraftForm = {
  kind: 'kwitansi',
  nomor: '',
  tanggal: getLocalDateISO(),
  namaUsaha: '',
  pihakPertama: '',
  pihakKedua: '',
  objek: '',
  lokasi: '',
  luas: '',
  nomorSertifikat: '',
  nilaiKontrak: '',
  jumlahPembayaran: '',
  terbilang: '',
  metodePembayaran: '',
  jadwalPembayaran: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  hasilPekerjaan: '',
  saksiPertama: '',
  saksiKedua: '',
  catatan: '',
};

const kindMeta: Record<DraftKind, { title: string; archiveKind: ArsipBukti['jenis']; module: NonNullable<ArsipBukti['modul_terkait']>; description: string }> = {
  kwitansi: {
    title: 'KUITANSI / TANDA TERIMA PEMBAYARAN',
    archiveKind: 'Kwitansi_Foto',
    module: 'Buku Kas',
    description: 'Bukti penerimaan uang yang perlu ditandatangani penerima dan dilengkapi bukti transfer/kas.'
  },
  perjanjian_tanah: {
    title: 'DRAF PERJANJIAN KESEPAKATAN PEMBEBASAN TANAH',
    archiveKind: 'Perjanjian_Jual_Beli',
    module: 'Tanah',
    description: 'Draf kesepakatan awal antara para pihak, bukan AJB atau akta Notaris/PPAT.'
  },
  spk: {
    title: 'DRAF SURAT PERINTAH KERJA / KONTRAK PEKERJAAN',
    archiveKind: 'SPK',
    module: 'Kontrak',
    description: 'Draf ruang lingkup, nilai, jangka waktu, syarat pembayaran, progres, dan serah terima.'
  },
  bast: {
    title: 'DRAF BERITA ACARA SERAH TERIMA / PROGRES PEKERJAAN',
    archiveKind: 'BAST',
    module: 'Proyek',
    description: 'Catatan volume/progres yang diperiksa dan ditandatangani pihak yang berwenang.'
  },
  surat_pernyataan: {
    title: 'DRAF SURAT PERNYATAAN / KESEPAKATAN',
    archiveKind: 'Surat_Pernyataan',
    module: 'Proyek',
    description: 'Draf pernyataan yang harus dibaca, dilengkapi, dan ditandatangani pihak terkait.'
  }
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const rupiah = (raw: string): string => {
  if (!raw.trim()) return 'Belum diisi';
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? formatRupiah(value) : 'Nominal belum valid';
};

const valueOrBlank = (raw: string): string => raw.trim() || '................................................................';

function documentBody(form: DraftForm): string {
  const meta = kindMeta[form.kind];
  const company = form.namaUsaha.trim() ? escapeHtml(form.namaUsaha) : '................................................................';
  const firstParty = escapeHtml(valueOrBlank(form.pihakPertama));
  const secondParty = escapeHtml(valueOrBlank(form.pihakKedua));
  const object = escapeHtml(valueOrBlank(form.objek));
  const location = escapeHtml(valueOrBlank(form.lokasi));
  const date = escapeHtml(form.tanggal || 'Tanggal belum diisi');
  const number = escapeHtml(valueOrBlank(form.nomor));
  const contractValue = escapeHtml(rupiah(form.nilaiKontrak));
  const paymentValue = escapeHtml(rupiah(form.jumlahPembayaran));
  const spelled = escapeHtml(valueOrBlank(form.terbilang));
  const method = escapeHtml(valueOrBlank(form.metodePembayaran));
  const notes = escapeHtml(valueOrBlank(form.catatan)).replace(/\n/g, '<br>');
  const witness1 = escapeHtml(valueOrBlank(form.saksiPertama));
  const witness2 = escapeHtml(valueOrBlank(form.saksiKedua));
  const certificate = escapeHtml(valueOrBlank(form.nomorSertifikat));
  const area = escapeHtml(valueOrBlank(form.luas));
  const schedule = escapeHtml(valueOrBlank(form.jadwalPembayaran)).replace(/\n/g, '<br>');
  const start = escapeHtml(valueOrBlank(form.tanggalMulai));
  const finish = escapeHtml(valueOrBlank(form.tanggalSelesai));
  const work = escapeHtml(valueOrBlank(form.hasilPekerjaan)).replace(/\n/g, '<br>');

  let clauses = '';
  let signatures = '';
  if (form.kind === 'kwitansi') {
    clauses = `
      <p>Telah diterima uang dari: <strong>${firstParty}</strong></p>
      <p>Uang diterima oleh: <strong>${secondParty}</strong></p>
      <p>Jumlah pembayaran: <strong>${paymentValue}</strong></p>
      <p>Terbilang: <strong>${spelled}</strong></p>
      <p>Untuk pembayaran: <strong>${object}</strong></p>
      <p>Proyek / lokasi terkait: <strong>${location}</strong></p>
      <p>Metode pembayaran / referensi: <strong>${method}</strong></p>
      <p>Catatan: ${notes}</p>
      <p class="small">Kuitansi ini menjadi bukti penerimaan setelah isi diperiksa dan ditandatangani penerima yang berwenang. Lampirkan bukti transfer atau catatan kas yang relevan. Jangan menandatangani penerimaan sebelum uang benar-benar diterima.</p>`;
    signatures = `
      <div class="sign"><p>Pembayar</p><div class="space"></div><strong>${firstParty}</strong></div>
      <div class="sign"><p>Penerima uang</p><div class="space"></div><strong>${secondParty}</strong></div>`;
  } else if (form.kind === 'perjanjian_tanah') {
    clauses = `
      <p><strong>Pasal 1 — Para Pihak.</strong> Pihak Pertama: ${firstParty}. Pihak Kedua: ${secondParty}. Identitas, kewenangan bertindak, status perkawinan bila relevan, dan persetujuan pemilik/kuasa wajib diperiksa dari dokumen asli.</p>
      <p><strong>Pasal 2 — Objek.</strong> Objek kesepakatan: ${object}. Lokasi/alamat: ${location}. Luas menurut dokumen/pengukuran: ${area}. Nomor sertifikat/alas hak: ${certificate}. Batas-batas dan status sengketa harus dicantumkan berdasarkan dokumen yang diperiksa.</p>
      <p><strong>Pasal 3 — Nilai Kesepakatan.</strong> Nilai yang disepakati para pihak: <strong>${contractValue}</strong>. Nilai ini harus cocok dengan bukti dan kesepakatan tertulis. Jangan gunakan total DP sebagai pengganti nilai kontrak.</p>
      <p><strong>Pasal 4 — Pembayaran.</strong> Pembayaran yang dicatat pada draf ini: ${paymentValue}. Metode: ${method}. Jadwal dan syarat pelunasan: ${schedule}. Setiap pembayaran harus mendapat kuitansi terpisah atau bukti transfer yang dapat ditelusuri.</p>
      <p><strong>Pasal 5 — Dokumen dan pelaksanaan.</strong> Para pihak wajib memeriksa identitas, alas hak/sertifikat, PBB, batas dan pengukuran bidang, beban/sita/sengketa, status pajak, serta dokumen pendukung lain yang relevan. Pengalihan hak dan akta yang diwajibkan harus diproses melalui Notaris/PPAT/instansi berwenang sesuai ketentuan yang berlaku.</p>
      <p><strong>Pasal 6 — Ketentuan lain.</strong> ${notes}. Perubahan kesepakatan harus dibuat secara tertulis dan ditandatangani para pihak.</p>`;
    signatures = `
      <div class="sign"><p>Pihak Pertama</p><div class="space"></div><strong>${firstParty}</strong></div>
      <div class="sign"><p>Pihak Kedua</p><div class="space"></div><strong>${secondParty}</strong></div>
      <div class="sign"><p>Saksi 1</p><div class="space"></div><strong>${witness1}</strong></div>
      <div class="sign"><p>Saksi 2</p><div class="space"></div><strong>${witness2}</strong></div>`;
  } else if (form.kind === 'spk') {
    clauses = `
      <p><strong>Pasal 1 — Pihak dan pekerjaan.</strong> Pemberi kerja: ${firstParty}. Pelaksana/kontraktor: ${secondParty}. Objek pekerjaan: ${object}. Lokasi proyek: ${location}.</p>
      <p><strong>Pasal 2 — Nilai kontrak.</strong> Nilai yang disetujui: <strong>${contractValue}</strong>. Rincian volume, satuan, harga satuan dan exclusions wajib merujuk pada RAB/BOQ yang disetujui sebagai lampiran. Pekerjaan di luar lingkup memerlukan persetujuan tertulis sebelum dikerjakan.</p>
      <p><strong>Pasal 3 — Waktu.</strong> Mulai: ${start}. Selesai: ${finish}. Perubahan waktu harus memiliki alasan, catatan progres, dan persetujuan tertulis.</p>
      <p><strong>Pasal 4 — Pembayaran.</strong> Metode/ketentuan: ${method}. Jadwal termin, uang muka, retensi, syarat invoice, bukti volume dan tanggal jatuh tempo: ${schedule}. Pembayaran progres dilakukan setelah dokumen tagihan, laporan kemajuan/opname, dan persetujuan pejabat terkait lengkap.</p>
      <p><strong>Pasal 5 — Mutu, keselamatan, dan serah terima.</strong> Pelaksana wajib memenuhi spesifikasi yang disepakati, menjaga keselamatan kerja dan lingkungan, melaporkan penyimpangan, serta memperbaiki cacat sesuai masa pemeliharaan yang disepakati. Hasil pekerjaan harus dituangkan dalam BAST/opname yang ditandatangani.</p>
      <p><strong>Pasal 6 — Catatan khusus.</strong> ${notes}. Draf ini perlu diperiksa dan disetujui oleh para pihak sebelum ditandatangani.</p>`;
    signatures = `
      <div class="sign"><p>Pemberi kerja</p><div class="space"></div><strong>${firstParty}</strong></div>
      <div class="sign"><p>Pelaksana/kontraktor</p><div class="space"></div><strong>${secondParty}</strong></div>
      <div class="sign"><p>Saksi 1</p><div class="space"></div><strong>${witness1}</strong></div>
      <div class="sign"><p>Saksi 2</p><div class="space"></div><strong>${witness2}</strong></div>`;
  } else if (form.kind === 'bast') {
    clauses = `
      <p>Pihak yang menyerahkan: <strong>${firstParty}</strong>. Pihak yang menerima/memeriksa: <strong>${secondParty}</strong>.</p>
      <p><strong>Objek pekerjaan / hasil yang diperiksa:</strong> ${object}</p>
      <p><strong>Lokasi:</strong> ${location}</p>
      <p><strong>Periode pelaksanaan:</strong> ${start} s.d. ${finish}</p>
      <p><strong>Volume/progres, hasil pengukuran/opname, kekurangan, dan perbaikan yang disyaratkan:</strong><br>${work}</p>
      <p><strong>Nilai kontrak acuan:</strong> ${contractValue}. <strong>Nilai tagihan/termin yang diperiksa:</strong> ${paymentValue}.</p>
      <p><strong>Dokumen lampiran yang diperiksa:</strong> ${notes}</p>
      <p>Berita acara ini tidak otomatis berarti tagihan dibayar. Pembayaran tetap memerlukan approval dan bukti pembayaran yang terpisah.</p>`;
    signatures = `
      <div class="sign"><p>Yang menyerahkan</p><div class="space"></div><strong>${firstParty}</strong></div>
      <div class="sign"><p>Yang menerima / memeriksa</p><div class="space"></div><strong>${secondParty}</strong></div>
      <div class="sign"><p>Saksi 1</p><div class="space"></div><strong>${witness1}</strong></div>
      <div class="sign"><p>Saksi 2</p><div class="space"></div><strong>${witness2}</strong></div>`;
  } else {
    clauses = `
      <p>Yang bertanda tangan di bawah ini:</p>
      <p>Nama/Pihak Pertama: <strong>${firstParty}</strong></p>
      <p>Nama/Pihak Kedua (jika ada): <strong>${secondParty}</strong></p>
      <p>Objek/hal yang dinyatakan: <strong>${object}</strong></p>
      <p>Lokasi/proyek terkait: <strong>${location}</strong></p>
      <p>Nilai nominal jika relevan: <strong>${paymentValue}</strong></p>
      <p>Dengan ini menerangkan bahwa: ${notes}</p>
      <p>Para pihak diminta membaca, memastikan fakta dan lampiran benar, serta menandatangani hanya bila menyetujui isi pernyataan ini.</p>`;
    signatures = `
      <div class="sign"><p>Pihak Pertama</p><div class="space"></div><strong>${firstParty}</strong></div>
      <div class="sign"><p>Pihak Kedua</p><div class="space"></div><strong>${secondParty}</strong></div>
      <div class="sign"><p>Saksi 1</p><div class="space"></div><strong>${witness1}</strong></div>
      <div class="sign"><p>Saksi 2</p><div class="space"></div><strong>${witness2}</strong></div>`;
  }

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(meta.title)} — ${number}</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #161616; font-size: 12pt; line-height: 1.55; }
  h1 { text-align: center; font-size: 16pt; margin: 0 0 8px; }
  h2 { text-align: center; font-size: 11pt; font-weight: normal; margin: 0 0 20px; }
  .meta { border-bottom: 2px solid #222; padding-bottom: 14px; margin-bottom: 18px; }
  .notice { border: 1px solid #9a6c12; background: #fff8e7; padding: 10px; font-size: 9.5pt; margin: 16px 0; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 38px 32px; margin-top: 40px; }
  .sign { min-height: 120px; text-align: center; }
  .space { height: 70px; }
  .small { font-size: 9.5pt; color: #444; margin-top: 24px; }
  footer { margin-top: 32px; font-size: 9pt; color: #555; border-top: 1px solid #bbb; padding-top: 8px; }
</style></head><body>
<div class="meta"><h1>${escapeHtml(meta.title)}</h1><h2>${company}</h2><p style="text-align:center">Nomor: <strong>${number}</strong> &nbsp; | &nbsp; Tanggal: <strong>${date}</strong></p></div>
${clauses}
<div class="signatures">${signatures}</div>
<div class="notice"><strong>STATUS DOKUMEN: DRAF.</strong> Dokumen ini dibuat dari data yang diinput pengguna, belum diverifikasi ke dokumen asli, tidak ditandatangani secara elektronik, dan tidak menggantikan nasihat hukum atau formalitas yang disyaratkan. Khusus AJB/akta notaris, proses dan penerbitan harus ditangani Notaris/PPAT berwenang; aplikasi ini tidak menerbitkan akta resmi.</div>
<footer>Disiapkan melalui ERP Proyek · Cetak/PDF ini bukan tanda bukti bahwa uang sudah diterima ataupun pekerjaan sudah disetujui.</footer>
</body></html>`;
}

function safeFileName(value: string): string {
  return (value || 'dokumen-proyek')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'dokumen-proyek';
}

export default function DokumenProyekGenerator() {
  const { dispatch } = useAppContext();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DraftForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const update = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const validate = (): string => {
    if (!form.nomor.trim()) return 'Nomor dokumen draft wajib diisi.';
    if (!form.tanggal) return 'Tanggal dokumen wajib diisi.';
    if (!form.pihakPertama.trim() || !form.pihakKedua.trim()) return 'Nama kedua pihak wajib diisi.';
    if (!form.objek.trim()) return 'Uraian objek atau transaksi wajib diisi.';
    if (['kwitansi', 'perjanjian_tanah', 'spk'].includes(form.kind) && !(Number(form.nilaiKontrak) > 0 || Number(form.jumlahPembayaran) > 0)) {
      return 'Isi nilai kontrak atau nominal pembayaran yang benar-benar disepakati.';
    }
    if (form.kind === 'kwitansi' && !(Number(form.jumlahPembayaran) > 0)) return 'Kuitansi membutuhkan jumlah pembayaran yang lebih besar dari nol.';
    if (form.kind === 'perjanjian_tanah' && !form.lokasi.trim()) return 'Lokasi tanah wajib diisi pada draf perjanjian.';
    if (form.kind === 'spk' && (!form.tanggalMulai || !form.tanggalSelesai)) return 'Tanggal mulai dan tanggal selesai pekerjaan wajib diisi pada SPK.';
    return '';
  };

  const openPrintView = () => {
    setError('');
    setMessage('');
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const popup = window.open('', '_blank', 'width=900,height=800');
    if (!popup) {
      setError('Pop-up diblokir browser. Izinkan pop-up untuk membuka dokumen cetak.');
      return;
    }
    popup.document.open();
    popup.document.write(documentBody(form));
    popup.document.close();
    popup.focus();
    popup.onload = () => {
      popup.print();
    };
  };

  const saveDraftToArchive = async () => {
    setError('');
    setMessage('');
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const meta = kindMeta[form.kind];
      const html = documentBody(form);
      const fileName = safeFileName(form.nomor + '-' + form.kind) + '.html';
      const file = new File([html], fileName, { type: 'text/html;charset=utf-8' });
      const localKey = await saveLocalDocumentFile(file);
      const now = new Date().toISOString();
      const nominal = Number(form.jumlahPembayaran || 0) || Number(form.nilaiKontrak || 0) || 0;
      const archiveRecord: ArsipBukti = {
        id: 'DRAFT-' + Date.now().toString(36).toUpperCase(),
        kode_bukti: form.nomor.trim(),
        jenis: meta.archiveKind,
        link_drive: '',
        tgl_upload: getLocalDateISO(),
        terverifikasi: 'Perlu_Konfirmasi',
        catatan_audit: 'Dokumen dibuat sebagai DRAF dari form ERP. Periksa, tandatangani bila sesuai, dan simpan berkas asli. Belum diverifikasi secara hukum.',
        penerima: form.pihakKedua.trim(),
        nominal,
        keterangan: meta.description,
        judul_dokumen: meta.title,
        nomor_dokumen: form.nomor.trim(),
        tanggal_dokumen: form.tanggal,
        proyek: form.namaUsaha.trim() || form.lokasi.trim(),
        modul_terkait: meta.module,
        id_terkait: '',
        nama_file: fileName,
        mime_type: 'text/html;charset=utf-8',
        ukuran_bytes: file.size,
        local_file_key: localKey,
        nama_pengunggah: '',
        waktu_dibuat: now,
        diverifikasi_oleh: '',
        waktu_verifikasi: ''
      };
      dispatch({ type: 'ADD_ARSIP_BUKTI', payload: archiveRecord });
      setMessage('Draft dokumen disimpan ke Arsip Bukti pada browser ini. Buka dokumen untuk mencetak/Save as PDF; dokumen belum ditandatangani, diverifikasi, atau diunggah ke Drive.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-indigo-200 bg-white">
      <button onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700"><FileText size={20} /></span>
          <div><h2 className="font-semibold text-gray-900">Pembuat Draft Dokumen Proyek</h2><p className="mt-1 text-sm text-gray-500">Isi template, cetak / Save as PDF, atau simpan draft HTML ke Arsip Bukti.</p></div>
        </div>
        <ChevronDown size={19} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && <div className="border-t p-4 sm:p-6">
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><ShieldAlert size={17} />Draf bukan dokumen resmi</p>
          <p className="mt-1">Template ini tidak memvalidasi kepemilikan, identitas, pajak, tanda tangan, atau keaslian bukti. Jangan membuat/mengubah akta AJB atau akta notaris sendiri; gunakan Notaris/PPAT berwenang untuk formalitas yang diwajibkan. Semua isian berasal dari pengguna dan dikosongkan secara default.</p>
        </div>

        {error && <p role="alert" className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {message && <p role="status" className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Jenis dokumen draft
            <select value={form.kind} onChange={e => update('kind', e.target.value as DraftKind)} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="kwitansi">Kuitansi / tanda terima</option>
              <option value="perjanjian_tanah">Draf kesepakatan pembebasan tanah</option>
              <option value="spk">Draf SPK / kontrak kerja</option>
              <option value="bast">Draf BAST / progres pekerjaan</option>
              <option value="surat_pernyataan">Draf surat pernyataan</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Nomor dokumen *
            <input value={form.nomor} onChange={e => update('nomor', e.target.value)} placeholder="Isi nomor dokumen" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Tanggal *
            <input type="date" value={form.tanggal} onChange={e => update('tanggal', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Nama PT / pemilik proyek (opsional)
            <input value={form.namaUsaha} onChange={e => update('namaUsaha', e.target.value)} placeholder="Nama sesuai dokumen pendirian/kontrak" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">{form.kind === 'kwitansi' ? 'Pihak yang membayar *' : 'Pihak Pertama *'}
            <input value={form.pihakPertama} onChange={e => update('pihakPertama', e.target.value)} placeholder="Nama sesuai identitas/perjanjian" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">{form.kind === 'kwitansi' ? 'Pihak penerima uang *' : 'Pihak Kedua *'}
            <input value={form.pihakKedua} onChange={e => update('pihakKedua', e.target.value)} placeholder="Nama sesuai identitas/perjanjian" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">Objek / uraian transaksi atau pekerjaan *
            <input value={form.objek} onChange={e => update('objek', e.target.value)} placeholder="Jelaskan bidang/termin/pekerjaan berdasarkan kesepakatan" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Lokasi / site / alamat objek
            <input value={form.lokasi} onChange={e => update('lokasi', e.target.value)} placeholder="Lokasi sebagaimana dokumen asli" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          {(form.kind === 'perjanjian_tanah') && <>
            <label className="text-sm font-medium text-gray-700">Luas tanah (satuan harus jelas)
              <input value={form.luas} onChange={e => update('luas', e.target.value)} placeholder="Misal 250 m²; isi sesuai surat ukur" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Nomor sertifikat / alas hak
              <input value={form.nomorSertifikat} onChange={e => update('nomorSertifikat', e.target.value)} placeholder="Nomor dari dokumen yang diperiksa" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </>}
          {form.kind !== 'bast' && <>
            <label className="text-sm font-medium text-gray-700">Nilai kontrak / kesepakatan (Rp)
              <input type="number" min="0" step="1" value={form.nilaiKontrak} onChange={e => update('nilaiKontrak', e.target.value)} placeholder="Jangan gunakan DP sebagai nilai kontrak" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">{form.kind === 'kwitansi' ? 'Nominal yang benar-benar diterima (Rp) *' : 'Nominal pembayaran / termin (Rp)'}
              <input type="number" min="0" step="1" value={form.jumlahPembayaran} onChange={e => update('jumlahPembayaran', e.target.value)} placeholder="Isi sesuai bukti atau kesepakatan" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </>}
          {form.kind === 'kwitansi' && <>
            <label className="text-sm font-medium text-gray-700">Terbilang *
              <input value={form.terbilang} onChange={e => update('terbilang', e.target.value)} placeholder="Tulis terbilang dengan pemeriksaan manusia" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Cara / referensi pembayaran
              <input value={form.metodePembayaran} onChange={e => update('metodePembayaran', e.target.value)} placeholder="Tunai/transfer, bank, tanggal, nomor referensi" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </>}
          {(form.kind === 'perjanjian_tanah' || form.kind === 'spk') && <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">Jadwal pembayaran / termin / syarat
            <textarea rows={3} value={form.jadwalPembayaran} onChange={e => update('jadwalPembayaran', e.target.value)} placeholder="Tahap, pemicu pembayaran, batas waktu, retensi, syarat bukti dan jatuh tempo." className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>}
          {(form.kind === 'spk' || form.kind === 'bast') && <>
            <label className="text-sm font-medium text-gray-700">Tanggal mulai
              <input type="date" value={form.tanggalMulai} onChange={e => update('tanggalMulai', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Tanggal selesai / periode akhir
              <input type="date" value={form.tanggalSelesai} onChange={e => update('tanggalSelesai', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </>}
          {(form.kind === 'bast') && <>
            <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">Volume, hasil opname, kekurangan/perbaikan
              <textarea rows={4} value={form.hasilPekerjaan} onChange={e => update('hasilPekerjaan', e.target.value)} placeholder="Isi hasil pengukuran dan pemeriksaan aktual, bukan perkiraan tanpa opname." className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Nilai kontrak acuan (Rp)
              <input type="number" min="0" step="1" value={form.nilaiKontrak} onChange={e => update('nilaiKontrak', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Nilai termin yang diperiksa (Rp)
              <input type="number" min="0" step="1" value={form.jumlahPembayaran} onChange={e => update('jumlahPembayaran', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </>}
          <label className="text-sm font-medium text-gray-700">Saksi pertama (opsional)
            <input value={form.saksiPertama} onChange={e => update('saksiPertama', e.target.value)} placeholder="Nama saksi" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Saksi kedua (opsional)
            <input value={form.saksiKedua} onChange={e => update('saksiKedua', e.target.value)} placeholder="Nama saksi" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">Catatan / pasal tambahan / lampiran
            <textarea rows={3} value={form.catatan} onChange={e => update('catatan', e.target.value)} placeholder="Masukkan hanya rincian yang telah disepakati dan dapat didukung dokumen." className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>
        <div className="mt-5 rounded-lg border bg-gray-50 p-3 text-sm">
          <p className="font-semibold">{kindMeta[form.kind].title}</p>
          <p className="mt-1 text-gray-600">{kindMeta[form.kind].description}</p>
          <p className="mt-1 text-xs text-gray-500">Nilai kontrak: {rupiah(form.nilaiKontrak)} · Nilai pembayaran: {rupiah(form.jumlahPembayaran)}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={openPrintView} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"><Printer size={16} />Buka cetak / Save as PDF</button>
          <button disabled={saving} onClick={() => void saveDraftToArchive()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"><Archive size={16} />{saving ? 'Menyimpan…' : 'Simpan draft ke arsip'}</button>
        </div>
      </div>}
    </section>
  );
}
