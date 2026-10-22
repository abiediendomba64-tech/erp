import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, generateId, getLocalDateISO } from '../data';
import type { Produksi, StokBarang } from '../types';
import { calculateLineTotal, calculateProductionCosts } from '../utils/operationalFormulas';
import { Factory, Plus, Pencil, Save, X, AlertTriangle, Download, Trash2 } from 'lucide-react';

type ProductionForm = Omit<Produksi, 'id'>;
const emptyForm = (): ProductionForm => ({
  no_produksi: '', tanggal: getLocalDateISO(), produk: '', jumlah: 1, bahan_baku: [],
  biaya_tenaga_kerja: 0, biaya_overhead: 0, status: 'Draft', catatan: ''
});
const stockBalance = (stock: StokBarang) => stock.stok_awal + stock.masuk - stock.keluar;

function materialTotal(record: Pick<Produksi, 'bahan_baku'>, stocks: StokBarang[]): number {
  return record.bahan_baku.reduce((sum, material) => {
    const stock = stocks.find(item => item.id === material.barang_id);
    return sum + (stock ? calculateLineTotal(material.jumlah, stock.harga_pokok) : 0);
  }, 0);
}

function totalCost(record: Produksi, stocks: StokBarang[]): number {
  return calculateProductionCosts(record.bahan_baku.map(material => ({jumlah: material.jumlah, harga_pokok: stocks.find(stock => stock.id === material.barang_id)?.harga_pokok || 0})), record.biaya_tenaga_kerja, record.biaya_overhead, record.jumlah).total;
}

export default function ProduksiPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductionForm>(emptyForm());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(() => state.produksi.map(record => ({
    record,
    material: materialTotal(record, state.stok),
    total: totalCost(record, state.stok),
    unitCost: calculateProductionCosts(record.bahan_baku.map(material => ({jumlah: material.jumlah, harga_pokok: state.stok.find(stock => stock.id === material.barang_id)?.harga_pokok || 0})), record.biaya_tenaga_kerja, record.biaya_overhead, record.jumlah).unitCost,
  })).filter(row => (row.record.no_produksi+' '+row.record.produk+' '+row.record.catatan).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>b.record.tanggal.localeCompare(a.record.tanggal)),[state.produksi,state.stok,search]);

  const setField = <K extends keyof ProductionForm>(key: K, value: ProductionForm[K]) => setForm(current=>({...current,[key]:value}));
  const startNew = () => {setEditingId(null);setForm(emptyForm());setError('');setMessage('');setShowForm(true);};
  const startEdit = (record: Produksi) => {
    const {id,...rest}=record;
    setEditingId(id);
    setForm({...rest,bahan_baku:record.bahan_baku.map(item=>({...item}))});
    setError('');setMessage('');setShowForm(true);
  };
  const setMaterial = (index:number,key:'barang_id'|'jumlah',value:string|number) => setForm(current=>({
    ...current,
    bahan_baku:current.bahan_baku.map((item,i)=>i===index?{...item,[key]:value}:item)
  }));
  const addMaterial = () => {
    const available=state.stok.find(stock=>!form.bahan_baku.some(item=>item.barang_id===stock.id));
    if(!available){setError('Tidak ada barang lain yang dapat ditambahkan. Tambah dulu data stok yang sebenarnya.');return;}
    setForm(current=>({...current,bahan_baku:[...current.bahan_baku,{barang_id:available.id,jumlah:1}]}));
    setError('');
  };

  const save = () => {
    setError('');
    if(!form.no_produksi.trim()||!form.tanggal||!form.produk.trim()){setError('Nomor produksi, tanggal, dan nama produk wajib diisi.');return;}
    if(!Number.isFinite(form.jumlah)||form.jumlah<=0){setError('Jumlah hasil produksi harus lebih dari nol.');return;}
    if([form.biaya_tenaga_kerja,form.biaya_overhead].some(value=>!Number.isFinite(value)||value<0)){setError('Biaya tenaga kerja dan overhead harus nol atau lebih.');return;}
    const duplicate=state.produksi.find(item=>item.id!==editingId&&item.no_produksi.trim().toLowerCase()===form.no_produksi.trim().toLowerCase());
    if(duplicate){setError('Nomor produksi sudah dipakai.');return;}
    for(const component of form.bahan_baku){
      const stock=state.stok.find(item=>item.id===component.barang_id);
      if(!stock){setError('Ada bahan baku yang tidak ditemukan di register stok.');return;}
      if(!Number.isFinite(component.jumlah)||component.jumlah<=0){setError('Pemakaian bahan baku harus lebih dari nol.');return;}
      if(component.jumlah>stockBalance(stock)){setError('Pemakaian '+stock.nama+' melebihi stok agregat yang tercatat. Pastikan angka stok/kuantitas benar.');return;}
    }
    const record:Produksi={...form,id:editingId||generateId('PRD',state.produksi),no_produksi:form.no_produksi.trim(),produk:form.produk.trim(),catatan:form.catatan.trim()};
    if(editingId)dispatch({type:'UPDATE_PRODUKSI',payload:record});else dispatch({type:'ADD_PRODUKSI',payload:record});
    setShowForm(false);setEditingId(null);
    setMessage('Catatan produksi tersimpan. Biaya material dihitung dari kuantitas × harga pokok; bahan baku tidak dipotong otomatis dari stok karena sistem mutasi stok per dokumen belum terhubung.');
  };

  const exportCsv=()=>{
    const data:(string|number)[][]=[['REGISTER PRODUKSI'],['Catatan','Biaya produksi = material (jumlah × HPP stok) + tenaga kerja + overhead. Produksi tidak otomatis memutasi stok/jurnal.'],[],['Nomor','Tanggal','Produk','Jumlah hasil','Material','Tenaga kerja','Overhead','Total formula','Biaya/unit formula','Status','Bahan baku']];
    rows.forEach(({record,material,total,unitCost})=>data.push([record.no_produksi,record.tanggal,record.produk,record.jumlah,material,record.biaya_tenaga_kerja,record.biaya_overhead,total,unitCost,record.status,record.bahan_baku.map(m=>{const st=state.stok.find(i=>i.id===m.barang_id);return (st?.nama||m.barang_id)+': '+m.jumlah;}).join(' | ')]));
    const esc=(v:string|number)=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const csv='\uFEFF'+data.map(row=>row.map(esc).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='register-produksi.csv';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  };

  const liveCalculation=calculateProductionCosts(form.bahan_baku.map(material => ({jumlah: material.jumlah, harga_pokok: state.stok.find(stock => stock.id === material.barang_id)?.harga_pokok || 0})), form.biaya_tenaga_kerja, form.biaya_overhead, form.jumlah);
  const liveMaterial=liveCalculation.material;
  const liveTotal=liveCalculation.total;
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Factory size={24} className="text-orange-600"/>Produksi / Pekerjaan</h1><p className="mt-1 text-gray-500">Input dan edit SPK/hasil kerja; biaya dihitung dari komponen aktual yang dimasukkan.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Download size={16}/>CSV</button><button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white"><Plus size={17}/>Tambah Produksi</button></div></header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Status produksi bukan otomatis mutasi inventori</p><p className="mt-1">Halaman ini menghitung estimasi biaya produksi dari bahan terpilih, tenaga kerja, dan overhead. Stok tidak dikurangi otomatis agar tidak ada double count; ledger mutasi bahan, pembebanan WIP, dan jurnal akuntansi masih perlu transaksi resmi yang terhubung.</p></div>
    {message&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {showForm&&<section className="rounded-xl border bg-white p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId?'Edit Produksi':'Tambah Catatan Produksi'}</h2><button onClick={()=>setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm">Nomor produksi/SPK *<input value={form.no_produksi} onChange={e=>setField('no_produksi',e.target.value)} placeholder="Nomor SPK aktual" className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Tanggal *<input type="date" value={form.tanggal} onChange={e=>setField('tanggal',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Produk/pekerjaan *<input value={form.produk} onChange={e=>setField('produk',e.target.value)} placeholder="Nama unit/pekerjaan" className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Jumlah hasil produksi *<input type="number" min="1" step="any" value={form.jumlah} onChange={e=>setField('jumlah',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Biaya tenaga kerja (Rp)<input type="number" min="0" step="any" value={form.biaya_tenaga_kerja} onChange={e=>setField('biaya_tenaga_kerja',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Overhead (Rp)<input type="number" min="0" step="any" value={form.biaya_overhead} onChange={e=>setField('biaya_overhead',Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>
        <label className="text-sm">Status<select value={form.status} onChange={e=>setField('status',e.target.value as Produksi['status'])} className="mt-1 w-full rounded border px-3 py-2"><option value="Draft">Draft</option><option value="Dalam_Proses">Dalam proses</option><option value="Selesai">Selesai</option><option value="Batal">Batal</option></select></label>
        <label className="text-sm md:col-span-2">Catatan / referensi bukti<input value={form.catatan} onChange={e=>setField('catatan',e.target.value)} placeholder="Nomor opname, lokasi, keterkaitan RAB" className="mt-1 w-full rounded border px-3 py-2"/></label>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2"><h3 className="font-semibold">Bahan baku</h3><button onClick={addMaterial} disabled={state.stok.length===0} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm disabled:opacity-40"><Plus size={14}/>Tambah bahan</button></div>
      <div className="mt-2 space-y-2">{form.bahan_baku.map((material,index)=>{const stock=state.stok.find(item=>item.id===material.barang_id);return <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_150px_150px_auto]"><label className="text-xs">Barang<select value={material.barang_id} onChange={e=>setMaterial(index,'barang_id',e.target.value)} className="mt-1 w-full rounded border px-2 py-2 text-sm">{state.stok.map(item=><option key={item.id} value={item.id}>{item.nama} ({item.satuan})</option>)}</select><span className="text-gray-500">Stok tercatat: {stock?stockBalance(stock):0}</span></label><label className="text-xs">Jumlah digunakan<input type="number" min="0" step="any" value={material.jumlah} onChange={e=>setMaterial(index,'jumlah',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2 text-sm"/></label><label className="text-xs">Biaya formula<input readOnly value={formatRupiah((stock?.harga_pokok||0)*material.jumlah)} className="mt-1 w-full rounded border bg-gray-50 px-2 py-2 text-sm"/></label><button onClick={()=>setField('bahan_baku',form.bahan_baku.filter((_,i)=>i!==index))} aria-label="Hapus bahan" className="self-center rounded border p-2 text-red-700"><Trash2 size={15}/></button></div>})}{form.bahan_baku.length===0&&<p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Belum ada bahan baku dipilih. Anda boleh menambahkan bahan dari register stok.</p>}</div>
      <div className="mt-4 rounded-lg bg-orange-50 p-4 text-sm"><p>Biaya bahan formula: <strong>{formatRupiah(liveMaterial)}</strong></p><p>Tenaga kerja: <strong>{formatRupiah(form.biaya_tenaga_kerja)}</strong> · Overhead: <strong>{formatRupiah(form.biaya_overhead)}</strong></p><p className="mt-1 text-lg">Total biaya: <strong>{formatRupiah(liveTotal)}</strong> · Biaya per unit: <strong>{formatRupiah(liveCalculation.unitCost)}</strong></p></div>
      <div className="mt-4 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white"><Save size={16}/>Simpan</button><button onClick={()=>setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}
    <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari SPK, produk atau catatan…" className="w-full rounded border bg-white px-3 py-2"/></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Catatan produksi ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">SPK / produk</th><th className="px-3 py-3 text-right">Hasil</th><th className="px-3 py-3 text-right">Material</th><th className="px-3 py-3 text-right">Tenaga kerja</th><th className="px-3 py-3 text-right">Overhead</th><th className="px-3 py-3 text-right">Total biaya</th><th className="px-3 py-3 text-right">Biaya/unit</th><th className="px-3 py-3 text-left">Status</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(({record,material,total,unitCost})=><tr key={record.id}><td className="px-3 py-3"><p className="font-medium">{record.no_produksi}</p><p className="text-xs text-gray-500">{record.tanggal} · {record.produk}</p></td><td className="px-3 py-3 text-right">{record.jumlah}</td><td className="px-3 py-3 text-right">{formatRupiah(material)}</td><td className="px-3 py-3 text-right">{formatRupiah(record.biaya_tenaga_kerja)}</td><td className="px-3 py-3 text-right">{formatRupiah(record.biaya_overhead)}</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(total)}</td><td className="px-3 py-3 text-right">{formatRupiah(unitCost)}</td><td className="px-3 py-3">{record.status.replace(/_/g,' ')}</td><td className="px-3 py-3 text-right"><button onClick={()=>startEdit(record)} className="rounded border px-2 py-1 text-xs"><Pencil size={13} className="inline"/> Edit</button></td></tr>)}{rows.length===0&&<tr><td colSpan={9} className="p-8 text-center text-gray-500">Belum ada catatan produksi aktual.</td></tr>}</tbody></table></div></section>
  </div>;
}
