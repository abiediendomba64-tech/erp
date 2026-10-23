import { useMemo, useState } from 'react';
import { Building2, Plus, Save, Pencil, X, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../store';
import { formatRupiah, generateId, getLocalDateISO } from '../data';
import type { AssetCategory, AssetRecord, AssetStatus } from '../types';

type AssetDraft = Omit<AssetRecord, 'id' | 'created_at' | 'updated_at'>;
const categories: AssetCategory[] = ['Tanah', 'Bangunan', 'Alat_Berat', 'Kendaraan', 'Peralatan', 'Infrastruktur', 'Lainnya'];
const categoryLabel: Record<AssetCategory, string> = {
  Tanah: 'Tanah', Bangunan: 'Bangunan', Alat_Berat: 'Alat berat', Kendaraan: 'Kendaraan',
  Peralatan: 'Peralatan', Infrastruktur: 'Infrastruktur', Lainnya: 'Lainnya'
};
const statuses: AssetStatus[] = ['Aktif', 'Pemeliharaan', 'Nonaktif', 'Dilepas'];
const emptyDraft = (): AssetDraft => ({
  kode_aset: '', nama_aset: '', kategori: 'Peralatan', proyek: '',
  tanggal_perolehan: getLocalDateISO(), nilai_perolehan: 0, nilai_residu: 0,
  umur_manfaat_tahun: 0, lokasi: '', penanggung_jawab: '', status: 'Aktif',
  referensi_dokumen: '', catatan: ''
});

function estimateBookValue(asset: AssetRecord, asOf = new Date()): number {
  if (asset.status === 'Dilepas') return 0;
  if (asset.kategori === 'Tanah' || asset.umur_manfaat_tahun <= 0) return Math.max(0, asset.nilai_perolehan);
  const start = new Date(asset.tanggal_perolehan + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || start > asOf) return Math.max(0, asset.nilai_perolehan);
  const elapsed = Math.max(0, (asOf.getFullYear() - start.getFullYear()) * 12 + asOf.getMonth() - start.getMonth() - (asOf.getDate() < start.getDate() ? 1 : 0));
  const lifeMonths = asset.umur_manfaat_tahun * 12;
  const depreciable = Math.max(0, asset.nilai_perolehan - asset.nilai_residu);
  const accumulated = Math.min(depreciable, depreciable * Math.min(elapsed, lifeMonths) / lifeMonths);
  return Math.max(asset.nilai_residu, asset.nilai_perolehan - accumulated);
}

export default function AssetsPage() {
  const { state, dispatch } = useAppContext();
  const [draft, setDraft] = useState<AssetDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | AssetStatus>('Semua');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(() => state.assets.filter(item => {
    const text = [item.kode_aset, item.nama_aset, item.proyek, item.lokasi, item.penanggung_jawab].join(' ').toLowerCase();
    return text.includes(search.trim().toLowerCase()) && (statusFilter === 'Semua' || item.status === statusFilter);
  }).sort((a, b) => a.kode_aset.localeCompare(b.kode_aset)), [state.assets, search, statusFilter]);

  const activeValue = rows.filter(item => item.status !== 'Dilepas').reduce((sum, item) => sum + estimateBookValue(item), 0);
  const setField = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) => setDraft(current => ({ ...current, [key]: value }));

  const startNew = () => { setEditingId(null); setDraft(emptyDraft()); setError(''); setMessage(''); setShowForm(true); };
  const startEdit = (record: AssetRecord) => {
    const { id, created_at, updated_at, ...fields } = record;
    void created_at; void updated_at;
    setEditingId(id); setDraft(fields); setError(''); setMessage(''); setShowForm(true);
  };

  const save = () => {
    setError('');
    if (!draft.kode_aset.trim() || !draft.nama_aset.trim() || !draft.proyek.trim() || !draft.tanggal_perolehan) {
      setError('Kode, nama aset, proyek, dan tanggal perolehan wajib diisi.'); return;
    }
    const numbers = [draft.nilai_perolehan, draft.nilai_residu, draft.umur_manfaat_tahun];
    if (numbers.some(value => !Number.isFinite(value) || value < 0)) { setError('Nilai dan umur manfaat harus angka nol atau lebih.'); return; }
    if (draft.nilai_residu > draft.nilai_perolehan) { setError('Nilai residu tidak boleh melebihi nilai perolehan.'); return; }
    if (draft.umur_manfaat_tahun > 100) { setError('Umur manfaat lebih dari 100 tahun perlu diperiksa.'); return; }
    const duplicate = state.assets.find(item => item.id !== editingId && item.kode_aset.trim().toLowerCase() === draft.kode_aset.trim().toLowerCase());
    if (duplicate) { setError('Kode aset sudah digunakan.'); return; }

    const now = new Date().toISOString();
    const previous = editingId ? state.assets.find(item => item.id === editingId) : undefined;
    const record: AssetRecord = {
      ...draft, kode_aset: draft.kode_aset.trim(), nama_aset: draft.nama_aset.trim(),
      proyek: draft.proyek.trim(), lokasi: draft.lokasi.trim(),
      penanggung_jawab: draft.penanggung_jawab.trim(), referensi_dokumen: draft.referensi_dokumen.trim(),
      catatan: draft.catatan.trim(), id: editingId || generateId('AST', state.assets),
      created_at: previous?.created_at || now, updated_at: now
    };
    if (editingId) dispatch({ type: 'UPDATE_ASSET', payload: record });
    else dispatch({ type: 'ADD_ASSET', payload: record });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: {
      id: generateId('LOG', state.auditLog), timestamp: now,
      user: 'Pengguna lokal (belum terautentikasi)', aksi: editingId ? 'UPDATE' : 'CREATE',
      tabel: 'Aset', record_id: record.id, nilai_lama: previous ? JSON.stringify(previous) : '',
      nilai_baru: JSON.stringify(record), alasan: 'Pencatatan register aset',
      sumber_bukti: record.referensi_dokumen
    } });
    setShowForm(false); setEditingId(null);
    setMessage('Register aset tersimpan di browser saat ini. Nilai buku adalah estimasi garis lurus dan belum membuat jurnal penyusutan atau posting pelepasan.');
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Building2 className="text-indigo-700" />Register Aset</h1><p className="mt-1 text-sm text-gray-500">Register tanah, bangunan, alat berat, kendaraan, peralatan, dan infrastruktur proyek/perusahaan.</p></div>
      <button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"><Plus size={17} />Tambah aset</button>
    </header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Batas akuntansi</p><p className="mt-1">Penyusutan garis lurus di sini hanya estimasi register. Tanah tidak disusutkan otomatis. Modul belum memposting jurnal penyusutan, impairment, disposal, atau rekonsiliasi ke buku besar.</p></div>
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Aset terdaftar</p><p className="mt-1 text-2xl font-bold">{state.assets.length}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Aktif/tercatat (filter saat ini)</p><p className="mt-1 text-2xl font-bold">{rows.filter(item => item.status !== 'Dilepas').length}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Estimasi nilai buku (hasil filter)</p><p className="mt-1 text-xl font-bold">{formatRupiah(activeValue)}</p></div>
    </div>

    {showForm && <section className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId ? 'Edit aset' : 'Aset baru'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup form" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Kode aset *<input value={draft.kode_aset} onChange={e => setField('kode_aset', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="AST-0001" /></label>
        <label className="text-sm font-medium md:col-span-2">Nama aset *<input value={draft.nama_aset} onChange={e => setField('nama_aset', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Nama aset dan spesifikasi" /></label>
        <label className="text-sm font-medium">Kategori<select value={draft.kategori} onChange={e => setField('kategori', e.target.value as AssetCategory)} className="mt-1 w-full rounded-lg border px-3 py-2">{categories.map(item => <option key={item} value={item}>{categoryLabel[item]}</option>)}</select></label>
        <label className="text-sm font-medium">Proyek/perusahaan *<input value={draft.proyek} onChange={e => setField('proyek', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="PT / Site / proyek" /></label>
        <label className="text-sm font-medium">Tanggal perolehan *<input type="date" value={draft.tanggal_perolehan} onChange={e => setField('tanggal_perolehan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Nilai perolehan (Rp) *<input type="number" min="0" value={draft.nilai_perolehan} onChange={e => setField('nilai_perolehan', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Nilai residu (Rp)<input type="number" min="0" value={draft.nilai_residu} onChange={e => setField('nilai_residu', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Umur manfaat (tahun)<input type="number" min="0" step="0.5" value={draft.umur_manfaat_tahun} onChange={e => setField('umur_manfaat_tahun', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" /><span className="block mt-1 text-xs text-gray-500">Isi 0 untuk tanah/tidak menghitung penyusutan.</span></label>
        <label className="text-sm font-medium">Status<select value={draft.status} onChange={e => setField('status', e.target.value as AssetStatus)} className="mt-1 w-full rounded-lg border px-3 py-2">{statuses.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-sm font-medium">Lokasi<input value={draft.lokasi} onChange={e => setField('lokasi', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Gudang / blok / koordinat" /></label>
        <label className="text-sm font-medium">Penanggung jawab<input value={draft.penanggung_jawab} onChange={e => setField('penanggung_jawab', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium md:col-span-2">Referensi dokumen (ID/URL)<input value={draft.referensi_dokumen} onChange={e => setField('referensi_dokumen', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="ID arsip atau URL bukti pembelian/sertifikat" /></label>
        <label className="text-sm font-medium md:col-span-3">Catatan<textarea value={draft.catatan} onChange={e => setField('catatan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} /></label>
      </div>
      <div className="mt-5 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800"><Save size={16} />Simpan aset</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}

    <div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kode, aset, proyek, lokasi, PIC…" className="flex-1 rounded-lg border bg-white px-3 py-2" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-lg border bg-white px-3 py-2"><option value="Semua">Semua status</option>{statuses.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Register aset ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">Kode/nama</th><th className="p-3">Kategori/proyek</th><th className="p-3">Perolehan</th><th className="p-3 text-right">Nilai perolehan</th><th className="p-3 text-right">Estimasi nilai buku</th><th className="p-3">Lokasi/PIC</th><th className="p-3">Status</th><th className="p-3">Dokumen</th><th className="p-3">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(row => <tr key={row.id} className="align-top hover:bg-gray-50"><td className="p-3"><strong>{row.kode_aset}</strong><div>{row.nama_aset}</div><div className="text-xs text-gray-500">{row.id}</div></td><td className="p-3">{categoryLabel[row.kategori]}<div className="text-xs text-gray-500">{row.proyek}</div></td><td className="p-3">{row.tanggal_perolehan}</td><td className="p-3 text-right">{formatRupiah(row.nilai_perolehan)}</td><td className="p-3 text-right font-semibold">{formatRupiah(estimateBookValue(row))}</td><td className="p-3">{row.lokasi || '—'}<div className="text-xs text-gray-500">{row.penanggung_jawab || 'PIC belum diisi'}</div></td><td className="p-3">{row.status}</td><td className="p-3">{row.referensi_dokumen ? /^https?:\/\//i.test(row.referensi_dokumen) ? <a href={row.referensi_dokumen} target="_blank" rel="noreferrer" className="text-indigo-700 underline">Buka referensi</a> : <span>{row.referensi_dokumen}</span> : 'Belum ada'}</td><td className="p-3"><button onClick={() => startEdit(row)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button></td></tr>)}{rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-500">Belum ada aset terdaftar. Jangan isi saldo aset dari contoh yang tidak diverifikasi.</td></tr>}</tbody></table></div></section>
  </div>;
}
