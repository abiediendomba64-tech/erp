import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, generateId } from '../data';
import type { StokBarang } from '../types';
import { Package, Plus, Pencil, Save, X, Download, AlertTriangle } from 'lucide-react';

type StockForm = Omit<StokBarang, 'id'>;
const emptyForm = (): StockForm => ({
  kode: '', nama: '', kategori: 'Bahan_Baku', satuan: 'unit',
  stok_awal: 0, masuk: 0, keluar: 0, harga_pokok: 0, harga_jual: 0,
  min_stok: 0, lokasi: ''
});
const endingStock = (item: Pick<StokBarang, 'stok_awal' | 'masuk' | 'keluar'>) =>
  Number(item.stok_awal || 0) + Number(item.masuk || 0) - Number(item.keluar || 0);

export default function StokPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StockForm>(emptyForm());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(() => state.stok.map(item => {
    const balance = endingStock(item);
    return { item, balance, value: balance * item.harga_pokok };
  }).filter(row => (row.item.kode + ' ' + row.item.nama + ' ' + row.item.lokasi).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.item.nama.localeCompare(b.item.nama)), [state.stok, search]);

  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const lowStock = rows.filter(row => row.balance <= row.item.min_stok).length;
  const negativeStock = rows.filter(row => row.balance < 0).length;

  const setField = <K extends keyof StockForm>(key: K, value: StockForm[K]) =>
    setForm(old => ({ ...old, [key]: value }));

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setMessage('');
    setShowForm(true);
  };
  const startEdit = (item: StokBarang) => {
    const { id, ...rest } = item;
    setEditingId(id);
    setForm({ ...rest });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const save = () => {
    setError('');
    if (!form.kode.trim() || !form.nama.trim() || !form.satuan.trim()) {
      setError('Kode barang, nama, dan satuan wajib diisi.');
      return;
    }
    const numbers = [form.stok_awal, form.masuk, form.keluar, form.harga_pokok, form.harga_jual, form.min_stok];
    if (numbers.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) {
      setError('Semua kuantitas, stok minimum dan harga harus berupa angka nol atau lebih.');
      return;
    }
    if (endingStock(form) < 0) {
      setError('Stok akhir tidak boleh negatif. Periksa stok awal, masuk, dan keluar.');
      return;
    }
    const duplicate = state.stok.find(item =>
      item.id !== editingId && item.kode.trim().toLowerCase() === form.kode.trim().toLowerCase()
    );
    if (duplicate) {
      setError('Kode barang sudah digunakan.');
      return;
    }
    const record: StokBarang = {
      ...form,
      id: editingId || generateId('STK', state.stok),
      kode: form.kode.trim(),
      nama: form.nama.trim(),
      satuan: form.satuan.trim(),
      lokasi: form.lokasi.trim(),
    };
    if (editingId) dispatch({ type: 'UPDATE_STOK', payload: record });
    else dispatch({ type: 'ADD_STOK', payload: record });
    setShowForm(false);
    setEditingId(null);
    setMessage('Data stok tersimpan dan stok akhir/nilai inventori dihitung ulang. Kolom masuk/keluar adalah agregat, belum merupakan buku pergerakan per dokumen.');
  };

  const exportCsv = () => {
    const output: (string | number)[][] = [
      ['REGISTER STOK — NILAI BERDASARKAN INPUT'],
      ['Catatan', 'Stok akhir = stok awal + masuk - keluar; nilai inventori = stok akhir × harga pokok. Bukan bukti fisik hasil stock opname.'],
      [],
      ['Kode', 'Nama', 'Kategori', 'Satuan', 'Stok awal', 'Masuk', 'Keluar', 'Stok akhir formula', 'Harga pokok', 'Nilai inventori formula', 'Harga jual', 'Stok minimum', 'Lokasi'],
      ...rows.map(({ item, balance, value }) => [item.kode,item.nama,item.kategori,item.satuan,item.stok_awal,item.masuk,item.keluar,balance,item.harga_pokok,value,item.harga_jual,item.min_stok,item.lokasi])
    ];
    const escape = (value: string | number) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + output.map(row => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'register-stok.csv'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Package size={24} className="text-blue-600" />Stok Barang</h1><p className="mt-1 text-gray-500">CRUD master stok dan rumus stok akhir. Barang contoh lama dimigrasikan; catatan baru harus berasal dari input pengguna.</p></div>
      <div className="flex gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><Download size={16}/>Ekspor CSV</button><button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"><Plus size={18}/>Tambah Barang</button></div>
    </header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Batas akurasi stok</p><p className="mt-1">Stok akhir dihitung dari agregat input, belum mengurangi/menambah otomatis dari transaksi pembelian, produksi, atau penjualan. Rekonsiliasi fisik dan log mutasi per dokumen masih merupakan pekerjaan terpisah.</p></div>
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Jumlah SKU</p><p className="mt-1 text-xl font-bold">{state.stok.length}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Nilai inventori formula</p><p className="mt-1 text-xl font-bold">{formatRupiah(totalValue)}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Stok minimum / menipis</p><p className="mt-1 text-xl font-bold text-amber-700">{lowStock}</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Stok negatif</p><p className="mt-1 text-xl font-bold text-red-700">{negativeStock}</p></div>
    </section>
    {showForm && <section className="rounded-xl border border-blue-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId ? 'Edit Barang' : 'Tambah Barang'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm">Kode SKU *<input value={form.kode} onChange={e=>setField('kode',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Nama barang *<input value={form.nama} onChange={e=>setField('nama',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Kategori<select value={form.kategori} onChange={e=>setField('kategori',e.target.value as StokBarang['kategori'])} className="mt-1 w-full rounded border px-3 py-2"><option value="Bahan_Baku">Bahan baku</option><option value="Barang_Jadi">Barang jadi</option><option value="Barang_Dagang">Barang dagang</option><option value="Perlengkapan">Perlengkapan</option></select></label>
        <label className="text-sm">Satuan *<input value={form.satuan} onChange={e=>setField('satuan',e.target.value)} placeholder="zak, m3, unit" className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Stok awal<input type="number" min="0" step="any" value={form.stok_awal} onChange={e=>setField('stok_awal',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Akumulasi masuk<input type="number" min="0" step="any" value={form.masuk} onChange={e=>setField('masuk',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Akumulasi keluar<input type="number" min="0" step="any" value={form.keluar} onChange={e=>setField('keluar',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Harga pokok per satuan (Rp)<input type="number" min="0" step="any" value={form.harga_pokok} onChange={e=>setField('harga_pokok',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Harga jual per satuan (Rp)<input type="number" min="0" step="any" value={form.harga_jual} onChange={e=>setField('harga_jual',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Minimum stok<input type="number" min="0" step="any" value={form.min_stok} onChange={e=>setField('min_stok',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Lokasi/gudang<input value={form.lokasi} onChange={e=>setField('lokasi',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label>
      </div>
      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm">Stok akhir terhitung: <strong>{endingStock(form)} {form.satuan}</strong> · Nilai inventori terhitung: <strong>{formatRupiah(endingStock(form)*form.harga_pokok)}</strong></div>
      <div className="mt-4 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"><Save size={16}/>Simpan</button><button onClick={()=>setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}
    <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode, nama atau gudang…" className="w-full rounded-lg border bg-white px-3 py-2"/></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Register Stok ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">Barang</th><th className="px-3 py-3 text-right">Awal</th><th className="px-3 py-3 text-right">Masuk</th><th className="px-3 py-3 text-right">Keluar</th><th className="px-3 py-3 text-right">Akhir formula</th><th className="px-3 py-3 text-right">Harga pokok</th><th className="px-3 py-3 text-right">Nilai inventori</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(({item,balance,value})=><tr key={item.id}><td className="px-3 py-3"><p className="font-medium">{item.nama}</p><p className="text-xs text-gray-500">{item.kode} · {item.kategori.replace(/_/g,' ')} · {item.lokasi}</p></td><td className="px-3 py-3 text-right">{item.stok_awal}</td><td className="px-3 py-3 text-right text-emerald-700">{item.masuk}</td><td className="px-3 py-3 text-right text-red-700">{item.keluar}</td><td className="px-3 py-3 text-right font-bold">{balance} {item.satuan}{balance<=item.min_stok && <p className="text-xs text-amber-700">Stok minimum</p>}</td><td className="px-3 py-3 text-right">{formatRupiah(item.harga_pokok)}</td><td className="px-3 py-3 text-right font-semibold">{formatRupiah(value)}</td><td className="px-3 py-3 text-right"><button onClick={()=>startEdit(item)} className="rounded border px-2 py-1 text-xs"><Pencil size={13} className="inline"/> Edit</button></td></tr>)}{rows.length===0&&<tr><td colSpan={8} className="p-8 text-center text-gray-500">Belum ada item stok. Tambahkan barang berdasarkan hasil inventarisasi aktual.</td></tr>}</tbody></table></div></section>
  </div>;
}
