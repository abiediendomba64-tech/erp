import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Scan, Camera, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { uploadDocumentToDrive, MAX_DRIVE_UPLOAD_BYTES } from '../utils/googleDriveDocuments';
import { getActiveWorkspaceId, googleErpApi } from '../lib/googleErpApi';
import type { OCRResult } from '../types';

type OCRDocumentType = OCRResult['jenis_dokumen'] | 'Invoice';

interface OCRDraftResponse {
  file_id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  jenis_dokumen: string;
  data_ekstrak: {
    vendor?: string | null;
    tanggal?: string | null;
    total?: number | null;
    kategori?: string | null;
    nomor_bukti?: string | null;
    keterangan?: string | null;
    confidence?: number;
    items?: { deskripsi?: string; jumlah?: number | null }[];
    perlu_konfirmasi?: string[];
  };
  confidence: number;
  status: 'Pending';
  catatan: string;
}

export default function OCRPage() {
  const { state, dispatch } = useAppContext();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jenisDokumen, setJenisDokumen] = useState<OCRDocumentType>('Kwitansi');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const terverifikasi = state.ocr.filter(o => o.status === 'Terverifikasi');
  const pending = state.ocr.filter(o => o.status === 'Pending');
  const avgConfidence = state.ocr.length > 0 ? state.ocr.reduce((sum, item) => sum + item.confidence, 0) / state.ocr.length : 0;

  const handleScan = async () => {
    setScanError('');
    setScanMessage('');
    if (!selectedFile) {
      setScanError('Pilih foto struk/kwitansi atau invoice PDF dari perangkat.');
      return;
    }

    setScanning(true);
    let uploadedName = '';
    try {
      const workspaceId = getActiveWorkspaceId();
      if (!workspaceId) throw new Error('Workspace cloud belum aktif. Login dan pilih workspace terlebih dahulu.');

      const uploaded = await uploadDocumentToDrive(selectedFile);
      uploadedName = uploaded.name;
      const result = await googleErpApi<{ draft: OCRDraftResponse; message: string }>('ocr.process', {
        workspaceId,
        fileId: uploaded.id,
        documentType: jenisDokumen,
      });
      const draft = result.draft;
      const extracted = draft?.data_ekstrak;
      if (!draft || !extracted || (extracted.total == null && !extracted.vendor && !extracted.tanggal && !extracted.keterangan)) {
        throw new Error('Gemini tidak mengembalikan kolom yang dapat ditinjau. File asli tetap tersedia di Drive.');
      }

      const record: OCRResult = {
        id: 'OCR-' + Date.now().toString(36).toUpperCase(),
        timestamp: new Date().toISOString(),
        image_url: draft.file_url || uploaded.url,
        jenis_dokumen: jenisDokumen === 'Invoice' ? 'Lainnya' : jenisDokumen,
        data_ekstrak: {
          penerima: extracted.vendor ?? undefined,
          nominal: extracted.total == null ? undefined : Number(extracted.total),
          tanggal: extracted.tanggal ?? undefined,
          nomor_bukti: extracted.nomor_bukti ?? undefined,
          keterangan: extracted.keterangan ?? undefined,
        },
        confidence: Math.max(0, Math.min(100, Number(extracted.confidence ?? draft.confidence) || 0)),
        status: 'Pending',
        catatan: [
          draft.catatan || 'Hasil OCR belum diverifikasi manusia.',
          'File Drive: ' + (draft.file_name || uploaded.name),
          ...(Array.isArray(extracted.perlu_konfirmasi) && extracted.perlu_konfirmasi.length
            ? ['Perlu konfirmasi: ' + extracted.perlu_konfirmasi.join('; ')]
            : []),
          'OCR tidak membuat Buku Kas atau jurnal final.'
        ].join(' '),
      };
      dispatch({ type: 'ADD_OCR', payload: record });
      setScanMessage('Draft OCR tersimpan di ERP dan status masih Pending. Cocokkan semua kolom dengan dokumen asli sebelum membuat transaksi.');
      setSelectedFile(null);
      setShowUpload(false);
    } catch (failure) {
      const suffix = uploadedName ? ' File sudah tersimpan di Drive (' + uploadedName + '), tetapi OCR belum berhasil.' : '';
      setScanError((failure instanceof Error ? failure.message : String(failure)) + suffix);
    } finally {
      setScanning(false);
    }
  };


  const reviewOcr = async (item: OCRResult, nextStatus: 'Terverifikasi' | 'Ditolak') => {
    if (!window.confirm(nextStatus === 'Terverifikasi'
      ? 'Sudah cocokkan toko, tanggal, nominal, uraian dan dokumen asli? Ini hanya memverifikasi hasil OCR, bukan menandai pembayaran lunas.'
      : 'Tolak hasil OCR ini? Tidak ada transaksi atau jurnal yang dibuat.')) return;
    setScanError('');
    setScanMessage('');
    setReviewingId(item.id);
    try {
      const auth = await googleErpApi<{ user: { email: string } }>('auth.me');
      const now = new Date().toISOString();
      const revised: OCRResult = {
        ...item,
        status: nextStatus,
        diverifikasi_oleh: auth.user.email,
        waktu_verifikasi: now,
        catatan: (item.catatan ? item.catatan + ' ' : '') +
          (nextStatus === 'Terverifikasi'
            ? 'Hasil OCR diperiksa manual oleh ' + auth.user.email + ' pada ' + now + '. Belum menjadi transaksi final.'
            : 'Hasil OCR ditolak oleh ' + auth.user.email + ' pada ' + now + '. Tidak ada pembukuan.'),
      };
      dispatch({ type: 'UPDATE_OCR', payload: revised });
      dispatch({ type: 'ADD_AUDIT_LOG', payload: {
        id: 'LOG-OCR-' + Date.now().toString(36).toUpperCase(),
        timestamp: now, user: auth.user.email, aksi: nextStatus === 'Terverifikasi' ? 'REVIEW_OCR' : 'REJECT_OCR',
        tabel: 'OCR', record_id: item.id, nilai_lama: JSON.stringify(item),
        nilai_baru: JSON.stringify(revised), alasan: 'Review hasil AI manual; tidak mem-posting transaksi.',
        sumber_bukti: item.image_url
      } });
      setScanMessage(nextStatus === 'Terverifikasi'
        ? 'Draft OCR sudah ditinjau manual. Data tetap belum menjadi Buku Kas atau jurnal; buat transaksi terpisah setelah mengonfirmasi pembayaran dan bukti.'
        : 'Draft OCR ditolak. Tidak ada transaksi atau jurnal yang dibuat.');
    } catch (failure) {
      setScanError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Scan size={24} className="text-violet-600" />OCR / Vision AI</h1><p className="mt-1 text-gray-500">Upload foto atau PDF ke Google Drive, lalu Gemini mengisi draft yang harus diperiksa manusia.</p></div>
        <button onClick={() => { setShowUpload(!showUpload); setScanError(''); setScanMessage(''); }} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"><Upload size={18} />Baca dokumen</button>
      </header>

      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
        <h2 className="flex items-center gap-2 font-semibold text-violet-900"><Sparkles size={17} />Alur yang aman</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-violet-100 bg-white p-3"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">1</div><p className="text-sm font-medium">Upload ke Drive</p><p className="mt-1 text-xs text-gray-600">Foto JPEG/PNG/WebP atau PDF, maks. 4 MB.</p></div>
          <div className="rounded-lg border border-violet-100 bg-white p-3"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">2</div><p className="text-sm font-medium">Gemini membaca</p><p className="mt-1 text-xs text-gray-600">Tanggal, toko, nominal, uraian dan catatan ketidakpastian.</p></div>
          <div className="rounded-lg border border-violet-100 bg-white p-3"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">3</div><p className="text-sm font-medium">Draft Pending</p><p className="mt-1 text-xs text-gray-600">Simpan hasil ekstraksi, bukan uang keluar atau jurnal.</p></div>
          <div className="rounded-lg border border-violet-100 bg-white p-3"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">4</div><p className="text-sm font-medium">Verifikasi manual</p><p className="mt-1 text-xs text-gray-600">Cocokkan struk asli, lalu input transaksi final melalui modul Buku Kas.</p></div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={17} />Batas integrasi</div><p className="mt-1">Gemini API key dan kuota harus dikonfigurasi di Apps Script. OCR dapat salah membaca struk thermal/tulisan tangan; confidence bukan persetujuan. OCR tidak memposting jurnal dan tidak mengirim pesan Telegram/WhatsApp.</p></div>
      {scanError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{scanError}</p>}
      {scanMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{scanMessage}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Total draft OCR</p><p className="mt-1 text-2xl font-bold">{state.ocr.length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Diverifikasi</p><p className="mt-1 text-2xl font-bold text-emerald-700">{terverifikasi.length}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-700">Pending</p><p className="mt-1 text-2xl font-bold text-amber-800">{pending.length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Rata-rata confidence</p><p className="mt-1 text-2xl font-bold text-violet-700">{avgConfidence.toFixed(0)}%</p></div>
      </div>

      {showUpload && <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><Camera size={18} className="text-violet-600" />Upload foto struk atau PDF</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Jenis dokumen
            <select value={jenisDokumen} onChange={event => setJenisDokumen(event.target.value as OCRDocumentType)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="Kwitansi">Kwitansi / struk</option><option value="Nota">Nota material</option><option value="Invoice">Invoice PDF</option><option value="Transfer_Bank">Bukti transfer</option><option value="Lainnya">Lainnya</option></select>
          </label>
          <label className="text-sm font-medium text-gray-700">File bukti
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => setSelectedFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" />
            <span className="mt-1 block text-xs font-normal text-gray-500">Maksimal {(MAX_DRIVE_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)} MB per file. File asli disimpan di folder Drive ERP.</span>
          </label>
        </div>
        {selectedFile && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB</p>}
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void handleScan()} disabled={scanning || !selectedFile} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"><Sparkles size={15} />{scanning ? 'Mengunggah / membaca…' : 'Upload & baca draft'}</button><button onClick={() => setShowUpload(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm">Batal</button></div>
      </section>}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold text-gray-900">Hasil OCR (draft, belum menjadi transaksi)</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">ID / waktu</th><th className="p-3">Jenis / file</th><th className="p-3">Toko / penerima</th><th className="p-3">Uraian</th><th className="p-3 text-right">Nominal</th><th className="p-3">Tanggal</th><th className="p-3 text-center">Confidence</th><th className="p-3">Status / catatan</th></tr></thead>
          <tbody className="divide-y">{state.ocr.map(item => (
            <tr key={item.id} className="align-top hover:bg-gray-50">
              <td className="p-3"><div className="font-mono text-xs">{item.id}</div><div className="mt-1 text-xs text-gray-500">{new Date(item.timestamp).toLocaleString('id-ID')}</div></td>
              <td className="p-3"><div>{item.jenis_dokumen}</div><a className="mt-1 block text-xs text-blue-700 underline" href={item.image_url} target="_blank" rel="noreferrer">Buka bukti Drive</a></td>
              <td className="p-3">{item.data_ekstrak.penerima || <span className="text-amber-700">Belum terbaca</span>}<div className="mt-1 text-xs text-gray-500">{item.data_ekstrak.nomor_bukti || 'No. bukti tidak terbaca'}</div></td>
              <td className="max-w-xs p-3">{item.data_ekstrak.keterangan || 'Perlu diisi manual'}</td>
              <td className="p-3 text-right font-medium">{item.data_ekstrak.nominal == null ? '—' : formatRupiah(item.data_ekstrak.nominal)}</td>
              <td className="p-3">{item.data_ekstrak.tanggal || '—'}</td>
              <td className="p-3 text-center">{Math.max(0, Math.min(100, item.confidence)).toFixed(0)}%</td>
              <td className="max-w-sm p-3"><span className={item.status === 'Terverifikasi' ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800' : item.status === 'Ditolak' ? 'rounded-full bg-red-100 px-2 py-1 text-xs text-red-800' : 'rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800'}>{item.status}</span><p className="mt-2 text-xs text-gray-600">{item.catatan}</p>{item.status === 'Pending' && <div className="mt-3 flex flex-wrap gap-2"><button disabled={reviewingId === item.id} onClick={() => void reviewOcr(item, 'Terverifikasi')} className="rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Cocok & tinjau</button><button disabled={reviewingId === item.id} onClick={() => void reviewOcr(item, 'Ditolak')} className="rounded border border-red-200 px-2 py-1 text-xs text-red-800 hover:bg-red-50 disabled:opacity-50">Tolak</button></div>}{item.diverifikasi_oleh && <p className="mt-2 text-xs text-gray-500">Ditinjau oleh {item.diverifikasi_oleh} · {item.waktu_verifikasi}</p>}</td>
            </tr>
          ))}{state.ocr.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Belum ada hasil OCR. Upload dokumen asli untuk membuat draft; tidak ada hasil contoh yang dimasukkan otomatis.</td></tr>}</tbody>
        </table></div>
      </section>
    </div>
  );
}
