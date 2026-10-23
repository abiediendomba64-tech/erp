import { useMemo, useState } from 'react';
import { House, Plus, Save, Pencil, X, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../store';
import { generateId } from '../data';
import type { HousingUnit, PermitStatus, UnitConstructionStatus, UnitSalesStatus } from '../types';

type UnitDraft = {
  kode_unit: string; proyek: string; blok: string; tipe_rumah: string;
  luas_tanah_m2: string; luas_bangunan_m2: string;
  status_konstruksi: UnitConstructionStatus; status_penjualan: UnitSalesStatus;
  status_pbg: PermitStatus; status_slf: PermitStatus;
  rab_ref: string; dokumen_tanah_ref: string; dokumen_pbg_ref: string; dokumen_slf_ref: string;
  kontrak_penjualan_ref: string; dokumen_serah_terima_ref: string; catatan: string;
};
const constructionOptions: UnitConstructionStatus[] = ['Belum_Mulai','Berjalan','QC','Perlu_Perbaikan','Siap_Serah_Terima','Selesai'];
const salesOptions: UnitSalesStatus[] = ['Belum_Dipasarkan','Dipasarkan','Dipesan','Terjual','Serah_Terima','Dihuni','Dibatalkan'];
const permitOptions: PermitStatus[] = ['Belum_Diajukan','Dalam_Proses','Terbit','Tidak_Berlaku','Perlu_Verifikasi'];
const display = (value: string) => value.replace(/_/g, ' ');
const emptyDraft = (): UnitDraft => ({
  kode_unit: '', proyek: '', blok: '', tipe_rumah: '', luas_tanah_m2: '', luas_bangunan_m2: '',
  status_konstruksi: 'Belum_Mulai', status_penjualan: 'Belum_Dipasarkan',
  status_pbg: 'Belum_Diajukan', status_slf: 'Belum_Diajukan',
  rab_ref: '', dokumen_tanah_ref: '', dokumen_pbg_ref: '', dokumen_slf_ref: '',
  kontrak_penjualan_ref: '', dokumen_serah_terima_ref: '', catatan: ''
});
const linkLooksValid = (value: string) => !value.trim() || /^https?:\/\//i.test(value.trim()) || /^[A-Z0-9_-]{2,100}$/i.test(value.trim());

export default function HousingUnitsPage() {
  const { state, dispatch } = useAppContext();
  const [draft, setDraft] = useState<UnitDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [constructionFilter, setConstructionFilter] = useState<'Semua' | UnitConstructionStatus>('Semua');
  const [salesFilter, setSalesFilter] = useState<'Semua' | UnitSalesStatus>('Semua');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(() => state.housingUnits.filter(row => {
    const text = [row.kode_unit,row.proyek,row.blok,row.tipe_rumah,row.rab_ref,row.dokumen_tanah_ref].join(' ').toLowerCase();
    return text.includes(search.trim().toLowerCase()) &&
      (constructionFilter === 'Semua' || row.status_konstruksi === constructionFilter) &&
      (salesFilter === 'Semua' || row.status_penjualan === salesFilter);
  }).sort((a,b) => a.proyek.localeCompare(b.proyek) || a.blok.localeCompare(b.blok) || a.kode_unit.localeCompare(b.kode_unit)), [state.housingUnits,search,constructionFilter,salesFilter]);

  const setField = <K extends keyof UnitDraft>(key: K, value: UnitDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const startNew = () => { setEditingId(null); setDraft(emptyDraft()); setError(''); setMessage(''); setShowForm(true); };
  const startEdit = (row: HousingUnit) => {
    setEditingId(row.id);
    setDraft({
      kode_unit: row.kode_unit, proyek: row.proyek, blok: row.blok, tipe_rumah: row.tipe_rumah,
      luas_tanah_m2: String(row.luas_tanah_m2), luas_bangunan_m2: String(row.luas_bangunan_m2),
      status_konstruksi: row.status_konstruksi, status_penjualan: row.status_penjualan,
      status_pbg: row.status_pbg, status_slf: row.status_slf,
      rab_ref: row.rab_ref, dokumen_tanah_ref: row.dokumen_tanah_ref,
      dokumen_pbg_ref: row.dokumen_pbg_ref, dokumen_slf_ref: row.dokumen_slf_ref,
      kontrak_penjualan_ref: row.kontrak_penjualan_ref, dokumen_serah_terima_ref: row.dokumen_serah_terima_ref,
      catatan: row.catatan
    });
    setError(''); setMessage(''); setShowForm(true);
  };

  const save = () => {
    setError('');
    if (!draft.kode_unit.trim() || !draft.proyek.trim() || !draft.blok.trim() || !draft.tipe_rumah.trim()) {
      setError('Kode unit, proyek, blok dan tipe rumah wajib diisi.'); return;
    }
    const areaValues = [draft.luas_tanah_m2, draft.luas_bangunan_m2].map(v => v.trim() === '' ? 0 : Number(v));
    if (areaValues.some(value => !Number.isFinite(value) || value < 0) || (draft.luas_tanah_m2.trim() && areaValues[0] <= 0) ||
        (draft.luas_bangunan_m2.trim() && areaValues[1] <= 0)) {
      setError('Luas tanah/bangunan harus angka positif atau dibiarkan kosong.'); return;
    }
    if (draft.status_pbg === 'Terbit' && !draft.dokumen_pbg_ref.trim()) {
      setError('Status PBG “Terbit” wajib dilengkapi referensi dokumen PBG.'); return;
    }
    if (draft.status_slf === 'Terbit' && !draft.dokumen_slf_ref.trim()) {
      setError('Status SLF “Terbit” wajib dilengkapi referensi dokumen SLF.'); return;
    }
    if (['Terjual','Serah_Terima','Dihuni'].includes(draft.status_penjualan) && !draft.kontrak_penjualan_ref.trim()) {
      setError('Status unit Terjual/Serah Terima/Dihuni wajib memiliki referensi kontrak/penjualan.'); return;
    }
    if (draft.status_penjualan === 'Serah_Terima' && !draft.dokumen_serah_terima_ref.trim()) {
      setError('Status Serah Terima wajib memiliki referensi dokumen BAST/serah terima.'); return;
    }
    const refs = [draft.rab_ref,draft.dokumen_tanah_ref,draft.dokumen_pbg_ref,draft.dokumen_slf_ref,draft.kontrak_penjualan_ref,draft.dokumen_serah_terima_ref];
    if (refs.some(value => !linkLooksValid(value))) {
      setError('Referensi dokumen harus berupa URL http/https atau ID dokumen yang dapat ditelusuri.'); return;
    }
    const key = draft.kode_unit.trim().toLowerCase();
    const duplicate = state.housingUnits.find(row => row.id !== editingId && row.kode_unit.trim().toLowerCase() === key);
    if (duplicate) { setError('Kode unit sudah digunakan. Pastikan tiap kavling memiliki ID unik.'); return; }

    const now = new Date().toISOString();
    const old = editingId ? state.housingUnits.find(row => row.id === editingId) : undefined;
    const record: HousingUnit = {
      id: editingId || generateId('UNIT', state.housingUnits),
      kode_unit: draft.kode_unit.trim(), proyek: draft.proyek.trim(), blok: draft.blok.trim(), tipe_rumah: draft.tipe_rumah.trim(),
      luas_tanah_m2: areaValues[0], luas_bangunan_m2: areaValues[1],
      status_konstruksi: draft.status_konstruksi, status_penjualan: draft.status_penjualan,
      status_pbg: draft.status_pbg, status_slf: draft.status_slf,
      rab_ref: draft.rab_ref.trim(), dokumen_tanah_ref: draft.dokumen_tanah_ref.trim(),
      dokumen_pbg_ref: draft.dokumen_pbg_ref.trim(), dokumen_slf_ref: draft.dokumen_slf_ref.trim(),
      kontrak_penjualan_ref: draft.kontrak_penjualan_ref.trim(), dokumen_serah_terima_ref: draft.dokumen_serah_terima_ref.trim(),
      catatan: draft.catatan.trim(), created_at: old?.created_at || now, updated_at: now
    };
    if (editingId) dispatch({ type: 'UPDATE_HOUSING_UNIT', payload: record });
    else dispatch({ type: 'ADD_HOUSING_UNIT', payload: record });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: {
      id: generateId('LOG',state.auditLog), timestamp: now,
      user: 'Pengguna lokal (belum terautentikasi)', aksi: editingId ? 'UPDATE' : 'CREATE',
      tabel: 'Unit Perumahan', record_id: record.id, nilai_lama: old ? JSON.stringify(old) : '',
      nilai_baru: JSON.stringify(record), alasan: 'Perubahan register unit dan status siklus',
      sumber_bukti: [record.rab_ref,record.dokumen_tanah_ref,record.dokumen_pbg_ref,record.dokumen_slf_ref,record.kontrak_penjualan_ref,record.dokumen_serah_terima_ref].filter(Boolean).join('; ')
    } });
    setShowForm(false); setEditingId(null);
    setMessage('Unit tersimpan di browser ini. Referensi RAB/dokumen adalah tautan atau ID manual; belum ada sinkronisasi otomatis ke RAB, Drive, kontrak atau sistem perizinan.');
  };

  const metrics = {
    total: rows.length,
    construction: rows.filter(row => ['Berjalan','QC','Perlu_Perbaikan'].includes(row.status_konstruksi)).length,
    qc: rows.filter(row => row.status_konstruksi === 'QC' || row.status_konstruksi === 'Perlu_Perbaikan').length,
    sold: rows.filter(row => ['Terjual','Serah_Terima','Dihuni'].includes(row.status_penjualan)).length
  };
  const refCell = (ref: string) => ref ? /^https?:\/\//i.test(ref) ? <a href={ref} target="_blank" rel="noreferrer" className="text-blue-700 underline">Buka</a> : <span className="font-mono text-xs">{ref}</span> : '—';

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><House className="text-emerald-700" />Register Proyek & Unit Perumahan</h1><p className="mt-1 text-sm text-gray-500">Master unit/kavling, tipe rumah, status konstruksi, QC, penjualan, perizinan dan dokumen serah terima.</p></div><button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"><Plus size={17} />Tambah unit</button></header>

    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Kontrol status unit</p><p className="mt-1">Status berikut berdasarkan input dan bukti referensi, bukan verifikasi eksternal. PBG/SLF/penjualan tidak dianggap resmi hanya karena status diubah. Data ini belum cloud-sync; ID unit perlu dipakai konsisten sebagai referensi pada RAB dan dokumen.</p></div>
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Unit terdaftar</p><p className="mt-1 text-2xl font-bold">{metrics.total}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Konstruksi berjalan</p><p className="mt-1 text-2xl font-bold">{metrics.construction}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Perlu QC/perbaikan</p><p className="mt-1 text-2xl font-bold text-amber-700">{metrics.qc}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Terjual/serah terima/dihuni</p><p className="mt-1 text-2xl font-bold">{metrics.sold}</p></div></div>

    {showForm && <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId ? 'Edit unit' : 'Unit/kavling baru'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Kode unit/kavling *<input value={draft.kode_unit} onChange={e => setField('kode_unit',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="A-01" /></label>
        <label className="text-sm font-medium md:col-span-2">Nama proyek/PT *<input value={draft.proyek} onChange={e => setField('proyek',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Nama proyek/perusahaan" /></label>
        <label className="text-sm font-medium">Blok *<input value={draft.blok} onChange={e => setField('blok',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Blok A" /></label>
        <label className="text-sm font-medium">Tipe/spesifikasi rumah *<input value={draft.tipe_rumah} onChange={e => setField('tipe_rumah',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Tipe 36/72, subsidi/komersial" /></label>
        <label className="text-sm font-medium">Luas tanah (m²)<input type="number" min="0" step="any" value={draft.luas_tanah_m2} onChange={e => setField('luas_tanah_m2',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Luas bangunan (m²)<input type="number" min="0" step="any" value={draft.luas_bangunan_m2} onChange={e => setField('luas_bangunan_m2',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Status konstruksi<select value={draft.status_konstruksi} onChange={e => setField('status_konstruksi',e.target.value as UnitConstructionStatus)} className="mt-1 w-full rounded-lg border px-3 py-2">{constructionOptions.map(item=><option key={item} value={item}>{display(item)}</option>)}</select></label>
        <label className="text-sm font-medium">Status penjualan<select value={draft.status_penjualan} onChange={e => setField('status_penjualan',e.target.value as UnitSalesStatus)} className="mt-1 w-full rounded-lg border px-3 py-2">{salesOptions.map(item=><option key={item} value={item}>{display(item)}</option>)}</select></label>
        <label className="text-sm font-medium">Status PBG<select value={draft.status_pbg} onChange={e => setField('status_pbg',e.target.value as PermitStatus)} className="mt-1 w-full rounded-lg border px-3 py-2">{permitOptions.map(item=><option key={item} value={item}>{display(item)}</option>)}</select></label>
        <label className="text-sm font-medium">Status SLF<select value={draft.status_slf} onChange={e => setField('status_slf',e.target.value as PermitStatus)} className="mt-1 w-full rounded-lg border px-3 py-2">{permitOptions.map(item=><option key={item} value={item}>{display(item)}</option>)}</select></label>
        <label className="text-sm font-medium">Referensi RAB (ID/unit)<input value={draft.rab_ref} onChange={e => setField('rab_ref',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Gunakan kode unit yang sama di RAB" /></label>
        <label className="text-sm font-medium">Dokumen tanah (ID/URL)<input value={draft.dokumen_tanah_ref} onChange={e => setField('dokumen_tanah_ref',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Dokumen PBG (ID/URL)<input value={draft.dokumen_pbg_ref} onChange={e => setField('dokumen_pbg_ref',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Dokumen SLF (ID/URL)<input value={draft.dokumen_slf_ref} onChange={e => setField('dokumen_slf_ref',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Kontrak/penjualan (ID/URL)<input value={draft.kontrak_penjualan_ref} onChange={e => setField('kontrak_penjualan_ref',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">BAST/serah terima (ID/URL)<input value={draft.dokumen_serah_terima_ref} onChange={e => setField('dokumen_serah_terima_ref',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium md:col-span-3">Catatan<textarea value={draft.catatan} onChange={e => setField('catatan',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={2}/></label>
      </div><div className="mt-5 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800"><Save size={16}/>Simpan unit</button><button onClick={()=>setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}

    <div className="flex flex-col gap-3 lg:flex-row"><input value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 rounded-lg border bg-white px-3 py-2" placeholder="Cari proyek, blok, unit, tipe, referensi RAB/dokumen…"/><select value={constructionFilter} onChange={e=>setConstructionFilter(e.target.value as typeof constructionFilter)} className="rounded-lg border bg-white px-3 py-2"><option value="Semua">Semua status konstruksi</option>{constructionOptions.map(item=><option key={item} value={item}>{display(item)}</option>)}</select><select value={salesFilter} onChange={e=>setSalesFilter(e.target.value as typeof salesFilter)} className="rounded-lg border bg-white px-3 py-2"><option value="Semua">Semua status penjualan</option>{salesOptions.map(item=><option key={item} value={item}>{display(item)}</option>)}</select></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Daftar unit ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">Unit/proyek</th><th className="p-3">Tipe & luas</th><th className="p-3">Konstruksi/QC</th><th className="p-3">Penjualan</th><th className="p-3">PBG / SLF</th><th className="p-3">RAB</th><th className="p-3">Dokumen</th><th className="p-3">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(row=><tr key={row.id} className="align-top hover:bg-gray-50"><td className="p-3"><strong>{row.kode_unit}</strong><div>{row.proyek}</div><div className="text-xs text-gray-500">{row.blok} · {row.id}</div></td><td className="p-3">{row.tipe_rumah}<div className="text-xs text-gray-500">Tanah {row.luas_tanah_m2 || '—'} m² · Bangunan {row.luas_bangunan_m2 || '—'} m²</div></td><td className="p-3">{display(row.status_konstruksi)}</td><td className="p-3">{display(row.status_penjualan)}</td><td className="p-3"><div>PBG: {display(row.status_pbg)}</div><div>SLF: {display(row.status_slf)}</div></td><td className="p-3">{refCell(row.rab_ref)}</td><td className="p-3"><div>Tanah: {refCell(row.dokumen_tanah_ref)}</div><div>PBG: {refCell(row.dokumen_pbg_ref)}</div><div>SLF: {refCell(row.dokumen_slf_ref)}</div><div>BAST: {refCell(row.dokumen_serah_terima_ref)}</div></td><td className="p-3"><button onClick={()=>startEdit(row)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13}/>Edit</button></td></tr>)}{rows.length===0&&<tr><td colSpan={8} className="p-8 text-center text-gray-500">Belum ada unit yang dicatat. Tidak ada unit demo yang diklaim sebagai data aktual.</td></tr>}</tbody></table></div></section>
  </div>;
}
