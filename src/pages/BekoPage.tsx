import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getBekoNilai, getBekoVolume, getRelatedDocuments, hasDocumentEvidence } from '../helpers';
import type { Beko } from '../types';
import { Truck, AlertTriangle, FileText, Plus, Pencil, Save, X, ExternalLink } from 'lucide-react';

const emptyBeko: Omit<Beko, 'id'> = {
  item: '',
  panjang: 0,
  lebar: 0,
  tinggi: 0,
  tarif: 0,
  status: 'Belum_Ada_Kwitansi',
  status_pembayaran: 'Belum_Dikonfirmasi',
  kode_bukti: '',
  url_bukti: '',
  catatan: '',
  termasuk_rekap: true,
  satuan_volume: 'm3',
};

const evidenceKinds = new Set(['Kwitansi_Foto', 'Transfer_Bank', 'Nota_Foto', 'Invoice_Faktur', 'BAST', 'Progress_Pekerjaan']);

export default function BekoPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Beko, 'id'>>(emptyBeko);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const itemMasuk = state.beko.filter(item => item.termasuk_rekap !== false);
  const itemDiLuar = state.beko.filter(item => item.termasuk_rekap === false);
  const totalBiayaBeko = itemMasuk.reduce((sum, item) => sum + getBekoNilai(item), 0);
  const totalDiLuar = itemDiLuar.reduce((sum, item) => sum + getBekoNilai(item), 0);
  const mobilisasi = itemMasuk.filter(item => item.satuan_volume === 'ls' || item.satuan_volume === 'unit').reduce((sum, item) => sum + getBekoNilai(item), 0);
  const kubikasi = itemMasuk.filter(item => item.satuan_volume === 'm3').reduce((sum, item) => sum + getBekoNilai(item), 0);

  const evidenceByItem = useMemo(() => {
    const result: Record<string, { count: number; verified: number; links: string[] }> = {};
    for (const item of state.beko) {
      const linked = getRelatedDocuments(state.arsipBukti, 'Beko', item.id, item.kode_bukti);
      const usable = linked.filter(doc => hasDocumentEvidence(doc) && doc.jenis !== 'Tidak_Ada');
      result[item.id] = {
        count: usable.length,
        verified: usable.filter(doc => doc.terverifikasi === 'Ya' && evidenceKinds.has(doc.jenis)).length,
        links: usable.map(doc => doc.link_drive).filter(Boolean),
      };
    }
    return result;
  }, [state.beko, state.arsipBukti]);

  const biayaDenganBukti = itemMasuk
    .filter(item => (evidenceByItem[item.id]?.verified || 0) > 0)
    .reduce((sum, item) => sum + getBekoNilai(item), 0);
  const biayaPerluBukti = totalBiayaBeko - biayaDenganBukti;
  const tahapBelumDidukung = state.arsipBukti.filter(doc =>
    doc.modul_terkait === 'Beko' && doc.jenis === 'Tidak_Ada'
  );
  const nilaiRekapBelumDidukung = tahapBelumDidukung.reduce((sum, doc) => sum + (Number(doc.nominal) || 0), 0);

  const update = <K extends keyof Omit<Beko, 'id'>>(key: K, value: Omit<Beko, 'id'>[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const beginNew = () => {
    setEditingId(null);
    setForm({ ...emptyBeko });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const beginEdit = (item: Beko) => {
    const { id, ...record } = item;
    setEditingId(id);
    setForm({
      ...emptyBeko,
      ...record,
      status_pembayaran: item.status_pembayaran || (item.status === 'Lunas' ? 'Lunas' : 'Belum_Dikonfirmasi'),
      termasuk_rekap: item.termasuk_rekap !== false,
      satuan_volume: item.satuan_volume || (item.panjang === 0 && item.lebar === 0 && item.tinggi === 0 ? 'ls' : 'm3'),
    });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const saveItem = () => {
    setError('');
    setMessage('');
    const item = form.item.trim();
    const values = [form.panjang, form.lebar, form.tinggi, form.tarif];
    if (!item) {
      setError('Uraian pekerjaan wajib diisi.');
      return;
    }
    if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) {
      setError('Panjang, lebar, tinggi, dan tarif harus angka nol atau lebih.');
      return;
    }
    if (form.satuan_volume === 'm3' && (form.panjang <= 0 || form.lebar <= 0 || form.tinggi <= 0)) {
      setError('Pekerjaan satuan m³ wajib mengisi panjang, lebar, dan tinggi lebih dari nol.');
      return;
    }
    if (form.tarif <= 0) {
      setError('Tarif wajib lebih besar dari nol. Untuk mobilisasi/lumpsum, pilih satuan LS lalu masukkan nominal total.');
      return;
    }
    if (form.url_bukti.trim() && !/^https?:\/\//i.test(form.url_bukti.trim())) {
      setError('Tautan bukti harus berupa URL HTTP/HTTPS lengkap.');
      return;
    }

    const record: Beko = {
      ...form,
      id: editingId || 'BK-' + Date.now().toString(36).toUpperCase(),
      item,
      kode_bukti: form.kode_bukti.trim(),
      url_bukti: form.url_bukti.trim(),
      catatan: form.catatan.trim(),
      status: form.status_pembayaran === 'Lunas' ? 'Lunas' : 'Belum_Ada_Kwitansi',
    };
    if (editingId) dispatch({ type: 'UPDATE_BEKO', payload: record });
    else dispatch({ type: 'ADD_BEKO', payload: record });
    setShowForm(false);
    setMessage(editingId ? 'Rincian pekerjaan diperbarui; nilai dihitung ulang dari input.' : 'Rincian pekerjaan ditambahkan; nilai dihitung dari input.');
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Truck size={24} className="text-orange-500" />Rincian Pekerjaan Tanah / Beko</h1>
          <p className="mt-1 text-gray-500">Volume dan nilai mengikuti panjang × lebar × tinggi × tarif; untuk LS/unit nilai = tarif. Bukti pembayaran dinilai terpisah.</p>
        </div>
        <button onClick={beginNew} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"><Plus size={18} />Tambah Pekerjaan</button>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Data biaya ≠ bukti pembayaran</p>
        <p className="mt-1">Status “Lunas” atau kode KW tidak dianggap sebagai kuitansi. Bukti hanya dihitung bila ada file/tautan yang terhubung ke ID pekerjaan dan telah ditandai diperiksa. Rekap tahap lama yang tidak memiliki file tetap dihitung sebagai catatan belum terverifikasi, bukan dana masuk/kuitansi.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Total lingkup rekap</p><p className="mt-1 text-xl font-bold text-orange-600">{formatRupiah(totalBiayaBeko)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Di luar lingkup rekap</p><p className="mt-1 text-xl font-bold">{formatRupiah(totalDiLuar)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Biaya dengan dokumen terverifikasi manual</p><p className="mt-1 text-xl font-bold text-emerald-700">{formatRupiah(biayaDenganBukti)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Biaya belum didukung bukti</p><p className="mt-1 text-xl font-bold text-red-600">{formatRupiah(biayaPerluBukti)}</p></div>
      </div>

      {showForm && (
        <section className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Rincian Pekerjaan' : 'Tambah Rincian Pekerjaan'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-gray-700 md:col-span-2">Uraian pekerjaan *
              <input value={form.item} onChange={e => update('item', e.target.value)} placeholder="Contoh: Cut & fill area blok A" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Satuan / metode hitung
              <select value={form.satuan_volume} onChange={e => update('satuan_volume', e.target.value as Beko['satuan_volume'])} className="mt-1 w-full rounded-lg border px-3 py-2">
                <option value="m3">m³ (P × L × T)</option><option value="unit">Unit</option><option value="ls">Lumpsum (LS)</option>
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">Tarif / nominal satuan (Rp) *
              <input type="number" min="0" step="any" value={form.tarif || ''} onChange={e => update('tarif', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            {form.satuan_volume === 'm3' && <><label className="text-sm font-medium text-gray-700">Panjang (m) *<input type="number" min="0" step="any" value={form.panjang || ''} onChange={e => update('panjang', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="text-sm font-medium text-gray-700">Lebar (m) *<input type="number" min="0" step="any" value={form.lebar || ''} onChange={e => update('lebar', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="text-sm font-medium text-gray-700">Tinggi (m) *<input type="number" min="0" step="any" value={form.tinggi || ''} onChange={e => update('tinggi', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label></>}
            <label className="text-sm font-medium text-gray-700">Status pembayaran
              <select value={form.status_pembayaran || 'Belum_Dikonfirmasi'} onChange={e => update('status_pembayaran', e.target.value as Beko['status_pembayaran'])} className="mt-1 w-full rounded-lg border px-3 py-2">
                <option value="Belum_Dikonfirmasi">Belum dikonfirmasi</option><option value="Belum_Bayar">Belum bayar</option><option value="DP">DP / sebagian</option><option value="Lunas">Lunas (menurut catatan)</option>
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">Masuk lingkup rekap?
              <select value={form.termasuk_rekap === false ? 'no' : 'yes'} onChange={e => update('termasuk_rekap', e.target.value === 'yes')} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="yes">Ya</option><option value="no">Tidak / di luar scope</option></select>
            </label>
            <label className="text-sm font-medium text-gray-700">Kode bukti (referensi)
              <input value={form.kode_bukti} onChange={e => update('kode_bukti', e.target.value)} placeholder="Nomor pada bukti asli" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">URL Drive / bukti
              <input type="url" value={form.url_bukti} onChange={e => update('url_bukti', e.target.value)} placeholder="URL bukti asli (jika ada)" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-4">Catatan
              <textarea value={form.catatan} onChange={e => update('catatan', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
          <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
            <p>Volume terhitung: <strong>{form.satuan_volume === 'm3' ? getBekoVolume(form as Beko).toLocaleString('id-ID', { maximumFractionDigits: 3 }) + ' m³' : '1 ' + (form.satuan_volume === 'ls' ? 'LS' : 'unit')}</strong></p>
            <p>Nilai terhitung otomatis: <strong>{formatRupiah(getBekoNilai(form as Beko))}</strong></p>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={saveItem} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"><Save size={17} />Simpan</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Batal</button></div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Daftar rincian biaya ({state.beko.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="border-b bg-gray-50"><tr>
              <th className="px-3 py-3 text-left">Pekerjaan</th><th className="px-3 py-3 text-right">P</th><th className="px-3 py-3 text-right">L</th><th className="px-3 py-3 text-right">T</th><th className="px-3 py-3 text-right">Volume</th><th className="px-3 py-3 text-right">Tarif</th><th className="px-3 py-3 text-right">Nilai formula</th><th className="px-3 py-3 text-center">Rekap</th><th className="px-3 py-3 text-center">Pembayaran</th><th className="px-3 py-3 text-center">Bukti</th><th className="px-3 py-3 text-right">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {state.beko.map(item => {
                const volume = getBekoVolume(item);
                const inside = item.termasuk_rekap !== false;
                const linked = getRelatedDocuments(state.arsipBukti, 'Beko', item.id, item.kode_bukti);
                const validEvidence = linked.filter(doc => hasDocumentEvidence(doc) && doc.jenis !== 'Tidak_Ada');
                const verified = validEvidence.some(doc => doc.terverifikasi === 'Ya' && evidenceKinds.has(doc.jenis));
                return <tr key={item.id} className={inside ? 'hover:bg-gray-50' : 'bg-gray-50 text-gray-500'}>
                  <td className="px-3 py-3"><p className="font-medium text-gray-900">{item.item}</p><p className="text-xs text-gray-500">{item.id} {item.catatan && '· ' + item.catatan}</p></td>
                  <td className="px-3 py-3 text-right">{item.satuan_volume === 'm3' ? item.panjang : '—'}</td><td className="px-3 py-3 text-right">{item.satuan_volume === 'm3' ? item.lebar : '—'}</td><td className="px-3 py-3 text-right">{item.satuan_volume === 'm3' ? item.tinggi : '—'}</td>
                  <td className="px-3 py-3 text-right">{item.satuan_volume === 'm3' ? volume.toLocaleString('id-ID', { maximumFractionDigits: 3 }) + ' m³' : '1 ' + (item.satuan_volume === 'ls' ? 'LS' : 'unit')}</td>
                  <td className="px-3 py-3 text-right">{formatRupiah(item.tarif)}</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(getBekoNilai(item))}</td>
                  <td className="px-3 py-3 text-center">{inside ? 'Ya' : 'Tidak'}</td>
                  <td className="px-3 py-3 text-center">{item.status_pembayaran || (item.status === 'Lunas' ? 'Lunas (catatan lama)' : 'Belum dikonfirmasi')}</td>
                  <td className="px-3 py-3 text-center">
                    {verified ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Diverifikasi</span> : <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">{validEvidence.length ? 'Menunggu review' : 'Belum ada file'}</span>}
                    {validEvidence.map(doc => <div key={doc.id}>{doc.link_drive && <a href={doc.link_drive} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700 underline"><ExternalLink size={12} />Buka</a>}</div>)}
                  </td>
                  <td className="px-3 py-3 text-right"><button onClick={() => beginEdit(item)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button></td>
                </tr>;
              })}
            </tbody>
            <tfoot className="border-t-2 bg-gray-50">
              <tr><td colSpan={6} className="px-3 py-3 font-bold">Total lingkup rekap</td><td className="px-3 py-3 text-right font-bold text-orange-700">{formatRupiah(totalBiayaBeko)}</td><td colSpan={4}></td></tr>
              <tr><td colSpan={6} className="px-3 py-3 font-bold">Total di luar lingkup</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(totalDiLuar)}</td><td colSpan={4}></td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Breakdown biaya dari rumus</h3><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>LS / unit</span><strong>{formatRupiah(mobilisasi)}</strong></div><div className="flex justify-between"><span>Volume m³</span><strong>{formatRupiah(kubikasi)}</strong></div><div className="flex justify-between border-t pt-2"><span>Total</span><strong>{formatRupiah(mobilisasi + kubikasi)}</strong></div></div></section>
        <section className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Rekap tahap lama (bukan bukti asli)</h3><p className="mt-1 text-xs text-gray-500">Nominal berikut berasal dari catatan lama. Tanpa file/URL kuitansi, nilainya tidak dianggap bukti pembayaran terverifikasi.</p><div className="mt-3 space-y-2 text-sm">{tahapBelumDidukung.map(doc => <div key={doc.id} className="flex justify-between gap-3"><span>{doc.judul_dokumen || doc.catatan_audit}</span><strong>{formatRupiah(doc.nominal)}</strong></div>)}<div className="flex justify-between border-t pt-2"><span>Total rekap tanpa bukti</span><strong className="text-amber-700">{formatRupiah(nilaiRekapBelumDidukung)}</strong></div><div className="flex justify-between"><span>Biaya belum didukung bukti</span><strong className="text-red-700">{formatRupiah(biayaPerluBukti)}</strong></div></div></section>
      </div>
    </div>
  );
}
