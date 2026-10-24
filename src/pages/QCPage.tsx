import { useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Save, Pencil, X, AlertTriangle, CheckCircle2, Clock3, Download } from 'lucide-react';
import { downloadLocalDocumentFile } from '../utils/localDocuments';
import { uploadDocumentToDrive, openDriveDocument } from '../utils/googleDriveDocuments';
import { useAppContext } from '../store';
import { generateId, getLocalDateISO } from '../data';
import type { QCOutcome, QCRecord } from '../types';

type QCDraft = Omit<QCRecord, 'id' | 'created_at' | 'updated_at'>;
const emptyDraft = (): QCDraft => ({
  proyek: '', lokasi_unit: '', tahap_pekerjaan: '', item_inspeksi: '',
  tanggal_inspeksi: getLocalDateISO(), pemeriksa: '', hasil: 'Draft',
  temuan: '', tindakan_perbaikan: '', tenggat_perbaikan: '', tautan_bukti: ''
});
const outcomes: QCOutcome[] = ['Draft', 'Lulus', 'Perlu_Perbaikan', 'Ditolak'];
const outcomeLabel: Record<QCOutcome, string> = {
  Draft: 'Draft', Lulus: 'Lulus', Perlu_Perbaikan: 'Perlu perbaikan', Ditolak: 'Ditolak'
};
const statusClass: Record<QCOutcome, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Lulus: 'bg-emerald-100 text-emerald-800',
  Perlu_Perbaikan: 'bg-amber-100 text-amber-800',
  Ditolak: 'bg-red-100 text-red-800'
};

export default function QCPage() {
  const { state, dispatch } = useAppContext();
  const [draft, setDraft] = useState<QCDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'Semua' | QCOutcome>('Semua');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const rows = useMemo(() => state.qcRecords
    .filter(row => {
      const text = [row.id, row.proyek, row.lokasi_unit, row.tahap_pekerjaan, row.item_inspeksi, row.pemeriksa].join(' ').toLowerCase();
      return text.includes(search.trim().toLowerCase()) && (filter === 'Semua' || row.hasil === filter);
    })
    .sort((a, b) => b.tanggal_inspeksi.localeCompare(a.tanggal_inspeksi)), [state.qcRecords, search, filter]);

  const setField = <K extends keyof QCDraft>(key: K, value: QCDraft[K]) =>
    setDraft(current => ({ ...current, [key]: value }));

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSelectedFile(null);
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const startEdit = (record: QCRecord) => {
    const { id, created_at, updated_at, ...fields } = record;
    void created_at; void updated_at;
    setEditingId(record.id);
    setDraft(fields);
    setSelectedFile(null);
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const save = async () => {
    setError('');
    if (!draft.proyek.trim() || !draft.lokasi_unit.trim() || !draft.tahap_pekerjaan.trim() ||
        !draft.item_inspeksi.trim() || !draft.tanggal_inspeksi || !draft.pemeriksa.trim()) {
      setError('Proyek, lokasi/unit, tahap, item inspeksi, tanggal, dan nama pemeriksa wajib diisi.');
      return;
    }
    if (draft.hasil === 'Perlu_Perbaikan' && !draft.tindakan_perbaikan.trim()) {
      setError('Hasil “Perlu perbaikan” wajib memiliki tindakan perbaikan.');
      return;
    }
    if (draft.hasil === 'Perlu_Perbaikan' && !draft.tenggat_perbaikan) {
      setError('Tetapkan tenggat perbaikan untuk temuan QC.');
      return;
    }
    if (draft.tautan_bukti && !/^https?:\/\//i.test(draft.tautan_bukti)) {
      setError('Tautan bukti harus berupa URL http/https. Modul ini tidak mengunggah file.');
      return;
    }

    const now = new Date().toISOString();
    const previous = editingId ? state.qcRecords.find(item => item.id === editingId) : undefined;
    let uploadedDriveFile = null;
    if (selectedFile) {
      try {
        uploadedDriveFile = await uploadDocumentToDrive(selectedFile);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah lampiran QC ke Google Drive.');
        return;
      }
    }
    const localFileKey = selectedFile ? '' : previous?.local_file_key || draft.local_file_key || '';
    const evidenceUrl = uploadedDriveFile?.url || draft.tautan_bukti.trim();
    const record: QCRecord = {
      ...draft,
      proyek: draft.proyek.trim(),
      lokasi_unit: draft.lokasi_unit.trim(),
      tahap_pekerjaan: draft.tahap_pekerjaan.trim(),
      item_inspeksi: draft.item_inspeksi.trim(),
      pemeriksa: draft.pemeriksa.trim(),
      temuan: draft.temuan.trim(),
      tindakan_perbaikan: draft.tindakan_perbaikan.trim(),
      tautan_bukti: evidenceUrl,
      local_file_key: localFileKey || undefined,
      drive_file_id: uploadedDriveFile?.id || previous?.drive_file_id,
      nama_file: uploadedDriveFile?.name || previous?.nama_file || draft.nama_file || '',
      mime_type: uploadedDriveFile?.mimeType || previous?.mime_type || draft.mime_type || '',
      ukuran_bytes: uploadedDriveFile?.size || previous?.ukuran_bytes || draft.ukuran_bytes || 0,
      id: editingId || generateId('QC', state.qcRecords),
      created_at: previous?.created_at || now,
      updated_at: now
    };

    if (editingId) dispatch({ type: 'UPDATE_QC_RECORD', payload: record });
    else dispatch({ type: 'ADD_QC_RECORD', payload: record });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: {
      id: generateId('LOG', state.auditLog), timestamp: now,
      user: 'Pengguna lokal (belum terautentikasi)', aksi: editingId ? 'UPDATE' : 'CREATE',
      tabel: 'QC', record_id: record.id, nilai_lama: previous ? JSON.stringify(previous) : '',
      nilai_baru: JSON.stringify(record), alasan: 'Pencatatan melalui modul QC',
      sumber_bukti: record.tautan_bukti
    } });
    setShowForm(false);
    setEditingId(null);
    setSelectedFile(null);
    setMessage(uploadedDriveFile ? 'Checklist QC tersimpan; lampiran berhasil diunggah ke Google Drive.' : 'Checklist QC tersimpan. Tautan/berkas lama tetap menggunakan sumber yang tercatat; file lokal lama belum dipindahkan ke Drive.');
  };

  const downloadEvidence = async (record: QCRecord) => {
    if (!record.local_file_key && record.tautan_bukti) {
      if (/^https:\\/\\//i.test(record.tautan_bukti)) {
        if (/^https:\\/\\/drive\\.google\\.com\\//i.test(record.tautan_bukti)) openDriveDocument(record.tautan_bukti);
        else window.open(record.tautan_bukti, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (!record.local_file_key) return;
    try {
      await downloadLocalDocumentFile(record.local_file_key, record.nama_file || 'bukti-qc');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Gagal membuka lampiran QC.');
    }
  };

  const stats = {
    all: state.qcRecords.length,
    pass: state.qcRecords.filter(item => item.hasil === 'Lulus').length,
    fix: state.qcRecords.filter(item => item.hasil === 'Perlu_Perbaikan').length,
    rejected: state.qcRecords.filter(item => item.hasil === 'Ditolak').length
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ClipboardCheck className="text-cyan-700" />Quality Control (QC)</h1><p className="mt-1 text-sm text-gray-500">Checklist inspeksi konstruksi berdasarkan proyek, unit/lokasi, tahap dan item pekerjaan.</p></div>
      <button onClick={startNew} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"><Plus size={17} />Tambah inspeksi</button>
    </header>

    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Batas fungsi saat ini</div><p className="mt-1">Data dan lampiran lokal tersimpan di browser/perangkat saat ini, maksimal 10 MB per file; belum tersinkron antar pengguna dan tidak termasuk backup JSON. Tautan eksternal hanya referensi. Status Lulus/Ditolak tetap merupakan input pemeriksa, bukan sertifikasi otomatis.</p></div>
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Total inspeksi</p><p className="mt-1 text-2xl font-bold">{stats.all}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="flex items-center gap-1 text-xs text-gray-500"><CheckCircle2 size={14} /> Lulus</p><p className="mt-1 text-2xl font-bold text-emerald-700">{stats.pass}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="flex items-center gap-1 text-xs text-gray-500"><Clock3 size={14} /> Perlu perbaikan</p><p className="mt-1 text-2xl font-bold text-amber-700">{stats.fix}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Ditolak</p><p className="mt-1 text-2xl font-bold text-red-700">{stats.rejected}</p></div>
    </div>

    {showForm && <section className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId ? 'Edit inspeksi QC' : 'Inspeksi QC baru'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup form" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Proyek *<input value={draft.proyek} onChange={e => setField('proyek', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Nama proyek" /></label>
        <label className="text-sm font-medium">Unit / lokasi *<input value={draft.lokasi_unit} onChange={e => setField('lokasi_unit', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Blok A / Unit A-01 / STA" /></label>
        <label className="text-sm font-medium">Tahap pekerjaan *<input value={draft.tahap_pekerjaan} onChange={e => setField('tahap_pekerjaan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Pondasi, struktur, finishing..." /></label>
        <label className="text-sm font-medium md:col-span-2">Item/checklist yang diperiksa *<input value={draft.item_inspeksi} onChange={e => setField('item_inspeksi', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Misal: dimensi balok, ketebalan pasangan, kemiringan saluran" /></label>
        <label className="text-sm font-medium">Tanggal inspeksi *<input type="date" value={draft.tanggal_inspeksi} onChange={e => setField('tanggal_inspeksi', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Pemeriksa/PIC QC *<input value={draft.pemeriksa} onChange={e => setField('pemeriksa', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Hasil inspeksi<select value={draft.hasil} onChange={e => setField('hasil', e.target.value as QCOutcome)} className="mt-1 w-full rounded-lg border px-3 py-2">{outcomes.map(status => <option key={status} value={status}>{outcomeLabel[status]}</option>)}</select></label>
        <label className="text-sm font-medium md:col-span-3">Temuan/catatan<textarea value={draft.temuan} onChange={e => setField('temuan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} placeholder="Catat hasil ukur, standar/gambar acuan, dan temuan aktual." /></label>
        <label className="text-sm font-medium md:col-span-2">Tindakan perbaikan {draft.hasil === 'Perlu_Perbaikan' ? '*' : ''}<textarea value={draft.tindakan_perbaikan} onChange={e => setField('tindakan_perbaikan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} /></label>
        <label className="text-sm font-medium">Tenggat perbaikan<input type="date" value={draft.tenggat_perbaikan} onChange={e => setField('tenggat_perbaikan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium md:col-span-3">Lampiran bukti foto/PDF (opsional, maksimal 4 MB)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" /><span className="mt-1 block text-xs text-gray-500">File baru diunggah ke folder Google Drive ERP. Pastikan folder dibagikan hanya kepada staf/pemilik yang berhak.</span>{draft.nama_file && !selectedFile && <span className="mt-1 block text-xs text-cyan-800">Lampiran tersimpan: {draft.nama_file}</span>}{selectedFile && <span className="mt-1 block text-xs text-cyan-800">File baru dipilih: {selectedFile.name}</span>}</label>
        <label className="text-sm font-medium md:col-span-3">Tautan bukti eksternal (opsional)<input type="url" value={draft.tautan_bukti} onChange={e => setField('tautan_bukti', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="https://drive.google.com/... atau tautan yang sudah Anda miliki" /></label>
      </div>
      <div className="mt-5 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-white hover:bg-cyan-800"><Save size={16} />Simpan</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}

    <div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari proyek, unit, item, pemeriksa…" className="flex-1 rounded-lg border bg-white px-3 py-2" /><select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="rounded-lg border bg-white px-3 py-2"><option value="Semua">Semua status</option>{outcomes.map(status => <option key={status} value={status}>{outcomeLabel[status]}</option>)}</select></div>

    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Register QC ({rows.length})</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">Tanggal / ID</th><th className="p-3">Proyek & unit</th><th className="p-3">Tahap / item</th><th className="p-3">Pemeriksa</th><th className="p-3">Hasil</th><th className="p-3">Temuan/perbaikan</th><th className="p-3">Bukti</th><th className="p-3">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(row => <tr key={row.id} className="align-top hover:bg-gray-50"><td className="p-3 whitespace-nowrap">{row.tanggal_inspeksi}<div className="text-xs text-gray-500">{row.id}</div></td><td className="p-3">{row.proyek}<div className="text-xs text-gray-500">{row.lokasi_unit}</div></td><td className="p-3">{row.tahap_pekerjaan}<div className="text-xs text-gray-500">{row.item_inspeksi}</div></td><td className="p-3">{row.pemeriksa}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass[row.hasil]}`}>{outcomeLabel[row.hasil]}</span></td><td className="p-3 max-w-xs"><div>{row.temuan || '—'}</div>{row.tindakan_perbaikan && <div className="mt-1 text-xs text-amber-800">Tindak lanjut: {row.tindakan_perbaikan} {row.tenggat_perbaikan && `(batas ${row.tenggat_perbaikan})`}</div>}</td><td className="p-3">{row.local_file_key && <button onClick={() => void downloadEvidence(row)} className="inline-flex items-center gap-1 text-cyan-700 underline"><Download size={13} />{row.nama_file || 'Unduh lampiran'}</button>}{row.tautan_bukti && <a className="ml-2 inline-block text-blue-700 underline" href={row.tautan_bukti} target="_blank" rel="noreferrer">Buka tautan</a>}{!row.local_file_key && !row.tautan_bukti ? 'Belum ada' : ''}</td><td className="p-3"><button onClick={() => startEdit(row)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button></td></tr>)}{rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Belum ada inspeksi. Data tidak diisi otomatis agar tidak tercampur dengan QC aktual.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}
