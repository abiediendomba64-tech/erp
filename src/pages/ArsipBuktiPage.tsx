import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { useAccounting } from '../store/accounting';
import { formatRupiah, getLocalDateISO } from '../data';
import type { ArsipBukti } from '../types';
import DokumenProyekGenerator from '../components/DokumenProyekGenerator';
import {
  FolderArchive, FileText, Upload, Search, ExternalLink, Download,
  Pencil, CheckCircle, AlertTriangle, ShieldAlert, X, Save
} from 'lucide-react';
import {
  downloadLocalDocumentFile,
  previewLocalDocumentFile,
  saveLocalDocumentFile
} from '../utils/localDocuments';
import { createCashbookJournal, journalTotalsAreBalanced } from '../utils/cashbookJournal';

type DocumentKind = ArsipBukti['jenis'];
type RelatedModule = NonNullable<ArsipBukti['modul_terkait']>;

const documentKinds: { value: DocumentKind; label: string }[] = [
  { value: 'Kwitansi_Foto', label: 'Kuitansi / tanda terima pembayaran' },
  { value: 'Transfer_Bank', label: 'Bukti transfer / rekening koran' },
  { value: 'Nota_Foto', label: 'Nota pembelian / bon material' },
  { value: 'Invoice_Faktur', label: 'Invoice / faktur' },
  { value: 'BAST', label: 'Berita acara serah terima (BAST)' },
  { value: 'Perjanjian_Jual_Beli', label: 'Perjanjian jual beli tanah' },
  { value: 'PPJB', label: 'PPJB' },
  { value: 'AJB', label: 'Akta Jual Beli (AJB)' },
  { value: 'Akta_Notaris', label: 'Akta notaris / legalisasi' },
  { value: 'Sertifikat_SHM', label: 'Sertifikat tanah SHM' },
  { value: 'Sertifikat_SHGB', label: 'Sertifikat tanah SHGB' },
  { value: 'PBB', label: 'SPPT / bukti bayar PBB' },
  { value: 'Surat_Kuasa', label: 'Surat kuasa' },
  { value: 'KTP_NPWP', label: 'Identitas / NPWP pihak terkait' },
  { value: 'Surat_Pernyataan', label: 'Surat pernyataan / kesepakatan' },
  { value: 'Kontrak_Kerja', label: 'Kontrak kerja kontraktor' },
  { value: 'SPK', label: 'Surat Perintah Kerja (SPK)' },
  { value: 'Addendum_Kontrak', label: 'Addendum kontrak' },
  { value: 'RAB', label: 'RAB / penawaran harga' },
  { value: 'Progress_Pekerjaan', label: 'Laporan progres / opname / termin' },
  { value: 'Dokumen_PBG_IMB', label: 'PBG / IMB' },
  { value: 'SLF', label: 'Sertifikat Laik Fungsi (SLF)' },
  { value: 'NIB', label: 'NIB / perizinan usaha' },
  { value: 'Lainnya', label: 'Dokumen pendukung lainnya' },
  { value: 'Tidak_Ada', label: 'Rekap metadata — belum ada berkas bukti' },
];

const relatedModules: RelatedModule[] = [
  'Buku Kas', 'Tanah', 'Beko', 'Utang Tanah', 'Nota Material', 'Kontrak', 'Proyek', 'Lainnya'
];

const emptyForm = {
  kode_bukti: '',
  judul_dokumen: '',
  jenis: 'Kwitansi_Foto' as DocumentKind,
  nomor_dokumen: '',
  tanggal_dokumen: getLocalDateISO(),
  proyek: 'Site A',
  modul_terkait: 'Buku Kas' as RelatedModule,
  id_terkait: '',
  penerima: '',
  nominal: '',
  link_drive: '',
  catatan_audit: '',
  terverifikasi: 'Perlu_Konfirmasi' as ArsipBukti['terverifikasi'],
  diverifikasi_oleh: '',
};

const statusLabel = (status: ArsipBukti['terverifikasi']) => {
  if (status === 'Ya') return 'Terverifikasi manual';
  if (status === 'Tidak') return 'Ditolak / tidak sah';
  return 'Perlu konfirmasi';
};

function hasUsableEvidence(document: ArsipBukti): boolean {
  return Boolean(document.local_file_key || /^https?:\/\//i.test(document.link_drive || ''));
}

export default function ArsipBuktiPage() {
  const { state, dispatch } = useAppContext();
  const { state: accountingState, dispatch: dispatchAccounting } = useAccounting();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const verifiedCount = state.arsipBukti.filter(item => item.terverifikasi === 'Ya' && hasUsableEvidence(item)).length;
  const missingEvidenceCount = state.arsipBukti.filter(item => !hasUsableEvidence(item)).length;
  const pendingCount = state.arsipBukti.filter(item => item.terverifikasi === 'Perlu_Konfirmasi').length;

  const visibleDocuments = useMemo(() => state.arsipBukti
    .filter(item => {
      const text = [
        item.kode_bukti, item.judul_dokumen, item.nomor_dokumen,
        item.catatan_audit, item.penerima, item.proyek,
        item.modul_terkait, item.id_terkait, item.nama_file
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = text.includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === 'Semua' || item.terverifikasi === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .slice()
    .sort((a, b) => (b.tanggal_dokumen || b.tgl_upload || '').localeCompare(a.tanggal_dokumen || a.tgl_upload || '')),
  [state.arsipBukti, search, statusFilter]);

  const updateForm = <K extends keyof typeof emptyForm>(key: K, value: typeof emptyForm[K]) => {
    setForm(old => ({ ...old, [key]: value }));
  };

  const beginNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, kode_bukti: 'BUKTI-' + getLocalDateISO().replace(/-/g, '') + '-' + String(state.arsipBukti.length + 1).padStart(3, '0') });
    setSelectedFile(null);
    setMessage('');
    setError('');
    setShowForm(true);
  };

  const beginEdit = (item: ArsipBukti) => {
    setEditingId(item.id);
    setForm({
      kode_bukti: item.kode_bukti || '',
      judul_dokumen: item.judul_dokumen || item.catatan_audit || '',
      jenis: item.jenis,
      nomor_dokumen: item.nomor_dokumen || '',
      tanggal_dokumen: item.tanggal_dokumen || item.tgl_upload || getLocalDateISO(),
      proyek: item.proyek || '',
      modul_terkait: item.modul_terkait || 'Lainnya',
      id_terkait: item.id_terkait || '',
      penerima: item.penerima || '',
      nominal: String(item.nominal || ''),
      link_drive: item.link_drive || '',
      catatan_audit: item.catatan_audit || '',
      terverifikasi: item.terverifikasi || 'Perlu_Konfirmasi',
      diverifikasi_oleh: item.diverifikasi_oleh || '',
    });
    setSelectedFile(null);
    setMessage('');
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    setMessage('');
    if (!form.judul_dokumen.trim()) {
      setError('Judul / uraian dokumen wajib diisi.');
      return;
    }
    if (form.tanggal_dokumen && !/^\d{4}-\d{2}-\d{2}$/.test(form.tanggal_dokumen)) {
      setError('Tanggal dokumen harus valid dengan format tanggal.');
      return;
    }
    if (form.link_drive.trim() && !/^https?:\/\//i.test(form.link_drive.trim())) {
      setError('Tautan eksternal harus berupa URL HTTP/HTTPS yang lengkap.');
      return;
    }
    const nominal = form.nominal.trim() === '' ? 0 : Number(form.nominal);
    if (!Number.isFinite(nominal) || nominal < 0) {
      setError('Nominal dokumen tidak valid.');
      return;
    }
    const existing = editingId ? state.arsipBukti.find(item => item.id === editingId) : undefined;
    const localFileAlreadyExists = Boolean(existing?.local_file_key);
    const hasEvidence = Boolean(selectedFile || localFileAlreadyExists || form.link_drive.trim());
    if (form.terverifikasi === 'Ya') {
      if (!hasEvidence) {
        setError('Dokumen tidak dapat diverifikasi tanpa lampiran file atau tautan bukti.');
        return;
      }
      if (!form.diverifikasi_oleh.trim()) {
        setError('Isi nama pemeriksa yang benar-benar memeriksa dokumen.');
        return;
      }
    }

    const matchingCashRows = (moduleName: string, relatedId: string, proofCode: string) => {
      if (moduleName !== 'Buku Kas') return [];
      return state.bukuKas.filter(row =>
        (Boolean(relatedId) && row.id === relatedId.trim()) ||
        (Boolean(proofCode) && Boolean(row.kode_bukti) && row.kode_bukti === proofCode.trim())
      );
    };
    const newMatchRows = matchingCashRows(form.modul_terkait, form.id_terkait, form.kode_bukti);
    const oldMatchRows = existing
      ? matchingCashRows(existing.modul_terkait || '', existing.id_terkait || '', existing.kode_bukti || '')
      : [];
    const postedRowsProtected = oldMatchRows.filter(row =>
      row.posting_status === 'POSTED' &&
      Boolean(row.jurnal_id) &&
      accountingState.jurnal.some(journal => journal.id === row.jurnal_id && journal.status === 'Posted')
    );
    if (postedRowsProtected.length > 0 &&
        (form.terverifikasi !== 'Ya' ||
         form.modul_terkait !== existing?.modul_terkait ||
         form.id_terkait.trim() !== (existing?.id_terkait || '').trim() ||
         form.kode_bukti.trim() !== (existing?.kode_bukti || '').trim())) {
      setError('Bukti ini sudah mendukung jurnal Posted. Jangan mencabut atau memindahkan tautan tanpa membuat reversal/koreksi transaksi dari menu Buku Kas terlebih dahulu.');
      return;
    }

    const isPaymentEvidence = ['Kwitansi_Foto', 'Transfer_Bank', 'Nota_Foto'].includes(form.jenis);
    const verifiedPaymentLink = form.terverifikasi === 'Ya' && hasEvidence &&
      form.modul_terkait === 'Buku Kas' && isPaymentEvidence;
    if (verifiedPaymentLink && form.id_terkait.trim() && newMatchRows.length === 0) {
      setError('ID Buku Kas tidak ditemukan. Periksa ID record terkait atau pilih modul yang benar.');
      return;
    }
    if (verifiedPaymentLink && newMatchRows.length > 0) {
      if (nominal <= 0) {
        setError('Nominal dokumen pembayaran wajib diisi sebelum dipakai memposting jurnal.');
        return;
      }
      const mismatched = newMatchRows.find(row =>
        Math.abs(nominal - (Math.max(0, Number(row.masuk) || 0) + Math.max(0, Number(row.keluar) || 0))) > 0.005
      );
      if (mismatched) {
        setError('Nominal bukti tidak sama dengan nominal transaksi Buku Kas ' + mismatched.id +
          '. Jurnal tidak diposting. Periksa bukti/nominal dahulu; jangan ubah angka agar sekadar cocok jika bukti asli tidak mendukung.');
        return;
      }
    }

    setSaving(true);
    try {
      const localFileKey = selectedFile ? await saveLocalDocumentFile(selectedFile) : existing?.local_file_key;
      const now = new Date().toISOString();
      const record: ArsipBukti = {
        ...(existing || {}),
        id: existing?.id || 'DOK-' + Date.now().toString(36).toUpperCase(),
        kode_bukti: form.kode_bukti.trim() || 'BUKTI-' + Date.now(),
        jenis: form.jenis,
        judul_dokumen: form.judul_dokumen.trim(),
        nomor_dokumen: form.nomor_dokumen.trim(),
        tanggal_dokumen: form.tanggal_dokumen,
        proyek: form.proyek.trim(),
        modul_terkait: form.modul_terkait,
        id_terkait: form.id_terkait.trim(),
        penerima: form.penerima.trim(),
        nominal,
        keterangan: form.catatan_audit.trim() || form.judul_dokumen.trim(),
        link_drive: form.link_drive.trim(),
        tgl_upload: getLocalDateISO(),
        nama_file: selectedFile?.name || existing?.nama_file || '',
        mime_type: selectedFile?.type || existing?.mime_type || '',
        ukuran_bytes: selectedFile?.size || existing?.ukuran_bytes || 0,
        local_file_key: localFileKey,
        catatan_audit: form.catatan_audit.trim(),
        terverifikasi: form.terverifikasi,
        diverifikasi_oleh: form.terverifikasi === 'Ya' ? form.diverifikasi_oleh.trim() : '',
        waktu_verifikasi: form.terverifikasi === 'Ya' ? now : '',
        waktu_dibuat: existing?.waktu_dibuat || now,
      };

      let postedJournalCount = 0;
      let draftJournalCount = 0;
      if (verifiedPaymentLink) {
        for (const cashRow of newMatchRows) {
          // Historic rows never get journalled automatically, because they may already be
          // included in another ledger. Only new app-created Drafts can be promoted.
          if (cashRow.posting_status === 'HISTORICAL' || (!cashRow.posting_status && !cashRow.jurnal_id)) continue;
          if (!cashRow.jurnal_id || !cashRow.akun_kas_kode || !cashRow.akun_lawan_kode) {
            draftJournalCount++;
            continue;
          }
          const journal = accountingState.jurnal.find(item => item.id === cashRow.jurnal_id);
          if (cashRow.posting_status === 'DRAFT' && journal?.status === 'Draft') {
            if (!journalTotalsAreBalanced(journal)) {
              throw new Error('Jurnal Draft untuk transaksi ' + cashRow.id + ' tidak balance; periksa jurnal sebelum posting.');
            }
            dispatchAccounting({
              type: 'UPDATE_JURNAL',
              payload: { ...journal, status: 'Posted' }
            });
            dispatch({
              type: 'UPDATE_BUKU_KAS',
              payload: { ...cashRow, status_verifikasi: 'LENGKAP', posting_status: 'POSTED' }
            });
            postedJournalCount++;
          } else if (cashRow.posting_status === 'REVERSED') {
            const newJournal = createCashbookJournal(cashRow, accountingState.akun, 'Posted');
            if (!journalTotalsAreBalanced(newJournal)) {
              throw new Error('Jurnal baru untuk transaksi ' + cashRow.id + ' tidak balance; jurnal tetap tidak diposting.');
            }
            dispatchAccounting({ type: 'ADD_JURNAL', payload: newJournal });
            dispatch({
              type: 'UPDATE_BUKU_KAS',
              payload: {
                ...cashRow,
                jurnal_id: newJournal.id,
                posting_status: 'POSTED',
                status_verifikasi: 'LENGKAP'
              }
            });
            postedJournalCount++;
          } else if (cashRow.posting_status === 'POSTED' && journal?.status === 'Posted') {
            postedJournalCount++;
          } else {
            draftJournalCount++;
          }
        }
      }

      if (editingId) dispatch({ type: 'UPDATE_ARSIP_BUKTI', payload: record });
      else dispatch({ type: 'ADD_ARSIP_BUKTI', payload: record });

      setShowForm(false);
      setSelectedFile(null);
      setEditingId(null);
      const messages = [editingId ? 'Metadata dokumen diperbarui.' : 'Dokumen dicatat.'];
      if (postedJournalCount > 0) {
        messages.push(postedJournalCount + ' jurnal telah diposting ke laporan Akuntansi karena cocok dengan nominal Buku Kas dan bukti pembayaran yang ditandai diverifikasi manual.');
      }
      if (draftJournalCount > 0) {
        messages.push(draftJournalCount + ' transaksi masih Draft/tidak diposting. Periksa akun lawan dan status jurnal; catatan historis tidak otomatis dijurnal.');
      }
      if (!verifiedPaymentLink || newMatchRows.length === 0) {
        messages.push('Dokumen disimpan, tetapi tidak ada jurnal yang diposting otomatis. Pastikan jenis dokumen, ID Buku Kas, nominal, dan bukti asli sesuai.');
      }
      messages.push('File lampiran tersimpan lokal pada browser ini; tautan Google Drive/cloud tidak dibuat otomatis.');
      setMessage(messages.join(' '));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (item: ArsipBukti) => {
    setError('');
    try {
      if (item.local_file_key) await previewLocalDocumentFile(item.local_file_key);
      else if (item.link_drive) window.open(item.link_drive, '_blank', 'noopener,noreferrer');
      else setError('Belum ada file atau tautan bukti untuk dokumen ini.');
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    }
  };

  const handleDownload = async (item: ArsipBukti) => {
    setError('');
    try {
      if (!item.local_file_key) {
        setError('Dokumen ini tidak memiliki file lokal. Buka tautan eksternal atau lampirkan file asli.');
        return;
      }
      await downloadLocalDocumentFile(item.local_file_key, item.nama_file || item.kode_bukti + '.bin');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : String(downloadError));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FolderArchive size={24} className="text-purple-500" />Arsip Bukti & Dokumen Legal</h1>
          <p className="text-gray-500 mt-1">Kuitansi, bukti transfer, perjanjian, akta, sertifikat, PBB, kontrak, SPK, BAST dan dokumen proyek lainnya.</p>
        </div>
        <button onClick={beginNew} className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"><Upload size={18} />Tambah Dokumen</button>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold flex items-center gap-2"><ShieldAlert size={17} />Penyimpanan dan status bukti</p>
        <p className="mt-1">Lampiran yang diunggah disimpan di IndexedDB browser/perangkat ini saja—belum otomatis ke Google Drive dan tidak tersinkron antarperangkat. Untuk dokumen asli, masukkan juga tautan Drive dengan akses terbatas dan lakukan backup. Status “Terverifikasi manual” adalah catatan pemeriksaan lokal, bukan tanda tangan digital atau verifikasi identitas.</p>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <DokumenProyekGenerator />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Jumlah catatan dokumen</p><p className="mt-1 text-2xl font-bold">{state.arsipBukti.length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Belum ada file / tautan</p><p className="mt-1 text-2xl font-bold text-red-600">{missingEvidenceCount}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Menunggu konfirmasi</p><p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount} <span className="text-sm font-normal text-gray-500">· {verifiedCount} terverifikasi manual</span></p></div>
      </div>

      {showForm && (
        <section className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Metadata Dokumen' : 'Daftarkan Bukti / Dokumen Pendukung'}</h2>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Tutup form"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">Jenis dokumen *
              <select value={form.jenis} onChange={e => updateForm('jenis', e.target.value as DocumentKind)} className="mt-1 w-full rounded-lg border px-3 py-2">
                {documentKinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">Judul / uraian dokumen *
              <input value={form.judul_dokumen} onChange={e => updateForm('judul_dokumen', e.target.value)} placeholder="Contoh: Kuitansi pembayaran tahap 2 bidang T-07" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Kode bukti internal
              <input value={form.kode_bukti} onChange={e => updateForm('kode_bukti', e.target.value)} placeholder="Dibuat otomatis jika kosong" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Nomor dokumen / kuitansi / akta
              <input value={form.nomor_dokumen} onChange={e => updateForm('nomor_dokumen', e.target.value)} placeholder="Nomor pada dokumen asli" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Tanggal dokumen
              <input type="date" value={form.tanggal_dokumen} onChange={e => updateForm('tanggal_dokumen', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Proyek / lokasi
              <input value={form.proyek} onChange={e => updateForm('proyek', e.target.value)} placeholder="Site A / nama proyek" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Modul terkait
              <select value={form.modul_terkait} onChange={e => updateForm('modul_terkait', e.target.value as RelatedModule)} className="mt-1 w-full rounded-lg border px-3 py-2">
                {relatedModules.map(module => <option key={module} value={module}>{module}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">ID record terkait
              <input value={form.id_terkait} onChange={e => updateForm('id_terkait', e.target.value)} placeholder="Misal KAS-M01 / T-07 / BK-06" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Pihak / penerima / penjual
              <input value={form.penerima} onChange={e => updateForm('penerima', e.target.value)} placeholder="Nama sesuai dokumen" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Nominal terkait (Rp; opsional)
              <input type="number" min="0" step="1" value={form.nominal} onChange={e => updateForm('nominal', e.target.value)} placeholder="0" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Tautan Google Drive / URL
              <input type="url" value={form.link_drive} onChange={e => updateForm('link_drive', e.target.value)} placeholder="https://drive.google.com/..." className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Lampirkan file asli (maks. 10 MB)
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" />
              <span className="mt-1 block text-xs font-normal text-gray-500">File baru akan disimpan lokal. File yang sudah ada tetap dipakai bila tidak memilih file baru.</span>
            </label>
            <label className="text-sm font-medium text-gray-700">Status pemeriksaan
              <select value={form.terverifikasi} onChange={e => updateForm('terverifikasi', e.target.value as ArsipBukti['terverifikasi'])} className="mt-1 w-full rounded-lg border px-3 py-2">
                <option value="Perlu_Konfirmasi">Perlu konfirmasi</option>
                <option value="Ya">Terverifikasi manual</option>
                <option value="Tidak">Ditolak / tidak sah</option>
              </select>
            </label>
            {form.terverifikasi === 'Ya' && <label className="text-sm font-medium text-gray-700">Nama pemeriksa *
              <input value={form.diverifikasi_oleh} onChange={e => updateForm('diverifikasi_oleh', e.target.value)} placeholder="Nama pemeriksa sebenarnya" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>}
            <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">Catatan pemeriksaan / klausul / kekurangan dokumen
              <textarea value={form.catatan_audit} onChange={e => updateForm('catatan_audit', e.target.value)} rows={3} placeholder="Keterangan isi dokumen, halaman, pasal, status asli/fotokopi, saksi, kekurangan, atau tindakan lanjutan." className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button disabled={saving} onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"><Save size={17} />{saving ? 'Menyimpan…' : 'Simpan Dokumen'}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Batal</button>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="absolute left-3 top-3 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nomor dokumen, pihak, proyek, ID record…" className="w-full rounded-lg border bg-white py-2 pl-9 pr-3" />
        </label>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border bg-white px-3 py-2">
          <option value="Semua">Semua status</option><option value="Perlu_Konfirmasi">Perlu konfirmasi</option><option value="Ya">Terverifikasi manual</option><option value="Tidak">Ditolak / tidak sah</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Daftar bukti dan dokumen ({visibleDocuments.length})</h2><p className="mt-1 text-xs text-gray-500">Nominal di sini adalah nominal dokumen, bukan penjumlahan kas. Dokumen hukum tidak otomatis menjadi bukti pembayaran.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Dokumen</th>
                <th className="px-4 py-3 text-left">Pihak / proyek</th>
                <th className="px-4 py-3 text-left">Keterkaitan</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3 text-left">Berkas / URL</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleDocuments.map(item => {
                const backed = hasUsableEvidence(item);
                const kindLabel = documentKinds.find(kind => kind.value === item.jenis)?.label || item.jenis;
                return (
                  <tr key={item.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{item.judul_dokumen || item.catatan_audit || '(tanpa judul)'}</p>
                      <p className="mt-1 text-xs text-purple-700">{kindLabel}</p>
                      <p className="mt-1 font-mono text-xs text-gray-500">{item.kode_bukti}</p>
                      {item.nomor_dokumen && <p className="text-xs text-gray-500">Nomor: {item.nomor_dokumen}</p>}
                      {item.tanggal_dokumen && <p className="text-xs text-gray-500">Tanggal: {item.tanggal_dokumen}</p>}
                    </td>
                    <td className="px-4 py-3">{item.penerima || '—'}<p className="mt-1 text-xs text-gray-500">{item.proyek || 'Proyek belum diisi'}</p></td>
                    <td className="px-4 py-3">{item.modul_terkait || 'Belum terkait'}<p className="mt-1 text-xs text-gray-500">{item.id_terkait || 'ID record belum diisi'}</p></td>
                    <td className="px-4 py-3 text-right font-medium">{formatRupiah(item.nominal || 0)}</td>
                    <td className="px-4 py-3">
                      {item.nama_file ? <p className="flex items-center gap-1 text-xs text-gray-800"><FileText size={14} />{item.nama_file}</p> : <p className="text-xs text-red-600">File lokal belum dilampirkan</p>}
                      {item.link_drive ? <a href={item.link_drive} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700 underline"><ExternalLink size={12} />Tautan eksternal</a> : <p className="mt-1 text-xs text-gray-500">Tidak ada URL Drive</p>}
                      {item.ukuran_bytes ? <p className="mt-1 text-xs text-gray-500">{(item.ukuran_bytes / 1024).toFixed(0)} KB</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${item.terverifikasi === 'Ya' && backed ? 'bg-emerald-100 text-emerald-800' : item.terverifikasi === 'Tidak' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.terverifikasi === 'Ya' && !backed ? 'Tautan/file tidak ada' : statusLabel(item.terverifikasi)}
                      </span>
                      {item.diverifikasi_oleh && <p className="mt-1 text-xs text-gray-500">Pemeriksa: {item.diverifikasi_oleh}</p>}
                      {item.catatan_audit && <p className="mt-1 max-w-[220px] text-xs text-gray-600">{item.catatan_audit}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {backed && <button onClick={() => void handlePreview(item)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><ExternalLink size={13} />Buka</button>}
                        {item.local_file_key && <button onClick={() => void handleDownload(item)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Download size={13} /></button>}
                        <button onClick={() => beginEdit(item)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleDocuments.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Tidak ada dokumen yang cocok. Tambahkan dokumen asli atau tautan bukti.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
        <h3 className="font-semibold">Checklist dokumen yang sering dibutuhkan</h3>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          <p>□ Kuitansi asli + nomor + tanggal + nominal</p>
          <p>□ Bukti transfer/rekening koran</p>
          <p>□ Perjanjian jual beli / PPJB / AJB</p>
          <p>□ Akta notaris, surat kuasa, surat pernyataan</p>
          <p>□ Sertifikat SHM/SHGB, PBB, identitas sesuai kebutuhan</p>
          <p>□ Kontrak kontraktor, SPK, addendum, RAB</p>
          <p>□ BAST, laporan volume/opname dan progres</p>
          <p>□ PBG/IMB, SLF, NIB atau izin lain yang relevan</p>
          <p>□ Semua dokumen dihubungkan ke ID tanah/transaksi/proyek</p>
        </div>
        <p className="mt-3 text-xs text-gray-500">Checklist bersifat administratif; jenis dan keabsahan dokumen wajib diperiksa sesuai transaksi dan ketentuan yang berlaku. Jangan unggah identitas pribadi ke perangkat bersama.</p>
      </div>
    </div>
  );
}
