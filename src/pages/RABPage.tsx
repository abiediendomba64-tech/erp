import { useMemo, useState } from 'react';
import { useAccounting } from '../store/accounting';
import { formatRupiah, getLocalDateISO, generateId } from '../data/accounting';
import type { RAB, RABItem } from '../types/accounting';
import { calculateRABItem, calculateRABTotal } from '../utils/operationalFormulas';
import { ClipboardList, Plus, Trash2, Save, Pencil, Download, AlertTriangle, X } from 'lucide-react';

type RABDraft = {
  nama_proyek: string;
  tanggal: string;
  status: RAB['status'];
  items: RABItem[];
};

const emptyItem = (): RABItem => ({
  kategori: 'Material',
  deskripsi: '',
  volume: 1,
  satuan: 'unit',
  harga_satuan: 0,
  jumlah: 0,
});

const emptyDraft = (): RABDraft => ({
  nama_proyek: '',
  tanggal: getLocalDateISO(),
  status: 'Draft',
  items: [emptyItem()],
});

function calculateItem(item: RABItem): RABItem {
  const volume = Number.isFinite(Number(item.volume)) ? Math.max(0, Number(item.volume)) : 0;
  const rate = Number.isFinite(Number(item.harga_satuan)) ? Math.max(0, Number(item.harga_satuan)) : 0;
  return { ...item, volume, harga_satuan: rate, jumlah: calculateRABItem({ volume, harga_satuan: rate }) };
}

function calculateTotal(items: RABItem[]): number {
  return calculateRABTotal(items.map(item => ({ volume: item.volume, harga_satuan: item.harga_satuan })));
}

export default function RABPage() {
  const { state, dispatch } = useAccounting();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RABDraft>(emptyDraft());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | RAB['status']>('Semua');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(() => state.rab.map(record => ({
    record,
    computedItems: record.items.map(calculateItem),
    computedTotal: calculateTotal(record.items),
  })).filter(row =>
    (row.record.nama_proyek + ' ' + row.record.id).toLowerCase().includes(search.trim().toLowerCase()) &&
    (statusFilter === 'Semua' || row.record.status === statusFilter)
  ).sort((a, b) => b.record.tanggal.localeCompare(a.record.tanggal)), [state.rab, search, statusFilter]);

  const totalRAB = rows.reduce((sum, row) => sum + row.computedTotal, 0);
  const approvedTotal = rows.filter(row => row.record.status === 'Approved' || row.record.status === 'In Progress')
    .reduce((sum, row) => sum + row.computedTotal, 0);

  const updateDraft = <K extends keyof RABDraft>(key: K, value: RABDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const updateItem = <K extends keyof RABItem>(index: number, key: K, value: RABItem[K]) => {
    setDraft(current => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index
        ? calculateItem({ ...item, [key]: value })
        : item)
    }));
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const startEdit = (record: RAB) => {
    setEditingId(record.id);
    setDraft({
      nama_proyek: record.nama_proyek,
      tanggal: record.tanggal,
      status: record.status,
      items: record.items.length ? record.items.map(calculateItem) : [emptyItem()],
    });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const save = () => {
    setError('');
    if (!draft.nama_proyek.trim()) {
      setError('Nama proyek wajib diisi.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.tanggal)) {
      setError('Tanggal RAB harus valid.');
      return;
    }
    if (draft.items.length === 0) {
      setError('RAB harus memiliki minimal satu item biaya.');
      return;
    }
    for (let index = 0; index < draft.items.length; index++) {
      const item = draft.items[index];
      if (!item.deskripsi.trim()) {
        setError('Deskripsi item baris ' + (index + 1) + ' wajib diisi.');
        return;
      }
      if (!item.satuan.trim()) {
        setError('Satuan item baris ' + (index + 1) + ' wajib diisi.');
        return;
      }
      if (!Number.isFinite(Number(item.volume)) || item.volume <= 0) {
        setError('Volume item baris ' + (index + 1) + ' harus lebih besar dari nol.');
        return;
      }
      if (!Number.isFinite(Number(item.harga_satuan)) || item.harga_satuan < 0) {
        setError('Harga satuan item baris ' + (index + 1) + ' tidak valid.');
        return;
      }
    }

    const items = draft.items.map(item => calculateItem({ ...item, deskripsi: item.deskripsi.trim(), satuan: item.satuan.trim() }));
    const duplicate = state.rab.find(record =>
      record.id !== editingId &&
      record.nama_proyek.trim().toLowerCase() === draft.nama_proyek.trim().toLowerCase() &&
      record.tanggal === draft.tanggal &&
      record.status !== 'Completed'
    );
    if (duplicate && !editingId) {
      setError('RAB proyek dan tanggal tersebut sudah ada. Edit RAB yang ada atau pilih tanggal/versi berbeda.');
      return;
    }
    const record: RAB = {
      id: editingId || generateId('RAB', state.rab),
      nama_proyek: draft.nama_proyek.trim(),
      tanggal: draft.tanggal,
      items,
      total_biaya: calculateTotal(items),
      status: draft.status,
    };
    if (editingId) dispatch({ type: 'UPDATE_RAB', payload: record });
    else dispatch({ type: 'ADD_RAB', payload: record });
    setShowForm(false);
    setEditingId(null);
    setMessage('RAB tersimpan. Volume × harga satuan dan total dihitung ulang dari item. RAB tidak menciptakan pengeluaran kas/jurnal.');
  };

  const exportCsv = () => {
    const output: (string | number)[][] = [
      ['RAB / BILL OF QUANTITIES'],
      ['Catatan', 'Ini adalah rencana biaya, bukan realisasi kas atau bukti pembayaran.'],
      [],
      ['ID RAB', 'Proyek', 'Tanggal', 'Status', 'Kategori', 'Item', 'Volume', 'Satuan', 'Harga satuan', 'Jumlah hasil formula'],
      ...rows.flatMap(({ record, computedItems }) => computedItems.map(item => [
        record.id, record.nama_proyek, record.tanggal, record.status,
        item.kategori, item.deskripsi, item.volume, item.satuan, item.harga_satuan, item.jumlah
      ]))
    ];
    const escape = (value: string | number) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + output.map(row => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rab-boq-proyek.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ClipboardList size={24} className="text-cyan-700" />RAB / Bill of Quantities Proyek</h1><p className="mt-1 text-gray-500">Setiap nilai baris dihitung dari volume × harga satuan. Rencana anggaran dipisah dari pengeluaran aktual Buku Kas.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"><Download size={16} />Ekspor CSV</button><button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-800"><Plus size={17} />Buat RAB</button></div>
      </header>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Pemisahan RAB dan realisasi</p><p className="mt-1">RAB berisi perencanaan/penawaran; angka ini tidak mengurangi kas, tidak membuat jurnal, dan tidak membuktikan volume/biaya aktual. Realisasi harus dicatat di Buku Kas dan dilampiri dokumen terkait. Setelah kontrak disetujui, revisi RAB sebaiknya disimpan sebagai versi baru atau diberi status yang sesuai.</p></div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">RAB tersimpan</p><p className="mt-2 text-2xl font-bold">{state.rab.length}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Total RAB terfilter</p><p className="mt-2 text-xl font-bold">{formatRupiah(totalRAB)}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Approved / in progress</p><p className="mt-2 text-xl font-bold text-cyan-800">{formatRupiah(approvedTotal)}</p></div>
      </section>

      {showForm && <section className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit RAB' : 'RAB Baru'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup form" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700 md:col-span-2">Nama proyek / tahap pekerjaan *
            <input value={draft.nama_proyek} onChange={e => updateDraft('nama_proyek', e.target.value)} placeholder="Misal: Site A — Cut & Fill Blok A" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Tanggal RAB *
            <input type="date" value={draft.tanggal} onChange={e => updateDraft('tanggal', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Status
            <select value={draft.status} onChange={e => updateDraft('status', e.target.value as RAB['status'])} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="Draft">Draft</option><option value="Approved">Approved</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2"><h3 className="font-semibold">Rincian biaya</h3><button onClick={() => updateDraft('items', [...draft.items, emptyItem()])} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"><Plus size={15} />Tambah item</button></div>
        <div className="mt-3 space-y-3">
          {draft.items.map((item, index) => {
            const calc = calculateItem(item);
            return <div key={index} className="rounded-lg border p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <label className="text-xs font-medium text-gray-600">Kategori
                  <select value={item.kategori} onChange={e => updateItem(index, 'kategori', e.target.value as RABItem['kategori'])} className="mt-1 w-full rounded border px-2 py-2 text-sm"><option value="Material">Material</option><option value="Upah">Upah</option><option value="Alat">Alat</option><option value="Lainnya">Lainnya</option></select>
                </label>
                <label className="text-xs font-medium text-gray-600 xl:col-span-2">Deskripsi *
                  <input value={item.deskripsi} onChange={e => updateItem(index, 'deskripsi', e.target.value)} placeholder="Jenis material/pekerjaan" className="mt-1 w-full rounded border px-2 py-2 text-sm" />
                </label>
                <label className="text-xs font-medium text-gray-600">Volume *
                  <input type="number" min="0" step="any" value={item.volume} onChange={e => updateItem(index, 'volume', Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2 text-sm" />
                </label>
                <label className="text-xs font-medium text-gray-600">Satuan *
                  <input value={item.satuan} onChange={e => updateItem(index, 'satuan', e.target.value)} placeholder="m3, zak, hari" className="mt-1 w-full rounded border px-2 py-2 text-sm" />
                </label>
                <label className="text-xs font-medium text-gray-600">Harga satuan (Rp) *
                  <input type="number" min="0" step="any" value={item.harga_satuan} onChange={e => updateItem(index, 'harga_satuan', Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2 text-sm" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm">Rumus: {calc.volume.toLocaleString('id-ID')} × {formatRupiah(calc.harga_satuan)} = <strong>{formatRupiah(calc.jumlah)}</strong></p><button disabled={draft.items.length <= 1} onClick={() => updateDraft('items', draft.items.filter((_, i) => i !== index))} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"><Trash2 size={13} />Hapus baris</button></div>
            </div>;
          })}
        </div>
        <div className="mt-4 rounded-lg bg-cyan-50 p-4"><p className="text-sm text-cyan-900">Total RAB dihitung ulang otomatis dari seluruh item</p><p className="mt-1 text-2xl font-bold text-cyan-900">{formatRupiah(calculateTotal(draft.items))}</p></div>
        <div className="mt-4 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-white hover:bg-cyan-800"><Save size={17} />Simpan RAB</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Batal</button></div>
      </section>}

      <div className="flex flex-col gap-3 sm:flex-row"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama proyek atau ID RAB…" className="flex-1 rounded-lg border bg-white px-3 py-2" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-lg border bg-white px-3 py-2"><option value="Semua">Semua status</option><option value="Draft">Draft</option><option value="Approved">Approved</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">RAB tersimpan ({rows.length})</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-3 py-3 text-left">Proyek / tanggal</th><th className="px-3 py-3 text-left">Status</th><th className="px-3 py-3 text-right">Material</th><th className="px-3 py-3 text-right">Upah</th><th className="px-3 py-3 text-right">Alat</th><th className="px-3 py-3 text-right">Lainnya</th><th className="px-3 py-3 text-right">Total hasil formula</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
          <tbody className="divide-y">{rows.map(({ record, computedItems, computedTotal }) => {
            const subtotalFor = (category: RABItem['kategori']) => computedItems.filter(item => item.kategori === category).reduce((sum, item) => sum + item.jumlah, 0);
            return <tr key={record.id} className="hover:bg-gray-50"><td className="px-3 py-3"><p className="font-semibold">{record.nama_proyek}</p><p className="text-xs text-gray-500">{record.id} · {record.tanggal} · {computedItems.length} item</p></td><td className="px-3 py-3">{record.status}</td><td className="px-3 py-3 text-right">{formatRupiah(subtotalFor('Material'))}</td><td className="px-3 py-3 text-right">{formatRupiah(subtotalFor('Upah'))}</td><td className="px-3 py-3 text-right">{formatRupiah(subtotalFor('Alat'))}</td><td className="px-3 py-3 text-right">{formatRupiah(subtotalFor('Lainnya'))}</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(computedTotal)}</td><td className="px-3 py-3 text-right"><button onClick={() => startEdit(record)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button></td></tr>;
          })}{rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Belum ada RAB yang cocok. Buat RAB dengan input biaya yang telah disusun atau disetujui.</td></tr>}</tbody>
        </table></div>
      </section>
    </div>
  );
}
