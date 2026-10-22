import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, generateId, getLocalDateISO } from '../data';
import { getBukuKasVerificationStatus } from '../helpers';
import type { Pembelian, StokBarang } from '../types';
import { calculateLineTotal, calculateSalesSubtotal, calculatePurchaseTotal } from '../utils/operationalFormulas';
import { ShoppingBag, Plus, Pencil, Save, X, Download, AlertTriangle, Trash2 } from 'lucide-react';

type PurchaseItem = Pembelian['items'][number];
type PurchaseForm = {
  no_po: string; tanggal: string; supplier: string; items: PurchaseItem[];
  ppn: string; status_terima: Pembelian['status_terima']; jatuh_tempo: string;
};
const calcItem = (item: PurchaseItem): PurchaseItem => ({
  ...item,
  jumlah: Math.max(0, Number(item.jumlah)||0),
  harga: Math.max(0, Number(item.harga)||0),
  subtotal: calculateLineTotal(Math.max(0, Number(item.jumlah)||0), Math.max(0,Number(item.harga)||0))
});
const emptyItem=(stock?:StokBarang):PurchaseItem=>({barang_id:stock?.id||'',jumlah:1,harga:stock?.harga_pokok||0,subtotal:stock?.harga_pokok||0});
const emptyForm=(stocks:StokBarang[]):PurchaseForm=>({no_po:'PO-'+getLocalDateISO().replace(/-/g,'')+'-001',tanggal:getLocalDateISO(),supplier:'',items:[emptyItem(stocks[0])],ppn:'0',status_terima:'Belum',jatuh_tempo:''});

export default function PembelianPage(){
  const {state,dispatch}=useAppContext();
  const [showForm,setShowForm]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [form,setForm]=useState<PurchaseForm>(emptyForm(state.stok));
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const today=getLocalDateISO();

  const paidFromVerifiedCash=(purchase:Pembelian)=>state.bukuKas.filter(row=>
    row.keluar>0&&(row.no_ref.trim()===purchase.no_po||row.keterangan.includes(purchase.no_po))&&getBukuKasVerificationStatus(row,state.arsipBukti)==='LENGKAP'
  ).reduce((sum,row)=>sum+Math.max(0,Number(row.keluar)||0),0);
  const rows=useMemo(()=>state.pembelian.map(purchase=>{
    const items=purchase.items.map(calcItem);
    const subtotal=calculateSalesSubtotal(items);
    const total=calculatePurchaseTotal(items,purchase.ppn);
    const paid=paidFromVerifiedCash(purchase);
    const remaining=Math.max(0,total-paid);
    const status=paid>=total&&total>0?'Lunas':paid>0?'DP':purchase.jatuh_tempo&&purchase.jatuh_tempo<today?'Jatuh_Tempo':'Belum_Bayar';
    return {purchase,items,subtotal,total,paid,remaining,status};
  }).filter(row=>(row.purchase.no_po+' '+row.purchase.supplier).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>b.purchase.tanggal.localeCompare(a.purchase.tanggal)),[state.pembelian,state.bukuKas,state.arsipBukti,search,today]);

  const totalPO=rows.reduce((sum,row)=>sum+row.total,0);
  const paidVerified=rows.reduce((sum,row)=>sum+row.paid,0);
  const payable=rows.reduce((sum,row)=>sum+row.remaining,0);
  const setField=<K extends keyof PurchaseForm>(key:K,value:PurchaseForm[K])=>setForm(old=>({...old,[key]:value}));
  const setItem=(index:number,key:'barang_id'|'jumlah'|'harga',value:string|number)=>setForm(old=>({...old,items:old.items.map((item,i)=>{
    if(i!==index)return item;
    if(key==='barang_id'){const stock=state.stok.find(s=>s.id===String(value));return calcItem({...item,barang_id:String(value),harga:stock?.harga_pokok||0});}
    return calcItem({...item,[key]:value});
  })}));
  const startNew=()=>{setEditingId(null);setForm(emptyForm(state.stok));setError('');setMessage('');setShowForm(true);};
  const startEdit=(purchase:Pembelian)=>{
    setEditingId(purchase.id);setForm({no_po:purchase.no_po,tanggal:purchase.tanggal,supplier:purchase.supplier,items:purchase.items.map(calcItem),ppn:String(purchase.ppn),status_terima:purchase.status_terima,jatuh_tempo:purchase.jatuh_tempo});
    setError('');setMessage('');setShowForm(true);
  };
  const save=()=>{
    setError('');
    if(!form.no_po.trim()||!form.tanggal||!form.supplier.trim()){setError('Nomor PO, tanggal, dan supplier wajib diisi.');return;}
    if(form.status_terima!=='Belum'&&form.status_terima!=='Lengkap'){setError('Status penerimaan tidak valid.');return;}
    if(!form.items.length){setError('PO harus memiliki minimal satu item.');return;}
    for(const [idx,item] of form.items.entries()){
      if(!item.barang_id||!state.stok.some(stock=>stock.id===item.barang_id)){setError('Pilih barang yang valid pada item '+(idx+1)+'.');return;}
      if(!Number.isFinite(item.jumlah)||item.jumlah<=0||!Number.isFinite(item.harga)||item.harga<0){setError('Kuantitas harus positif dan harga tidak boleh negatif.');return;}
    }
    const ppn=Number(form.ppn);
    if(!Number.isFinite(ppn)||ppn<0){setError('PPN tidak valid.');return;}
    const duplicate=state.pembelian.find(item=>item.id!==editingId&&item.no_po.trim().toLowerCase()===form.no_po.trim().toLowerCase());
    if(duplicate){setError('Nomor PO sudah digunakan.');return;}
    const items=form.items.map(calcItem);
    const record:Pembelian={id:editingId||generateId('PB',state.pembelian),no_po:form.no_po.trim(),tanggal:form.tanggal,supplier:form.supplier.trim(),items,ppn,status_bayar:'Belum_Bayar',status_terima:form.status_terima,jatuh_tempo:form.jatuh_tempo};
    if(editingId)dispatch({type:'UPDATE_PEMBELIAN',payload:record});else dispatch({type:'ADD_PEMBELIAN',payload:record});
    setShowForm(false);setEditingId(null);
    setMessage('PO tersimpan dan subtotal/total dihitung dari item. PO adalah komitmen pembelian; belum otomatis menambah utang akuntansi, stok, kas keluar, atau jurnal sebelum penerimaan/tagihan/pembayaran dicatat dan didukung bukti.');
  };

  const exportCsv=()=>{
    const out:(string|number)[][]=[['REGISTER PURCHASE ORDER'],['Catatan','PO adalah komitmen; pembayaran dihitung dari pengeluaran Buku Kas yang mempunyai bukti terverifikasi.'],[],['Nomor PO','Tanggal','Supplier','Subtotal formula','PPN','Total formula','Pembayaran terverifikasi','Sisa terhitung','Status pembayaran turunan','Status penerimaan'],...rows.map(({purchase,subtotal,total,paid,remaining,status})=>[purchase.no_po,purchase.tanggal,purchase.supplier,subtotal,purchase.ppn,total,paid,remaining,status,purchase.status_terima]),[],['DETAIL ITEM'],['Nomor PO','Barang','Qty','Harga satuan','Subtotal formula'],...rows.flatMap(({purchase,items})=>items.map(item=>[purchase.no_po,state.stok.find(stock=>stock.id===item.barang_id)?.nama||item.barang_id,item.jumlah,item.harga,calcItem(item).subtotal]))];
    const esc=(v:string|number)=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\uFEFF'+out.map(row=>row.map(esc).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='register-pembelian.csv';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  };

  const draftSubtotal=form.items.reduce((sum,item)=>sum+calcItem(item).subtotal,0);
  const draftTotal=calculatePurchaseTotal(form.items,Number(form.ppn)||0);
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ShoppingBag size={24} className="text-blue-600"/>Pembelian / Purchase Order</h1><p className="mt-1 text-gray-500">Form PO yang bisa diedit, formula item otomatis, dan status pembayaran dari Buku Kas berbukti.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm"><Download size={16}/>CSV</button><button onClick={startNew} disabled={state.stok.length===0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"><Plus size={17}/>Buat PO</button></div></header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">PO bukan otomatis utang/kas keluar</p><p className="mt-1">PO hanya komitmen. Barang diterima, faktur supplier, utang, stok, pembayaran, dan jurnal perlu dicatat pada langkah/transaksi masing-masing. Status pembayaran pada daftar dihitung dari pengeluaran Buku Kas yang direferensikan ke nomor PO dan memiliki bukti terverifikasi.</p></div>
    {message&&<p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error&&<p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Nilai PO terfilter</p><p className="mt-2 text-xl font-bold">{formatRupiah(totalPO)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Pembayaran terverifikasi</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatRupiah(paidVerified)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Sisa berdasarkan PO</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(payable)}</p></div></section>
    {showForm&&<section className="rounded-xl border bg-white p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId?'Edit PO':'Purchase Order baru'}</h2><button onClick={()=>setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="text-sm">Nomor PO *<input value={form.no_po} onChange={e=>setField('no_po',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Tanggal *<input type="date" value={form.tanggal} onChange={e=>setField('tanggal',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Supplier *<input value={form.supplier} onChange={e=>setField('supplier',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Tanggal jatuh tempo (jika ada)<input type="date" value={form.jatuh_tempo} onChange={e=>setField('jatuh_tempo',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Status penerimaan (input manual)<select value={form.status_terima} onChange={e=>setField('status_terima',e.target.value as Pembelian['status_terima'])} className="mt-1 w-full rounded border px-3 py-2"><option value="Belum">Belum diterima/lengkap</option><option value="Lengkap">Lengkap (berdasarkan pemeriksaan pengguna)</option></select></label><label className="text-sm">PPN (Rp)<input type="number" min="0" step="any" value={form.ppn} onChange={e=>setField('ppn',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label></div>
      <div className="mt-5 flex items-center justify-between"><h3 className="font-semibold">Item PO</h3><button onClick={()=>setField('items',[...form.items,emptyItem(state.stok[0])])} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm"><Plus size={14}/>Tambah item</button></div>
      <div className="mt-3 space-y-2">{form.items.map((item,index)=>{const calc=calcItem(item);return <div key={index} className="grid grid-cols-1 gap-3 rounded border p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"><label className="text-xs">Barang<select value={item.barang_id} onChange={e=>setItem(index,'barang_id',e.target.value)} className="mt-1 w-full rounded border px-2 py-2 text-sm"><option value="">Pilih barang</option>{state.stok.map(stock=><option key={stock.id} value={stock.id}>{stock.nama} — HPP {formatRupiah(stock.harga_pokok)}</option>)}</select></label><label className="text-xs">Qty<input type="number" min="0" step="any" value={item.jumlah} onChange={e=>setItem(index,'jumlah',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2 text-sm"/></label><label className="text-xs">Harga satuan<input type="number" min="0" step="any" value={item.harga} onChange={e=>setItem(index,'harga',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2 text-sm"/></label><label className="text-xs">Subtotal formula<input readOnly value={formatRupiah(calc.subtotal)} className="mt-1 w-full rounded border bg-gray-50 px-2 py-2 text-sm"/></label><button disabled={form.items.length===1} onClick={()=>setField('items',form.items.filter((_,i)=>i!==index))} aria-label="Hapus item" className="self-center rounded border p-2 text-red-700 disabled:opacity-30"><Trash2 size={15}/></button></div>})}</div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded bg-gray-50 p-3 text-sm">Subtotal formula<strong className="mt-1 block text-lg">{formatRupiah(draftSubtotal)}</strong></div><div className="rounded bg-gray-50 p-3 text-sm">PPN<strong className="mt-1 block text-lg">{formatRupiah(Number(form.ppn)||0)}</strong></div><div className="rounded bg-blue-50 p-3 text-sm">Total PO formula<strong className="mt-1 block text-lg">{formatRupiah(draftTotal)}</strong></div></div>
      <div className="mt-4 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"><Save size={16}/>Simpan PO</button><button onClick={()=>setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}
    <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nomor PO atau supplier…" className="w-full rounded-lg border bg-white px-3 py-2"/></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Register PO ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">PO / supplier</th><th className="px-3 py-3 text-right">Subtotal</th><th className="px-3 py-3 text-right">PPN</th><th className="px-3 py-3 text-right">Total formula</th><th className="px-3 py-3 text-right">Dibayar ber-bukti</th><th className="px-3 py-3 text-right">Sisa</th><th className="px-3 py-3 text-left">Penerimaan</th><th className="px-3 py-3 text-left">Pembayaran turunan</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(({purchase,subtotal,total,paid,remaining,status})=><tr key={purchase.id}><td className="px-3 py-3"><p className="font-semibold">{purchase.no_po}</p><p className="text-xs text-gray-500">{purchase.tanggal} · {purchase.supplier}</p></td><td className="px-3 py-3 text-right">{formatRupiah(subtotal)}</td><td className="px-3 py-3 text-right">{formatRupiah(purchase.ppn)}</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(total)}</td><td className="px-3 py-3 text-right text-emerald-700">{formatRupiah(paid)}</td><td className="px-3 py-3 text-right text-red-700">{formatRupiah(remaining)}</td><td className="px-3 py-3">{purchase.status_terima==='Lengkap'?'Lengkap (status input)':'Belum lengkap'}</td><td className="px-3 py-3">{status.replace(/_/g,' ')}</td><td className="px-3 py-3 text-right"><button onClick={()=>startEdit(purchase)} className="rounded border px-2 py-1 text-xs"><Pencil size={13} className="inline"/> Edit</button></td></tr>)}{rows.length===0&&<tr><td colSpan={9} className="p-8 text-center text-gray-500">Belum ada Purchase Order aktual.</td></tr>}</tbody></table></div></section>
  </div>;
}
