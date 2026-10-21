import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, generateId, getLocalDateISO } from '../data';
import { getBukuKasVerificationStatus } from '../helpers';
import type { Penggajian } from '../types';
import { Users, Plus, Pencil, Save, X, Download, AlertTriangle } from 'lucide-react';

type PayrollForm=Omit<Penggajian,'id'>;
const emptyForm=():PayrollForm=>({nip:'',nama:'',jabatan:'',departemen:'',gaji_pokok:0,tunjangan:0,lembur:0,potongan:0,pph21:0,periode:getLocalDateISO().slice(0,7),status:'Disetujui'});
const payrollNet=(record:Pick<Penggajian,'gaji_pokok'|'tunjangan'|'lembur'|'potongan'|'pph21'>)=>
  Math.max(0,Number(record.gaji_pokok)||0)+Math.max(0,Number(record.tunjangan)||0)+Math.max(0,Number(record.lembur)||0)-Math.max(0,Number(record.potongan)||0)-Math.max(0,Number(record.pph21)||0);

export default function PenggajianPage(){
  const {state,dispatch}=useAppContext();
  const [showForm,setShowForm]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [form,setForm]=useState<PayrollForm>(emptyForm());
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const today=getLocalDateISO();

  const derivePaid=(payroll:Penggajian)=>state.bukuKas.filter(row=>
    row.keluar>0 &&
    (row.no_ref.trim()===payroll.id ||
      row.keterangan.toLowerCase().includes(payroll.nip.toLowerCase())&&row.keterangan.includes(payroll.periode)) &&
    getBukuKasVerificationStatus(row,state.arsipBukti)==='LENGKAP'
  ).reduce((sum,row)=>sum+Math.max(0,Number(row.keluar)||0),0);

  const rows=useMemo(()=>state.penggajian.map(record=>{
    const net=payrollNet(record);
    const paid=derivePaid(record);
    const remaining=Math.max(0,net-paid);
    const paymentStatus=paid>=net&&net>0?'Dibayar (bukti lengkap)':paid>0?'Dibayar sebagian':'Belum dibayar terverifikasi';
    return {record,net,paid,remaining,paymentStatus};
  }).filter(row=>(row.record.nip+' '+row.record.nama+' '+row.record.jabatan+' '+row.record.periode).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>b.record.periode.localeCompare(a.record.periode)||a.record.nama.localeCompare(b.record.nama)),
  [state.penggajian,state.bukuKas,state.arsipBukti,search]);

  const totalNet=rows.reduce((sum,row)=>sum+row.net,0);
  const paidTotal=rows.reduce((sum,row)=>sum+row.paid,0);
  const payable=rows.reduce((sum,row)=>sum+row.remaining,0);

  const setField=<K extends keyof PayrollForm>(key:K,value:PayrollForm[K])=>setForm(old=>({...old,[key]:value}));
  const startNew=()=>{setEditingId(null);setForm(emptyForm());setError('');setMessage('');setShowForm(true);};
  const startEdit=(record:Penggajian)=>{const {id,...rest}=record;setEditingId(id);setForm({...rest});setError('');setMessage('');setShowForm(true);};
  const save=()=>{
    setError('');
    if(!form.nip.trim()||!form.nama.trim()||!form.periode||!/^\d{4}-\d{2}$/.test(form.periode)){
      setError('NIP/ID karyawan, nama, dan periode YYYY-MM wajib diisi.');return;
    }
    if(!form.jabatan.trim()){setError('Jabatan wajib diisi.');return;}
    const numbers=[form.gaji_pokok,form.tunjangan,form.lembur,form.potongan,form.pph21];
    if(numbers.some(value=>!Number.isFinite(Number(value))||Number(value)<0)){setError('Komponen gaji harus angka nol atau lebih.');return;}
    if(payrollNet(form)<=0){setError('Gaji bersih terhitung harus lebih besar dari nol.');return;}
    const duplicate=state.penggajian.find(item=>item.id!==editingId&&item.nip.trim().toLowerCase()===form.nip.trim().toLowerCase()&&item.periode===form.periode);
    if(duplicate){setError('Payroll untuk karyawan dan periode tersebut sudah ada. Edit record yang ada untuk mencegah penggajian ganda.');return;}
    const record:Penggajian={...form,id:editingId||generateId('GJ',state.penggajian),nip:form.nip.trim(),nama:form.nama.trim(),jabatan:form.jabatan.trim(),departemen:form.departemen.trim()};
    if(editingId)dispatch({type:'UPDATE_PENGGAJIAN',payload:record});else dispatch({type:'ADD_PENGGAJIAN',payload:record});
    setShowForm(false);setEditingId(null);setMessage('Rincian payroll tersimpan. Gaji bersih dihitung otomatis; status pembayaran tidak dipercaya dari pilihan manual dan hanya diturunkan dari pengeluaran Buku Kas dengan bukti cocok/terverifikasi.');
  };

  const exportCsv=()=>{
    const out:(string|number)[][]=[['REGISTER PENGGAJIAN'],['Catatan','Gaji bersih = pokok + tunjangan + lembur - potongan - PPh21. Pembayaran hanya dihitung dari kas keluar dengan bukti terverifikasi yang cocok.'],[],['NIP','Nama','Jabatan','Periode','Pokok','Tunjangan','Lembur','Potongan','PPh21','Net formula','Dibayar terverifikasi','Sisa gaji','Status'],...rows.map(({record,net,paid,remaining,paymentStatus})=>[record.nip,record.nama,record.jabatan,record.periode,record.gaji_pokok,record.tunjangan,record.lembur,record.potongan,record.pph21,net,paid,remaining,paymentStatus])];
    const esc=(v:string|number)=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\uFEFF'+out.map(row=>row.map(esc).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='register-penggajian.csv';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  };

  const setJumlahField=(key:'gaji_pokok'|'tunjangan'|'lembur'|'potongan'|'pph21',value:number)=>setField(key,value);
  const draftNet=payrollNet(form);
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Users size={24} className="text-purple-600"/>Penggajian Karyawan</h1><p className="mt-1 text-gray-500">CRUD payroll dengan rumus gaji bersih, anti-duplikasi karyawan/periode, dan pembayaran terverifikasi.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm"><Download size={16}/>CSV</button><button onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white"><Plus size={17}/>Buat Payroll</button></div></header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Status "dibayar" tidak boleh berdasarkan centang manual</p><p className="mt-1">Nominal dibayar berasal dari transaksi kas keluar yang dirujuk pada ID payroll atau NIP+periode serta memiliki bukti kuitansi/transfer dengan nominal cocok. Menyimpan slip saja tidak mengeluarkan uang dan tidak membuat jurnal kas otomatis.</p></div>
    {message&&<p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error&&<p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Payroll bersih terhitung</p><p className="mt-2 text-xl font-bold">{formatRupiah(totalNet)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Pembayaran terverifikasi</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatRupiah(paidTotal)}</p></div><div className="rounded-xl border bg-white p-4"><p className="text-sm text-gray-500">Sisa kewajiban payroll terhitung</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(payable)}</p></div></section>
    {showForm&&<section className="rounded-xl border bg-white p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editingId?'Edit Payroll':'Payroll Baru'}</h2><button onClick={()=>setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18}/></button></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="text-sm">NIP/ID karyawan *<input value={form.nip} onChange={e=>setField('nip',e.target.value)} placeholder="Kode karyawan yang benar" className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Nama karyawan *<input value={form.nama} onChange={e=>setField('nama',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Periode gaji (YYYY-MM) *<input type="month" value={form.periode} onChange={e=>setField('periode',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Jabatan *<input value={form.jabatan} onChange={e=>setField('jabatan',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label><label className="text-sm">Departemen/proyek<input value={form.departemen} onChange={e=>setField('departemen',e.target.value)} className="mt-1 w-full rounded border px-3 py-2"/></label></div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{([['gaji_pokok','Gaji pokok'],['tunjangan','Tunjangan'],['lembur','Lembur'],['potongan','Potongan'],['pph21','PPh21']] as const).map(([key,label])=><label key={key} className="text-sm">{label} (Rp)<input type="number" min="0" step="any" value={form[key]} onChange={e=>setJumlahField(key,Number(e.target.value))} className="mt-1 w-full rounded border px-3 py-2"/></label>)}</div>
      <div className="mt-4 rounded-lg bg-purple-50 p-4"><p className="text-sm">Gaji bersih terhitung</p><p className="mt-1 text-2xl font-bold">{formatRupiah(draftNet)}</p><p className="mt-1 text-xs text-purple-900">Pokok + tunjangan + lembur − potongan − PPh21</p></div>
      <div className="mt-4 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white"><Save size={16}/>Simpan Payroll</button><button onClick={()=>setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2">Batal</button></div>
    </section>}
    <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari NIP, nama atau periode…" className="w-full rounded-lg border bg-white px-3 py-2"/></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-semibold">Register payroll ({rows.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left">Karyawan / periode</th><th className="px-3 py-3 text-right">Pokok</th><th className="px-3 py-3 text-right">Tunjangan + lembur</th><th className="px-3 py-3 text-right">Potongan + PPh21</th><th className="px-3 py-3 text-right">Gaji bersih</th><th className="px-3 py-3 text-right">Dibayar dengan bukti</th><th className="px-3 py-3 text-right">Sisa</th><th className="px-3 py-3 text-left">Status pembayaran</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{rows.map(({record,net,paid,remaining,paymentStatus})=><tr key={record.id}><td className="px-3 py-3"><p className="font-semibold">{record.nama}</p><p className="text-xs text-gray-500">{record.nip} · {record.jabatan} · {record.periode}</p></td><td className="px-3 py-3 text-right">{formatRupiah(record.gaji_pokok)}</td><td className="px-3 py-3 text-right">{formatRupiah(record.tunjangan+record.lembur)}</td><td className="px-3 py-3 text-right">{formatRupiah(record.potongan+record.pph21)}</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(net)}</td><td className="px-3 py-3 text-right text-emerald-700">{formatRupiah(paid)}</td><td className="px-3 py-3 text-right text-red-700">{formatRupiah(remaining)}</td><td className="px-3 py-3">{paymentStatus}</td><td className="px-3 py-3 text-right"><button onClick={()=>startEdit(record)} className="rounded border px-2 py-1 text-xs"><Pencil size={13} className="inline"/> Edit</button></td></tr>)}{rows.length===0&&<tr><td colSpan={9} className="p-8 text-center text-gray-500">Belum ada payroll aktual untuk periode yang dicari.</td></tr>}</tbody></table></div></section>
  </div>;
}
