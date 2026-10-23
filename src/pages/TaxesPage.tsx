import { useMemo, useState } from 'react';
import { Calculator, Plus, Save, Pencil, X, AlertTriangle, ArrowRightCircle, FileCheck2 } from 'lucide-react';
import { useAppContext } from '../store';
import { formatRupiah, generateId, getLocalDateISO } from '../data';
import type { TaxRecord, TaxStatus, TaxType } from '../types';

type TaxDraft = {
  jenis_pajak: TaxType;
  proyek: string;
  unit: string;
  periode: string;
  referensi_transaksi: string;
  dasar_pengenaan: string;
  tarif_persen: string;
  nilai_pajak: string;
  sumber_aturan: string;
  jatuh_tempo: string;
  catatan: string;
  disetujui_oleh: string;
};
const types: TaxType[] = ['PPN', 'PPh_21', 'PPh_23', 'PPh_Final', 'BPHTB', 'PBB', 'Lainnya'];
const typeLabel: Record<TaxType, string> = { PPN: 'PPN', PPh_21: 'PPh 21', PPh_23: 'PPh 23', PPh_Final: 'PPh Final', BPHTB: 'BPHTB', PBB: 'PBB', Lainnya: 'Lainnya' };
const statuses: TaxStatus[] = ['Draft', 'Perlu_Verifikasi', 'Disetujui', 'Dibayar', 'Dilaporkan'];
const statusLabel: Record<TaxStatus, string> = { Draft: 'Draft', Perlu_Verifikasi: 'Perlu verifikasi', Disetujui: 'Disetujui', Dibayar: 'Dibayar', Dilaporkan: 'Dilaporkan' };
const emptyDraft = (): TaxDraft => ({
  jenis_pajak: 'PPN', proyek: '', unit: '', periode: getLocalDateISO().slice(0, 7),
  referensi_transaksi: '', dasar_pengenaan: '', tarif_persen: '', nilai_pajak: '',
  sumber_aturan: '', jatuh_tempo: '', catatan: '', disetujui_oleh: ''
});
const isMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const nextStatus: Partial<Record<TaxStatus, TaxStatus>> = {
  Draft: 'Perlu_Verifikasi', Perlu_Verifikasi: 'Disetujui', Disetujui: 'Dibayar', Dibayar: 'Dilaporkan'
};

export default function TaxesPage() {
  const { state, dispatch } = useAppContext();
  const [draft, setDraft] = useState<TaxDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | TaxStatus>('Semua');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [referenceDrafts, setReferenceDrafts] = useState<Record<string, { payment: string; filing: string }>>({});

  const rows = useMemo(() => state.taxRecords.filter(item => {
    const text = [item.id, item.jenis_pajak, item.proyek, item.unit, item.periode, item.referensi_transaksi, item.sumber_aturan].join(' ').toLowerCase();
    return text.includes(search.trim().toLowerCase()) && (statusFilter === 'Semua' || item.status === statusFilter);
  }).sort((a, b) => b.periode.localeCompare(a.periode) || a.jatuh_tempo.localeCompare(b.jatuh_tempo)), [state.taxRecords, search, statusFilter]);

  const setField = <K extends keyof TaxDraft>(key: K, value: TaxDraft[K]) => setDraft(current => {
    const next = { ...current, [key]: value };
    if (key === 'dasar_pengenaan' || key === 'tarif_persen') {
      const base = Number(next.dasar_pengenaan);
      const rate = Number(next.tarif_persen);
      if (next.dasar_pengenaan.trim() && next.tarif_persen.trim() && Number.isFinite(base) && base >= 0 && Number.isFinite(rate) && rate >= 0) {
        next.nilai_pajak = String(Math.round(base * rate / 100));
      }
    }
    return next;
  });

  const startNew = () => { setEditingId(null); setDraft(emptyDraft()); setError(''); setMessage(''); setShowForm(true); };
  const startEdit = (record: TaxRecord) => {
    if (!['Draft', 'Perlu_Verifikasi'].includes(record.status)) {
      setMessage('Data pajak yang sudah disetujui tidak dapat diedit. Gunakan referensi pembayaran/pelaporan pada register dan alur status.');
      return;
    }
    setEditingId(record.id);
    setDraft({
      jenis_pajak: record.jenis_pajak, proyek: record.proyek, unit: record.unit, periode: record.periode,
      referensi_transaksi: record.referensi_transaksi, dasar_pengenaan: String(record.dasar_pengenaan),
      tarif_persen: record.tarif_persen === null ? '' : String(record.tarif_persen),
      nilai_pajak: String(record.nilai_pajak), sumber_aturan: record.sumber_aturan,
      jatuh_tempo: record.jatuh_tempo, catatan: record.catatan, disetujui_oleh: record.disetujui_oleh
    });
    setError(''); setMessage(''); setShowForm(true);
  };

  const save = () => {
    setError('');
    if (!draft.proyek.trim() || !isMonth(draft.periode) || !draft.jatuh_tempo || !draft.sumber_aturan.trim()) {
      setError('Proyek, periode YYYY-MM, jatuh tempo dan sumber/rujukan ketentuan pajak wajib diisi.'); return;
    }
    const base = Number(draft.dasar_pengenaan);
    const rate = draft.tarif_persen.trim() ? Number(draft.tarif_persen) : null;
    const manualTax = Number(draft.nilai_pajak);
    if (!Number.isFinite(base) || base < 0 || (rate !== null && (!Number.isFinite(rate) || rate < 0)) ||
        !draft.nilai_pajak.trim() || !Number.isFinite(manualTax) || manualTax < 0) {
      setError('Dasar pengenaan, tarif manual (jika dipakai), dan nilai pajak harus valid dan tidak negatif.'); return;
    }
    const expected = rate === null ? manualTax : Math.round(base * rate / 100);
    if (Math.abs(expected - manualTax) > 1) {
      setError('Nilai pajak tidak sesuai dengan dasar pengenaan × tarif yang diinput. Kosongkan tarif bila nominal pajak dimasukkan manual.'); return;
    }
    if (draft.disetujui_oleh.trim().length > 150) { setError('Nama pemeriksa terlalu panjang.'); return; }

    const now = new Date().toISOString();
    const previous = editingId ? state.taxRecords.find(item => item.id === editingId) : undefined;
    const record: TaxRecord = {
      id: editingId || generateId('TAX', state.taxRecords),
      jenis_pajak: draft.jenis_pajak, proyek: draft.proyek.trim(), unit: draft.unit.trim(),
      periode: draft.periode, referensi_transaksi: draft.referensi_transaksi.trim(),
      dasar_pengenaan: base, tarif_persen: rate, nilai_pajak: expected, sumber_aturan: draft.sumber_aturan.trim(),
      jatuh_tempo: draft.jatuh_tempo, status: previous?.status || 'Draft',
      bukti_pembayaran: previous?.bukti_pembayaran || '', nomor_pelaporan: previous?.nomor_pelaporan || '',
      disetujui_oleh: draft.disetujui_oleh.trim(), catatan: draft.catatan.trim(),
      created_at: previous?.created_at || now, updated_at: now
    };
    if (editingId) dispatch({ type: 'UPDATE_TAX_RECORD', payload: record });
    else dispatch({ type: 'ADD_TAX_RECORD', payload: record });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: {
      id: generateId('LOG', state.auditLog), timestamp: now,
      user: 'Pengguna lokal (belum terautentikasi)', aksi: editingId ? 'UPDATE' : 'CREATE',
      tabel: 'Pajak', record_id: record.id, nilai_lama: previous ? JSON.stringify(previous) : '',
      nilai_baru: JSON.stringify(record), alasan: 'Pencatatan register kewajiban pajak',
      sumber_bukti: record.sumber_aturan
    } });
    setShowForm(false); setEditingId(null);
    setMessage('Register pajak tersimpan. Tarif tidak ditentukan otomatis; nominal dihitung dari tarif yang Anda masukkan atau memakai nominal manual. Verifikasi ketentuan dan periode dengan petugas pajak.');
  };

  const saveReferences = (record: TaxRecord) => {
    const refs = referenceDrafts[record.id] || { payment: record.bukti_pembayaran, filing: record.nomor_pelaporan };
    const now = new Date().toISOString();
    const updated = { ...record, bukti_pembayaran: refs.payment.trim(), nomor_pelaporan: refs.filing.trim(), updated_at: now };
    dispatch({ type: 'UPDATE_TAX_RECORD', payload: updated });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: {
      id: generateId('LOG', state.auditLog), timestamp: now,
      user: 'Pengguna lokal (belum terautentikasi)', aksi: 'UPDATE_REFERENSI',
      tabel: 'Pajak', record_id: record.id, nilai_lama: JSON.stringify({ bukti_pembayaran: record.bukti_pembayaran, nomor_pelaporan: record.nomor_pelaporan }),
      nilai_baru: JSON.stringify({ bukti_pembayaran: updated.bukti_pembayaran, nomor_pelaporan: updated.nomor_pelaporan }),
      alasan: 'Pembaruan referensi bayar/pelaporan', sumber_bukti: refs.payment.trim() || refs.filing.trim()
    } });
    setReferenceDrafts(current => ({ ...current, [record.id]: { payment: updated.bukti_pembayaran, filing: updated.nomor_pelaporan } }));
    setMessage('Referensi pembayaran/pelaporan tersimpan secara lokal. Isi nomor yang dapat ditelusuri ke dokumen aslinya.');
  };

  const advance = (record: TaxRecord) => {
    setError('');
    const target = nextStatus[record.status];
    if (!target) return;
    if (record.status === 'Draft' && !record.sumber_aturan.trim()) { setError('Isi sumber aturan/ketentuan sebelum mengirim untuk verifikasi.'); return; }
    if (record.status === 'Perlu_Verifikasi' && !record.disetujui_oleh.trim()) { setError('Isi nama pemeriksa yang menyetujui setelah verifikasi manual.'); return; }
    if (record.status === 'Disetujui' && !record.bukti_pembayaran.trim()) { setError('Simpan nomor/tautan bukti pembayaran sebelum menandai Dibayar.'); return; }
    if (record.status === 'Dibayar' && !record.nomor_pelaporan.trim()) { setError('Simpan nomor bukti pelaporan sebelum menandai Dilaporkan.'); return; }
    const now = new Date().toISOString();
    const updated = { ...record, status: target, updated_at: now };
    dispatch({ type: 'UPDATE_TAX_RECORD', payload: updated });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: {
      id: generateId('LOG', state.auditLog), timestamp: now,
      user: 'Pengguna lokal (belum terautentikasi)', aksi: 'TRANSISI_STATUS',
      tabel: 'Pajak', record_id: record.id, nilai_lama: record.status, nilai_baru: target,
      alasan: 'Perubahan status register pajak; identitas belum diverifikasi server',
      sumber_bukti: target === 'Dibayar' ? record.bukti_pembayaran : target === 'Dilaporkan' ? record.nomor_pelaporan : record.sumber_aturan
    } });
    setMessage(`Status register ${record.id}: ${statusLabel[record.status]} → ${statusLabel[target]}. Ini catatan operasional, bukan validasi resmi DJP.`);
  };

  const total = rows.reduce((sum, item) => sum + item.nilai_pajak, 0);
  const openTotal = rows.filter(item => !['Dibayar', 'Dilaporkan'].includes(item.status)).reduce((sum, item) => sum + item.nilai_pajak, 0);

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Calculator className="text-violet-700" />Register Pajak</h1><p className="mt-1 text-sm text-gray-500">Daftar kewajiban, sumber aturan, jatuh tempo, bukti bayar dan referensi pelaporan.</p></div>
      <button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"><Plus size={17} />Tambah kewajiban</button>
    </header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Tidak menggunakan tarif pajak asumsi</p><p className="mt-1">Aplikasi tidak menentukan tarif atau kelayakan insentif secara otomatis. Isi sumber aturan, tarif yang telah diverifikasi, dasar pengenaan, dan bukti. Register ini belum mengirim e-Faktur/e-Bupot, SPT atau data ke Coretax DJP.</p></div>
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Register terfilter</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Nilai pajak dalam daftar</p><p className="mt-1 text-xl font-bold">{formatRupiah(total)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Belum dibayar/dilaporkan</p><p className="mt-1 text-xl font-bold text-amber-700">{formatRupiah(openTotal)}</p></div></div>

    {showForm && <section className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId ? 'Edit kewajiban pajak' : 'Kewajiban pajak baru'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup form" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Jenis pajak<select value={draft.jenis_pajak} onChange={e => setField('jenis_pajak', e.target.value as TaxType)} className="mt-1 w-full rounded-lg border px-3 py-2">{types.map(item => <option key={item} value={item}>{typeLabel[item]}</option>)}</select></label>
        <label className="text-sm font-medium">Proyek/PT *<input value={draft.proyek} onChange={e => setField('proyek', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Unit (opsional)<input value={draft.unit} onChange={e => setField('unit', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Blok/unit" /></label>
        <label className="text-sm font-medium">Periode (YYYY-MM) *<input type="month" value={draft.periode} onChange={e => setField('periode', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Jatuh tempo *<input type="date" value={draft.jatuh_tempo} onChange={e => setField('jatuh_tempo', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Referensi transaksi<input value={draft.referensi_transaksi} onChange={e => setField('referensi_transaksi', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Invoice / jual beli / gaji / transaksi" /></label>
        <label className="text-sm font-medium">Dasar pengenaan (Rp) *<input type="number" min="0" value={draft.dasar_pengenaan} onChange={e => setField('dasar_pengenaan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Tarif % (opsional, input manual)<input type="number" min="0" step="any" value={draft.tarif_persen} onChange={e => setField('tarif_persen', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Kosongkan jika nominal manual" /></label>
        <label className="text-sm font-medium">Nilai pajak (Rp) *<input type="number" min="0" value={draft.nilai_pajak} onChange={e => setField('nilai_pajak', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium md:col-span-2">Sumber aturan / dasar perhitungan *<input value={draft.sumber_aturan} onChange={e => setField('sumber_aturan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Peraturan/ketentuan dan tanggal efektif yang sudah diverifikasi" /></label>
        <label className="text-sm font-medium">Nama pemeriksa/penyetuju<input value={draft.disetujui_oleh} onChange={e => setField('disetujui_oleh', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium md:col-span-3">Catatan<textarea value={draft.catatan} onChange={e => setField('catatan', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} /></label>
      </div>
      <div className="mt-3 text-xs text-gray-500">Jika tarif diisi, nilai pajak dihitung sebagai dasar pengenaan × tarif input. Jika tarif dikosongkan, nilai pajak diisi manual. Tarif input bukan tarif resmi yang ditentukan aplikasi.</div>
      <div className="mt-5 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-white hover:bg-violet-800"><Save size={16} />Simpan draft</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}

    <div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari proyek, periode, jenis, referensi…" className="flex-1 rounded-lg border bg-white px-3 py-2" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-lg border bg-white px-3 py-2"><option value="Semua">Semua status</option>{statuses.map(item => <option key={item} value={item}>{statusLabel[item]}</option>)}</select></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Register pajak ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1450px] text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">Jenis/periode</th><th className="p-3">Proyek/unit</th><th className="p-3 text-right">Dasar pengenaan</th><th className="p-3 text-right">Tarif input</th><th className="p-3 text-right">Nilai pajak</th><th className="p-3">Jatuh tempo/status</th><th className="p-3">Sumber aturan</th><th className="p-3">Referensi bayar</th><th className="p-3">Pelaporan</th><th className="p-3">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(row => { const refs = referenceDrafts[row.id] || { payment: row.bukti_pembayaran, filing: row.nomor_pelaporan }; const next = nextStatus[row.status]; return <tr key={row.id} className="align-top hover:bg-gray-50"><td className="p-3"><strong>{typeLabel[row.jenis_pajak]}</strong><div>{row.periode}</div><div className="text-xs text-gray-500">{row.id}</div></td><td className="p-3">{row.proyek}<div className="text-xs text-gray-500">{row.unit || 'Semua unit'}</div></td><td className="p-3 text-right">{formatRupiah(row.dasar_pengenaan)}</td><td className="p-3 text-right">{row.tarif_persen === null ? 'Manual' : `${row.tarif_persen}%`}</td><td className="p-3 text-right font-semibold">{formatRupiah(row.nilai_pajak)}</td><td className="p-3 whitespace-nowrap">{row.jatuh_tempo}<div className="mt-1 text-xs font-medium">{statusLabel[row.status]}</div></td><td className="p-3 max-w-[220px] whitespace-normal">{row.sumber_aturan}</td><td className="p-3"><input value={refs.payment} onChange={e => setReferenceDrafts(current => ({ ...current, [row.id]: { ...refs, payment: e.target.value } }))} className="w-48 rounded border px-2 py-1 text-xs" placeholder="No. bukti/URL bayar" /></td><td className="p-3"><input value={refs.filing} onChange={e => setReferenceDrafts(current => ({ ...current, [row.id]: { ...refs, filing: e.target.value } }))} className="w-48 rounded border px-2 py-1 text-xs" placeholder="No. SPT / pelaporan" /></td><td className="p-3"><div className="flex min-w-[150px] flex-col gap-2"><button onClick={() => saveReferences(row)} className="inline-flex items-center justify-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Save size={12} />Simpan referensi</button>{next && <button onClick={() => advance({ ...row, ...refs })} className="inline-flex items-center justify-center gap-1 rounded bg-violet-700 px-2 py-1 text-xs text-white hover:bg-violet-800"><ArrowRightCircle size={12} />{statusLabel[next]}</button>}{['Draft', 'Perlu_Verifikasi'].includes(row.status) && <button onClick={() => startEdit(row)} className="inline-flex items-center justify-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={12} />Edit</button>}</div></td></tr>; })}{rows.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-gray-500">Belum ada register pajak. Tidak ada tarif/data pajak yang dibuat otomatis.</td></tr>}</tbody></table></div></section>
    <p className="text-xs text-gray-500"><FileCheck2 className="mr-1 inline" size={14} />Setiap perubahan status dicatat pada audit log lokal. Pengguna/penyetuju belum diverifikasi server, dan sistem belum mengajukan laporan ke otoritas pajak.</p>
  </div>;
}
