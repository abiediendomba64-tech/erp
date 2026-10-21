import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getPosKewajibanSisaUtang, getTanahNilaiTotal, getTanahSisa, getRelatedDocuments, hasDocumentEvidence } from '../helpers';
import type { PosKewajiban } from '../types';
import { Scale, AlertTriangle, Plus, Pencil, Save, X, FileText, ExternalLink } from 'lucide-react';

const emptyForm: Omit<PosKewajiban, 'id'> = {
  kode_utang: '',
  pihak: '',
  nilai_menurut_dokumen: 0,
  nilai_menurut_workbook: 0,
  dp_dibayar: 0,
  tanah_id: '',
  status: 'Dalam_Penelusuran',
  keterangan: '',
};

export default function PosKewajibanPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<PosKewajiban, 'id'>>(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const update = <K extends keyof Omit<PosKewajiban, 'id'>>(key: K, value: Omit<PosKewajiban, 'id'>[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };
  const beginNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
    setMessage('');
    setShowForm(true);
  };
  const beginEdit = (item: PosKewajiban) => {
    const { id, ...rest } = item;
    setEditingId(id);
    setForm({ ...emptyForm, ...rest });
    setError('');
    setMessage('');
    setShowForm(true);
  };
  const save = () => {
    setError('');
    if (!form.pihak.trim() || !form.kode_utang.trim()) {
      setError('Kode kewajiban dan nama pihak wajib diisi.');
      return;
    }
    if (![form.nilai_menurut_dokumen, form.nilai_menurut_workbook, form.dp_dibayar]
      .every(value => Number.isFinite(Number(value)) && Number(value) >= 0)) {
      setError('Nilai dokumen, nilai workbook, dan pembayaran harus angka nol atau lebih.');
      return;
    }
    if (form.tanah_id && !state.tanah.some(land => land.id === form.tanah_id)) {
      setError('Pilih bidang tanah yang benar atau kosongkan hubungan bidang.');
      return;
    }
    const record: PosKewajiban = {
      ...form,
      id: editingId || 'UT-' + Date.now().toString(36).toUpperCase(),
      kode_utang: form.kode_utang.trim(),
      pihak: form.pihak.trim(),
      tanah_id: form.tanah_id || undefined,
      keterangan: form.keterangan.trim(),
    };
    if (editingId) dispatch({ type: 'UPDATE_POS_KEWAJIBAN', payload: record });
    else dispatch({ type: 'ADD_POS_KEWAJIBAN', payload: record });
    setShowForm(false);
    setEditingId(null);
    setMessage('Catatan kewajiban tersimpan. Jika terhubung ke Register Tanah, nilai dan pembayaran terbaru dihitung dari bidang tersebut; angka workbook tetap sebagai pembanding.');
  };

  const rows = state.posKewajiban.map(item => {
    const land = item.tanah_id ? state.tanah.find(record => record.id === item.tanah_id) : undefined;
    const nilaiAktif = land ? getTanahNilaiTotal(land) : item.nilai_menurut_dokumen;
    const paidAktif = land ? Math.max(0, land.dp) : item.dp_dibayar;
    const balance = land ? getTanahSisa(land) : getPosKewajibanSisaUtang(item);
    const difference = item.nilai_menurut_workbook - nilaiAktif;
    const docs = land
      ? getRelatedDocuments(state.arsipBukti, 'Tanah', land.id, land.kode_bukti)
      : getRelatedDocuments(state.arsipBukti, 'Utang Tanah', item.id, item.kode_utang);
    const usableDocs = docs.filter(doc => hasDocumentEvidence(doc));
    return { item, land, nilaiAktif, paidAktif, balance, difference, docs: usableDocs };
  });
  const totalNilai = rows.reduce((sum, row) => sum + row.nilaiAktif, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paidAktif, 0);
  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0);
  const totalMismatch = rows.reduce((sum, row) => sum + row.difference, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Scale size={24} className="text-amber-600" />Kewajiban / Sisa Utang Tanah</h1><p className="mt-1 text-gray-500">Komitmen belum dibayar bukan pengeluaran kas. Hubungkan ke Register Tanah untuk mencegah rumus dan pembayaran berganda.</p></div>
        <button onClick={beginNew} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"><Plus size={18} />Tambah Kewajiban</button>
      </header>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Sumber perhitungan</p><p className="mt-1">Baris yang terhubung ke bidang tanah menggunakan nilai kontrak dan pembayaran dari Register Tanah. Nilai dokumen/workbook pada modul ini dipakai sebagai referensi rekonsiliasi, bukan sebagai transaksi kas baru.</p></div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Nilai kewajiban aktif</p><p className="mt-2 text-xl font-bold">{formatRupiah(totalNilai)}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Pembayaran yang tercatat</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatRupiah(totalPaid)}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Sisa kewajiban terhitung</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(totalBalance)}</p></div>
      </section>

      {showForm && (
        <section className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Catatan Kewajiban' : 'Tambah Catatan Kewajiban'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">Kode kewajiban *
              <input value={form.kode_utang} onChange={e => update('kode_utang', e.target.value)} placeholder="UT-04" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Pihak / penjual *
              <input value={form.pihak} onChange={e => update('pihak', e.target.value)} placeholder="Nama sesuai perjanjian" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Terhubung ke bidang tanah
              <select value={form.tanah_id || ''} onChange={e => {
                const land = state.tanah.find(item => item.id === e.target.value);
                update('tanah_id', e.target.value);
                if (land && !form.pihak.trim()) update('pihak', land.pemilik);
              }} className="mt-1 w-full rounded-lg border px-3 py-2">
                <option value="">Tidak terhubung (manual)</option>
                {state.tanah.map(land => <option key={land.id} value={land.id}>{land.id} — {land.pemilik}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">Nilai menurut dokumen (Rp)
              <input type="number" min="0" step="1" value={form.nilai_menurut_dokumen || ''} onChange={e => update('nilai_menurut_dokumen', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
              <span className="mt-1 block text-xs font-normal text-gray-500">Nilai yang disalin dari perjanjian/kontrak sebagai pembanding.</span>
            </label>
            <label className="text-sm font-medium text-gray-700">Nilai menurut workbook (Rp)
              <input type="number" min="0" step="1" value={form.nilai_menurut_workbook || ''} onChange={e => update('nilai_menurut_workbook', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Pembayaran referensi (Rp)
              <input type="number" min="0" step="1" value={form.dp_dibayar || ''} onChange={e => update('dp_dibayar', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
              <span className="mt-1 block text-xs font-normal text-gray-500">Jika sudah terhubung ke Register Tanah, angka pembayaran aktif mengikuti bidang tanah.</span>
            </label>
            <label className="text-sm font-medium text-gray-700">Status rekonsiliasi
              <select value={form.status} onChange={e => update('status', e.target.value as PosKewajiban['status'])} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="Dalam_Penelusuran">Dalam penelusuran</option><option value="Sepakat">Sepakat</option><option value="Sengketa">Sengketa</option></select>
            </label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2">Catatan
              <textarea value={form.keterangan} onChange={e => update('keterangan', e.target.value)} rows={2} placeholder="Nomor perjanjian, jatuh tempo, klausul, ketidaksesuaian atau tindak lanjut." className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"><Save size={17} />Simpan</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Batal</button></div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Daftar kewajiban ({rows.length})</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-sm">
          <thead className="border-b bg-gray-50"><tr><th className="px-3 py-3 text-left">Pihak / ID</th><th className="px-3 py-3 text-left">Sumber nilai</th><th className="px-3 py-3 text-right">Nilai aktif</th><th className="px-3 py-3 text-right">Dibayar aktif</th><th className="px-3 py-3 text-right">Sisa formula</th><th className="px-3 py-3 text-right">Selisih workbook</th><th className="px-3 py-3 text-center">Dokumen</th><th className="px-3 py-3 text-left">Status</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
          <tbody className="divide-y">
            {rows.map(({ item, land, nilaiAktif, paidAktif, balance, difference, docs }) => <tr key={item.id} className="align-top hover:bg-gray-50">
              <td className="px-3 py-3"><p className="font-medium">{item.pihak}</p><p className="text-xs text-gray-500">{item.kode_utang} · {land ? land.id : 'Tidak terhubung'}</p></td>
              <td className="px-3 py-3 text-xs text-gray-600">{land ? 'Register Tanah (sumber aktif)' : 'Nilai manual kewajiban'}<p className="mt-1">Dokumen referensi: {formatRupiah(item.nilai_menurut_dokumen)}</p></td>
              <td className="px-3 py-3 text-right">{formatRupiah(nilaiAktif)}</td><td className="px-3 py-3 text-right text-emerald-700">{formatRupiah(paidAktif)}</td><td className="px-3 py-3 text-right font-bold text-red-700">{formatRupiah(balance)}</td><td className={`px-3 py-3 text-right ${difference !== 0 ? 'font-semibold text-amber-800' : 'text-emerald-700'}`}>{formatRupiah(difference)}</td>
              <td className="px-3 py-3">{docs.length ? <div className="space-y-1">{docs.map(doc => <div key={doc.id}><p className="text-xs">{doc.judul_dokumen || doc.catatan_audit || doc.kode_bukti}</p>{doc.link_drive && <a href={doc.link_drive} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 underline"><FileText size={12} />Buka</a>}</div>)}</div> : <span className="text-xs text-red-700">Belum ada file/URL</span>}</td>
              <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${item.status === 'Sengketa' ? 'bg-red-100 text-red-800' : item.status === 'Sepakat' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{item.status.replace(/_/g, ' ')}</span><p className="mt-1 max-w-[220px] text-xs text-gray-500">{item.keterangan || 'Belum ada catatan'}</p></td>
              <td className="px-3 py-3 text-right"><button onClick={() => beginEdit(item)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button></td>
            </tr>)}
            {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-500">Belum ada catatan kewajiban. Tambahkan jika ada utang atau komitmen yang perlu ditelusuri.</td></tr>}
          </tbody>
          <tfoot className="border-t-2 bg-gray-50"><tr><td colSpan={2} className="px-3 py-3 font-bold">TOTAL</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(totalNilai)}</td><td className="px-3 py-3 text-right font-bold text-emerald-700">{formatRupiah(totalPaid)}</td><td className="px-3 py-3 text-right font-bold text-red-700">{formatRupiah(totalBalance)}</td><td className={`px-3 py-3 text-right font-bold ${totalMismatch ? 'text-amber-700' : ''}`}>{formatRupiah(totalMismatch)}</td><td colSpan={3}></td></tr></tfoot>
        </table></div>
      </section>
    </div>
  );
}
