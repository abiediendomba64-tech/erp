import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, generateId, getLocalDateISO } from '../data';
import { getBukuKasVerificationStatus } from '../helpers';
import type { Penjualan, StokBarang } from '../types';
import { ShoppingCart, Plus, Pencil, Save, X, Download, AlertTriangle, Trash2 } from 'lucide-react';

type SalesItem = Penjualan['items'][number];
type SalesForm = {
  no_invoice: string; tanggal: string; pelanggan: string; items: SalesItem[];
  diskon: string; ppn: string; metode_bayar: Penjualan['metode_bayar']; jatuh_tempo: string;
};
const emptyItem = (stock?: StokBarang): SalesItem => ({
  barang_id: stock?.id || '',
  jumlah: 1,
  harga: stock?.harga_jual || 0,
  subtotal: (stock?.harga_jual || 0)
});
const emptyForm = (stocks: StokBarang[]): SalesForm => ({
  no_invoice: 'INV-' + getLocalDateISO().replace(/-/g,'') + '-001',
  tanggal: getLocalDateISO(), pelanggan: '', items: [emptyItem(stocks[0])],
  diskon: '0', ppn: '0', metode_bayar: 'Kredit', jatuh_tempo: ''
});
const calcItem = (item: SalesItem): SalesItem => ({
  ...item,
  jumlah: Math.max(0, Number(item.jumlah)||0),
  harga: Math.max(0, Number(item.harga)||0),
  subtotal: Math.max(0, Number(item.jumlah)||0) * Math.max(0, Number(item.harga)||0)
});
const grandTotal = (sale: Pick<Penjualan,'items'|'diskon'|'ppn'>) =>
  sale.items.reduce((sum,item)=>sum+calcItem(item).subtotal,0)-sale.diskon+sale.ppn;

export default function PenjualanPage() {
  const { state, dispatch } = useAppContext();
  const [showForm,setShowForm]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [form,setForm]=useState<SalesForm>(emptyForm(state.stok));
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const today=getLocalDateISO();

  const derivePaid=(sale:Penjualan)=>{
    const matched=state.bukuKas.filter(row=>
      row.masuk>0 &&
      (row.no_ref.trim()===sale.no_invoice || row.keterangan.includes(sale.no_invoice)) &&
      getBukuKasVerificationStatus(row,state.arsipBukti)==='LENGKAP'
    );
    return matched.reduce((sum,row)=>sum+Math.max(0,Number(row.masuk)||0),0);
  };
  const rows=useMemo(()=>state.penjualan.map(sale=>{
    const items=sale.items.map(calcItem);
    const subtotal=items.reduce((sum,item)=>sum+item.subtotal,0);
    const total=Math.max(0,subtotal-sale.diskon+sale.ppn);
    const paid=derivePaid(sale);
    const remaining=Math.max(0,total-paid);
    const status=paid>=total&&total>0?'Lunas':paid>0?'DP':sale.jatuh_tempo&&sale.jatuh_tempo<today?'Jatuh_Tempo':'Belum_Bayar';
    return {sale,items,subtotal,total,paid,remaining,status};
  }).filter(row=>(row.sale.no_invoice+' '+row.sale.pelanggan).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>b.sale.tanggal.localeCompare(a.sale.tanggal)),[state.penjualan,state.bukuKas,state.arsipBukti,search,today]);

  const totalRevenue=rows.reduce((sum,row)=>sum+row.total,0);
  const paidVerified=rows.reduce((sum,row)=>sum+row.paid,0);
  const receivable=rows.reduce((sum,row)=>sum+row.remaining,0);

  const setField=<K extends keyof SalesForm>(key:K,value:SalesForm[K])=>setForm(old=>({...old,[key]:value}));
  const setItem=(index:number,key:keyof SalesItem,value:string|number)=>{
    setForm(old=>({...old,items:old.items.map((item,i)=>{
      if(i!==index)return item;
      if(key==='barang_id'){
        const stock=state.stok.find(s=>s.id===String(value));
        return calcItem({...item,barang_id:String(value),harga:stock?.harga_jual||0});
      }
      return calcItem({...item,[key]:value});
    })}));
  };
  const startNew=()=>{setEditingId(null);setForm(emptyForm(state.stok));setError('');setMessage('');setShowForm(true);};
  const startEdit=(sale:Penjualan)=>{
    setEditingId(sale.id);
    setForm({no_invoice:sale.no_invoice,tanggal:sale.tanggal,pelanggan:sale.pelanggan,items:sale.items.map(calcItem),diskon:String(sale.diskon),ppn:String(sale.ppn),metode_bayar:sale.metode_bayar,jatuh_tempo:sale.jatuh_tempo});
    setError('');setMessage('');setShowForm(true);
  };

  const save=()=>{
    setError('');
    if(!form.no_invoice.trim()||!form.tanggal||!form.pelanggan.trim()){setError('Nomor invoice, tanggal, dan pelanggan wajib diisi.');return;}
    const duplicate=state.penjualan.find(item=>item.id!==editingId&&item.no_invoice.trim().toLowerCase()===form.no_invoice.trim().toLowerCase());
    if(duplicate){setError('Nomor invoice sudah digunakan.');return;}
    if(form.items.length===0){setError('Invoice harus memiliki minimal satu item.');return;}
    for(const [index,item] of form.items.entries()){
      if(!item.barang_id||!state.stok.some(stock=>stock.id===item.barang_id)){setError('Pilih barang yang valid untuk item '+(index+1)+'.');return;}
      if(!Number.isFinite(item.jumlah)||item.jumlah<=0||!Number.isFinite(item.harga)||item.harga<0){setError('Kuantitas harus positif dan harga tidak boleh negatif pada item '+(index+1)+'.');return;}
    }
    const items=form.items.map(calcItem);
    const subtotal=items.reduce((sum,item)=>sum+item.subtotal,0);
    const diskon=Number(form.diskon),ppn=Number(form.ppn);
    if(!Number.isFinite(diskon)||diskon<0||diskon>subtotal||!Number.isFinite(ppn)||ppn<0){setError('Diskon/PPN tidak valid; diskon tidak boleh melebihi subtotal.');return;}
    if(subtotal-diskon+ppn<=0){setError('Total invoice harus lebih besar dari nol.');return;}
    if(form.metode_bayar==='Kredit'&&!form.jatuh_tempo){setError('Tanggal jatuh tempo wajib diisi untuk penjualan kredit.');return;}
    const record:Penjualan={
      id:editingId||generateId('PJ',state.penjualan),
      no_invoice:form.no_invoice.trim(),tanggal:form.tanggal,pelanggan:form.pelanggan.trim(),
      items,diskon,ppn,status_bayar:'Belum_Bayar',metode_bayar:form.metode_bayar,jatuh_tempo:form.jatuh_tempo
    };
    if(editingId)dispatch({type:'UPDATE_PENJUALAN',payload:record});else dispatch({type:'ADD_PENJUALAN',payload:record});
    setShowForm(false);setEditingId(null);setMessage('Invoice tersimpan dengan total hasil rumus. Pembayaran/lunas hanya dihitung dari uang masuk Buku Kas yang nomor referensinya cocok dengan invoice dan bukti sudah diverifikasi; invoice tidak otomatis menambah stok atau jurnal.');
  };

  const exportCsv=()=>{
    const out:(string|number)[][]=[['REGISTER PENJUALAN'],['Catatan','Status bayar dihitung dari kas masuk yang terhubung dan bukti terverifikasi; harga/total dihitung dari item.'],[],['Invoice','Tanggal','Pelanggan','Subtotal formula','Diskon','PPN','Total formula','Pembayaran terverifikasi','Sisa piutang terhitung','Status'],...rows.map(({sale,subtotal,total,paid,remaining,status})=>[sale.no_invoice,sale.tanggal,sale.pelanggan,subtotal,sale.diskon,sale.ppn,total,paid,remaining,status]),[],['DETAIL ITEM'],['Invoice','Barang','Kuantitas','Harga satuan','Subtotal formula'],...rows.flatMap(({sale,items})=>items.map(item=>[sale.no_invoice,state.stok.find(stock=>stock.id===item.barang_id)?.nama||item.barang_id,item.jumlah,item.harga,calcItem(item).subtotal]))];
    const esc=(v:string|number)=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const csv='\uFEFF'+out.map(row=>row.map(esc).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='register-penjualan.csv';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  };

  const draftSubtotal=form.items.reduce((sum,item)=>sum+calcItem(item).subtotal,0);
  const draftTotal=draftSubtotal-(Number(form.diskon)||0)+(Number(form.ppn)||0);
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ShoppingCart size={24} className="text-emerald-600"/>Penjualan / Invoice</h1><p className="mt-1 text-gray-500">CRUD invoice dengan subtotal, diskon, PPN, total, pembayaran terverifikasi, dan piutang dihitung otomatis.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm"><Download size={16}/>CSV</button><button onClick={startNew} disabled={state.stok.length===0} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"><Plus size={17}/>Buat Invoice</button></div></header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Lunas tidak diambil dari pilihan status manual</p><p className="mt-1">Status dan sisa piutang dihitung dari pembayaran masuk pada Buku Kas yang menggunakan nomor invoice sebagai referensi/keterangan serta dilengkapi bukti pembayaran dengan nominal cocok dan pemeriksaan manual. Invoice tidak otomatis memengaruhi stok/jurnal agar tidak terjadi hitung ganda.</p></div>
    {message&&<p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error&&<p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Nilai invoice tersimpan</p><p className="mt-2 text-xl font-bold">{formatRupiah(totalRevenue)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Pembayaran dengan bukti</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatRupiah(paidVerified)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Sisa piutang terhitung</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(receivable)}</p></div></section>
    {showForm&&<section className="rounded-xl border bg-white p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId?'Edit Invoice':'Invoice Baru'}</h2><button onClick={()=>setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="text-sm">Nomor invoice *<input value={form.no_invoice} onChange={e=>setField('no_invoice',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Tanggal *<input type="date" value={form.tanggal} onChange={e=>setField('tanggal',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Pelanggan *<input value={form.pelanggan} onChange={e=>setField('pelanggan',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Syarat bayar<select value={form.metode_bayar} onChange={e=>setField('metode_bayar',e.target.value as Penjualan['metode_bayar'])} className="mt-1 w-full rounded border px-3 py-2"><option value="Tunai">Tunai</option><option value="Transfer">Transfer</option><option value="Kredit">Kredit</option></select></label>{form.metode_bayar==='Kredit'&&<label className="text-sm">Jatuh tempo *<input type="date" value={form.jatuh_tempo} onChange={e=>setField('jatuh_tempo',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label>}</div>
      <div className="mt-5 flex items-center justify-between"><h3 className="font-semibold">Item invoice</h3><button onClick={()=>setField('items',[...form.items,emptyItem(state.stok[0])])} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm"><Plus size={14}/>Tambah item</button></div>
      <div className="mt-3 space-y-2">{form.items.map((item,index)=>{const calc=calcItem(item);return <div key={index} className="grid grid-cols-1 gap-3 rounded border p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"><label className="text-xs">Barang<select value={item.barang_id} onChange={e=>setItem(index,'barang_id',e.target.value)} className="mt-1 w-full rounded border px-2 py-2 text-sm"><option value="">Pilih barang</option>{state.stok.map(stock=><option key={stock.id} value={stock.id}>{stock.nama} — harga jual {formatRupiah(stock.harga_jual)}</option>)}</select></label><label className="text-xs">Jumlah<input type="number" min="0" step="any" value={item.jumlah} onChange={e=>setItem(index,'jumlah',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2 text-sm"/></label><label className="text-xs">Harga satuan<input type="number" min="0" step="any" value={item.harga} onChange={e=>setItem(index,'harga',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2 text-sm"/></label><label className="text-xs">Subtotal formula<input readOnly value={formatRupiah(calc.subtotal)} className="mt-1 w-full rounded border bg-gray-50 px-2 py-2 text-sm"/></label><button disabled={form.items.length===1} onClick={()=>setField('items',form.items.filter((_,i)=>i!==index))} aria-label="Hapus item" className="self-center rounded border p-2 text-red-700 disabled:opacity-30"><Trash2 size={15}/></button></div>})}</div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded bg-gray-50 p-3 text-sm">Subtotal formula<strong className="mt-1 block text-lg">{formatRupiah(draftSubtotal)}</strong></div><label className="rounded bg-gray-50 p-3 text-sm">Diskon<input type="number" min="0" step="any" value={form.diskon} onChange={e=>setField('diskon',e.target.value)} className="mt-1 w-full rounded border px-2 py-1"/></label><label className="rounded bg-gray-50 p-3 text-sm">PPN<input type="number" min="0" step="any" value={form.ppn} onChange={e=>setField('ppn',e.target.value)} className="mt-1 w-full rounded border px-2 py-1"/></label></div><p className="mt-3 text-xl font-bold">Total invoice formula: {formatRupiah(draftTotal)}</p><div className="mt-4 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white"><Save size={16}/>Simpan Invoice</button><button onClick={()=>setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}
    <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari invoice atau pelanggan…" className="w-full rounded-lg border bg-white px-3 py-2"/></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Register invoice ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">Invoice / pelanggan</th><th className="px-3 py-3 text-right">Subtotal</th><th className="px-3 py-3 text-right">Diskon</th><th className="px-3 py-3 text-right">PPN</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">Dibayar ber-bukti</th><th className="px-3 py-3 text-right">Sisa</th><th className="px-3 py-3 text-left">Status turunan</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(({sale,subtotal,total,paid,remaining,status})=><tr key={sale.id}><td className="px-3 py-3"><p className="font-semibold">{sale.no_invoice}</p><p className="text-xs text-gray-500">{sale.tanggal} · {sale.pelanggan}</p></td><td className="px-3 py-3 text-right">{formatRupiah(subtotal)}</td><td className="px-3 py-3 text-right">{formatRupiah(sale.diskon)}</td><td className="px-3 py-3 text-right">{formatRupiah(sale.ppn)}</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(total)}</td><td className="px-3 py-3 text-right text-emerald-700">{formatRupiah(paid)}</td><td className="px-3 py-3 text-right text-red-700">{formatRupiah(remaining)}</td><td className="px-3 py-3">{status.replace(/_/g,' ')}</td><td className="px-3 py-3 text-right"><button onClick={()=>startEdit(sale)} className="rounded border px-2 py-1 text-xs"><Pencil size={13} className="inline"/> Edit</button></td></tr>)}{rows.length===0&&<tr><td colSpan={9} className="p-8 text-center text-gray-500">Belum ada invoice aktual yang disimpan.</td></tr>}</tbody></table></div></section>
  </div>;
}
