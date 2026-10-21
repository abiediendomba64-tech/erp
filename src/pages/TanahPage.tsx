import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, getLocalDateISO } from '../data';
import { getTanahNilaiTotal, getTanahSisa, getTanahKelebihanBayar, getRelatedDocuments, hasDocumentEvidence } from '../helpers';
import { AUDIT_CONSTANTS } from '../data';
import type { Tanah } from '../types';
import { LandPlot, CheckCircle, AlertTriangle, Plus, Pencil, Save, X, ExternalLink, FileText } from 'lucide-react';

const emptyForm: Omit<Tanah, 'id'> = {
  pemilik: '',
  luas_bt: 0,
  harga_per_bt: 0,
  nilai_total_manual: undefined,
  dp: 0,
  status: 'Belum_Bayar',
  kode_bukti: '',
  url_bukti: '',
  catatan: '',
};

function paymentStatus(item: Tanah): string {
  const value = getTanahNilaiTotal(item);
  const remaining = getTanahSisa(item);
  const overpaid = getTanahKelebihanBayar(item);
  if (overpaid > 0) return 'Kelebihan bayar';
  if (value > 0 && remaining === 0) return 'Lunas menurut angka input';
  if (item.dp > 0) return 'DP / sebagian';
  return 'Belum dibayar';
}

export default function TanahPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Tanah, 'id'>>(emptyForm);
  const [manualTotalInput, setManualTotalInput] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const totalLuas = state.tanah.reduce((sum, item) => sum + Math.max(0, item.luas_bt), 0);
  const totalNilai = state.tanah.reduce((sum, item) => sum + getTanahNilaiTotal(item), 0);
  const totalDibayar = state.tanah.reduce((sum, item) => sum + Math.max(0, item.dp), 0);
  const totalSisa = state.tanah.reduce((sum, item) => sum + getTanahSisa(item), 0);
  const totalKelebihanBayar = state.tanah.reduce((sum, item) => sum + getTanahKelebihanBayar(item), 0);

  const rekapPenjual = useMemo(() => state.tanah.reduce((acc, item) => {
    const nama = item.pemilik.trim() || '(pemilik belum diisi)';
    if (!acc[nama]) acc[nama] = { luas: 0, nilai: 0, dibayar: 0, sisa: 0, kelebihan: 0 };
    acc[nama].luas += Math.max(0, item.luas_bt);
    acc[nama].nilai += getTanahNilaiTotal(item);
    acc[nama].dibayar += Math.max(0, item.dp);
    acc[nama].sisa += getTanahSisa(item);
    acc[nama].kelebihan += getTanahKelebihanBayar(item);
    return acc;
  }, {} as Record<string, { luas: number; nilai: number; dibayar: number; sisa: number; kelebihan: number }>), [state.tanah]);

  const withoutEvidence = state.tanah.filter(item => {
    const docs = getRelatedDocuments(state.arsipBukti, 'Tanah', item.id, item.kode_bukti);
    return !docs.some(doc => hasDocumentEvidence(doc) && doc.terverifikasi === 'Ya');
  }).length;

  const update = <K extends keyof Omit<Tanah, 'id'>>(key: K, value: Omit<Tanah, 'id'>[K]) => {
    setForm(old => ({ ...old, [key]: value }));
  };

  const beginNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setManualTotalInput('');
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const beginEdit = (item: Tanah) => {
    const { id, ...record } = item;
    setEditingId(id);
    setForm({ ...emptyForm, ...record });
    setManualTotalInput(item.nilai_total_manual ? String(item.nilai_total_manual) : '');
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const saveLand = () => {
    setError('');
    setMessage('');
    if (!form.pemilik.trim()) {
      setError('Nama penjual/pemilik wajib diisi.');
      return;
    }
    if (![form.luas_bt, form.harga_per_bt, form.dp].every(value => Number.isFinite(Number(value)) && Number(value) >= 0)) {
      setError('Luas, harga satuan, dan pembayaran harus angka nol atau lebih.');
      return;
    }
    let nilai_manual: number | undefined;
    if (manualTotalInput.trim()) {
      nilai_manual = Number(manualTotalInput);
      if (!Number.isFinite(nilai_manual) || nilai_manual < 0) {
        setError('Nilai kesepakatan nominal langsung tidak valid.');
        return;
      }
    }
    if (form.luas_bt === 0 && form.harga_per_bt === 0 && !(nilai_manual && nilai_manual > 0)) {
      setError('Tanah tanpa luas/harga wajib memiliki nilai kesepakatan langsung. Jangan menyimpulkan nilai kontrak hanya dari jumlah yang dibayar.');
      return;
    }
    if (form.url_bukti.trim() && !/^https?:\/\//i.test(form.url_bukti.trim())) {
      setError('URL bukti harus berupa tautan HTTP/HTTPS.');
      return;
    }

    const draft: Tanah = {
      ...form,
      id: editingId || 'T-' + Date.now().toString(36).toUpperCase(),
      pemilik: form.pemilik.trim(),
      nilai_total_manual: nilai_manual,
      kode_bukti: form.kode_bukti.trim(),
      url_bukti: form.url_bukti.trim(),
      catatan: form.catatan.trim(),
      status: 'Belum_Bayar',
    };
    const value = getTanahNilaiTotal(draft);
    const remaining = getTanahSisa(draft);
    const overpaid = getTanahKelebihanBayar(draft);
    draft.status = overpaid > 0 || (value > 0 && remaining === 0) ? 'Lunas' : form.dp > 0 ? 'DP' : 'Belum_Bayar';

    if (editingId) dispatch({ type: 'UPDATE_TANAH', payload: draft });
    else dispatch({ type: 'ADD_TANAH', payload: draft });
    setShowForm(false);
    setMessage(editingId ? 'Data bidang diperbarui. Nilai, sisa, dan status dihitung ulang.' : 'Bidang ditambahkan. Nilai, sisa, dan status dihitung otomatis.');
    setEditingId(null);
  };

  const referenceMatches =
    totalNilai === AUDIT_CONSTANTS.TOTAL_NILAI_TANAH &&
    totalDibayar === AUDIT_CONSTANTS.TOTAL_DIBAYAR_TANAH &&
    totalSisa === AUDIT_CONSTANTS.TOTAL_UTANG_TANAH;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><LandPlot size={24} className="text-blue-500" />Register Pembebasan Tanah</h1>
          <p className="mt-1 text-gray-500">Nilai kontrak dihitung dari luas × harga satuan, kecuali nilai kesepakatan langsung untuk bidang tanpa luas. Bukti hukum dan pembayaran dicatat terpisah.</p>
        </div>
        <button onClick={beginNew} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"><Plus size={18} />Tambah Bidang</button>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Bidang</p><p className="mt-1 text-xl font-bold">{state.tanah.length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Total luas</p><p className="mt-1 text-xl font-bold">{totalLuas.toLocaleString('id-ID', { maximumFractionDigits: 3 })} BT</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Nilai kesepakatan</p><p className="mt-1 text-xl font-bold text-blue-700">{formatRupiah(totalNilai)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Dibayar tercatat</p><p className="mt-1 text-xl font-bold text-emerald-700">{formatRupiah(totalDibayar)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Sisa kewajiban</p><p className="mt-1 text-xl font-bold text-red-700">{formatRupiah(totalSisa)}</p></div>
      </div>

      <div className={`rounded-xl border p-4 ${referenceMatches ? 'border-emerald-200 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
        <div className="flex items-start gap-2">
          {referenceMatches ? <CheckCircle size={18} className="mt-0.5 text-emerald-700" /> : <AlertTriangle size={18} className="mt-0.5 text-amber-700" />}
          <div>
            <p className="font-semibold">{referenceMatches ? 'Rumus sesuai nilai pembanding laporan lama' : 'Perlu rekonsiliasi terhadap nilai pembanding laporan lama'}</p>
            <p className="mt-1 text-sm">Nilai terhitung {formatRupiah(totalNilai)} · Dibayar {formatRupiah(totalDibayar)} · Sisa {formatRupiah(totalSisa)}. Selisih pembanding bukan tanda bukti asli telah diverifikasi.</p>
            <p className="mt-1 text-xs text-gray-600">Pembanding manual: nilai {formatRupiah(AUDIT_CONSTANTS.TOTAL_NILAI_TANAH)}, dibayar {formatRupiah(AUDIT_CONSTANTS.TOTAL_DIBAYAR_TANAH)}, sisa {formatRupiah(AUDIT_CONSTANTS.TOTAL_UTANG_TANAH)}.</p>
            {totalKelebihanBayar > 0 && <p className="mt-1 text-sm font-medium text-red-700">Ada potensi kelebihan bayar {formatRupiah(totalKelebihanBayar)}. Periksa bukti dan nilai kontraknya.</p>}
            <p className="mt-1 text-xs text-amber-800">Bidang tanpa dokumen hukum/pembayaran terhubung: {withoutEvidence}. Tambahkan akta/perjanjian/sertifikat/PBB dan bukti pembayaran dari menu Arsip Bukti.</p>
          </div>
        </div>
      </div>

      {showForm && (
        <section className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Data Bidang' : 'Tambah Data Bidang'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">Nama penjual/pemilik *
              <input value={form.pemilik} onChange={e => update('pemilik', e.target.value)} placeholder="Nama sesuai dokumen" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Luas (BT)
              <input type="number" min="0" step="any" value={form.luas_bt || ''} onChange={e => update('luas_bt', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Harga per BT (Rp)
              <input type="number" min="0" step="any" value={form.harga_per_bt || ''} onChange={e => update('harga_per_bt', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Nilai kesepakatan langsung (Rp)
              <input type="number" min="0" step="any" value={manualTotalInput} onChange={e => setManualTotalInput(e.target.value)} placeholder="Hanya bila luas/harga tidak tersedia" className="mt-1 w-full rounded-lg border px-3 py-2" />
              <span className="mt-1 block text-xs font-normal text-gray-500">Jangan isi bila nilai seharusnya dihitung dari luas × harga/BT.</span>
            </label>
            <label className="text-sm font-medium text-gray-700">Total sudah dibayar (Rp) *
              <input type="number" min="0" step="any" value={form.dp || ''} onChange={e => update('dp', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Kode referensi bukti
              <input value={form.kode_bukti} onChange={e => update('kode_bukti', e.target.value)} placeholder="Kode kuitansi/transfer" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2">URL Drive dokumen atau bukti pembayaran
              <input type="url" value={form.url_bukti} onChange={e => update('url_bukti', e.target.value)} placeholder="Tautan ke dokumen asli (opsional)" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700 md:col-span-3">Catatan / batas tanah / nomor bidang
              <textarea value={form.catatan} onChange={e => update('catatan', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <p>Nilai kesepakatan terhitung: <strong>{formatRupiah((manualTotalInput.trim() && Number(manualTotalInput) > 0 && form.luas_bt === 0 && form.harga_per_bt === 0) ? Number(manualTotalInput) : Math.max(0, form.luas_bt) * Math.max(0, form.harga_per_bt))}</strong></p>
            <p>Sisa sesudah pembayaran: <strong>{formatRupiah(Math.max(0, ((manualTotalInput.trim() && Number(manualTotalInput) > 0 && form.luas_bt === 0 && form.harga_per_bt === 0) ? Number(manualTotalInput) : Math.max(0, form.luas_bt) * Math.max(0, form.harga_per_bt)) - Math.max(0, form.dp))}</strong></p>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={saveLand} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"><Save size={17} />Simpan</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Batal</button></div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Daftar bidang tanah ({state.tanah.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="border-b bg-gray-50"><tr>
              <th className="px-3 py-3 text-left">Bidang</th><th className="px-3 py-3 text-left">Penjual</th><th className="px-3 py-3 text-right">Luas</th><th className="px-3 py-3 text-right">Harga/BT</th><th className="px-3 py-3 text-right">Nilai kontrak</th><th className="px-3 py-3 text-right">Dibayar</th><th className="px-3 py-3 text-right">Sisa</th><th className="px-3 py-3 text-left">Status formula</th><th className="px-3 py-3 text-center">Dokumen</th><th className="px-3 py-3 text-right">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {state.tanah.map(item => {
                const value = getTanahNilaiTotal(item);
                const remaining = getTanahSisa(item);
                const overpaid = getTanahKelebihanBayar(item);
                const docs = getRelatedDocuments(state.arsipBukti, 'Tanah', item.id, item.kode_bukti);
                const proofCount = docs.filter(doc => hasDocumentEvidence(doc) && doc.terverifikasi === 'Ya').length;
                const status = paymentStatus(item);
                return <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs">{item.id}</td><td className="px-3 py-3 font-medium">{item.pemilik}</td><td className="px-3 py-3 text-right">{item.luas_bt > 0 ? item.luas_bt.toLocaleString('id-ID') + ' BT' : '—'}</td><td className="px-3 py-3 text-right">{item.harga_per_bt > 0 ? formatRupiah(item.harga_per_bt) : '—'}</td><td className="px-3 py-3 text-right font-semibold">{value > 0 ? formatRupiah(value) : 'Belum diketahui'}</td><td className="px-3 py-3 text-right text-emerald-700">{formatRupiah(item.dp)}</td><td className="px-3 py-3 text-right font-bold text-red-700">{formatRupiah(remaining)}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${overpaid > 0 ? 'bg-red-100 text-red-800' : remaining === 0 ? 'bg-emerald-100 text-emerald-800' : item.dp > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{status}</span>{overpaid > 0 && <p className="mt-1 text-xs text-red-600">Lebih bayar {formatRupiah(overpaid)}</p>}</td><td className="px-3 py-3 text-center">{proofCount > 0 ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><FileText size={14} />{proofCount}</span> : <span className="text-xs text-red-600">Belum terhubung</span>}</td><td className="px-3 py-3 text-right"><button onClick={() => beginEdit(item)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button>{docs.map(doc => doc.link_drive && <a key={doc.id} href={doc.link_drive} target="_blank" rel="noreferrer" className="ml-1 inline-flex rounded border p-1 text-blue-700" title="Buka dokumen"><ExternalLink size={13} /></a>)}</td>
                </tr>;
              })}
            </tbody>
            <tfoot className="border-t-2 bg-gray-50"><tr><td colSpan={2} className="px-3 py-3 font-bold">TOTAL</td><td className="px-3 py-3 text-right font-bold">{totalLuas.toLocaleString('id-ID')}</td><td></td><td className="px-3 py-3 text-right font-bold">{formatRupiah(totalNilai)}</td><td className="px-3 py-3 text-right font-bold text-emerald-700">{formatRupiah(totalDibayar)}</td><td className="px-3 py-3 text-right font-bold text-red-700">{formatRupiah(totalSisa)}</td><td colSpan={3}></td></tr></tfoot>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Rekap per penjual</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Penjual</th><th className="px-4 py-3 text-right">Luas</th><th className="px-4 py-3 text-right">Nilai</th><th className="px-4 py-3 text-right">Dibayar</th><th className="px-4 py-3 text-right">Sisa</th><th className="px-4 py-3 text-right">Kelebihan bayar</th></tr></thead><tbody className="divide-y">{Object.entries(rekapPenjual).map(([name, value]) => <tr key={name}><td className="px-4 py-3 font-medium">{name}</td><td className="px-4 py-3 text-right">{value.luas.toLocaleString('id-ID')}</td><td className="px-4 py-3 text-right">{formatRupiah(value.nilai)}</td><td className="px-4 py-3 text-right">{formatRupiah(value.dibayar)}</td><td className="px-4 py-3 text-right text-red-700">{formatRupiah(value.sisa)}</td><td className="px-4 py-3 text-right">{formatRupiah(value.kelebihan)}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
