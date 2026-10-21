import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, getLocalDateISO } from '../data';
import { getBukuKasVerificationStatus, getRelatedDocuments, hasDocumentEvidence } from '../helpers';
import type { BukuKas } from '../types';
import { BookOpen, CheckCircle, XCircle, AlertCircle, Plus, Pencil, Save, X, ExternalLink } from 'lucide-react';

type CashDirection = 'Masuk' | 'Keluar';
const emptyForm = {
  tgl: getLocalDateISO(),
  no_ref: '',
  kode_bukti: '',
  keterangan: '',
  kategori: 'Operasional' as BukuKas['kategori'],
  proyek: 'Site A',
  arah: 'Keluar' as CashDirection,
  nominal: '',
};

const categories: BukuKas['kategori'][] = ['Pembebasan_Tanah', 'Cut_Fill', 'Operasional', 'Marketing', 'Lainnya'];

export default function BukuKasPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const totalMasuk = state.bukuKas.reduce((sum, item) => sum + Math.max(0, item.masuk), 0);
  const totalKeluar = state.bukuKas.reduce((sum, item) => sum + Math.max(0, item.keluar), 0);
  const saldoCatatan = totalMasuk - totalKeluar;

  const orderedRecords = useMemo(() => state.bukuKas.slice().sort((a, b) =>
    a.tgl.localeCompare(b.tgl) || a.id.localeCompare(b.id)
  ), [state.bukuKas]);

  const runningBalances = useMemo(() => {
    let running = 0;
    const result: Record<string, number> = {};
    for (const item of orderedRecords) {
      running += (Number(item.masuk) || 0) - (Number(item.keluar) || 0);
      result[item.id] = running;
    }
    return result;
  }, [orderedRecords]);

  const missingEvidence = state.bukuKas.filter(item =>
    getBukuKasVerificationStatus(item, state.arsipBukti) !== 'LENGKAP'
  ).length;

  const updateForm = <K extends keyof typeof emptyForm>(key: K, value: typeof emptyForm[K]) => {
    setForm(old => ({ ...old, [key]: value }));
  };

  const beginNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, tgl: getLocalDateISO(), no_ref: 'KAS-' + getLocalDateISO().replace(/-/g, '') + '-' + String(state.bukuKas.length + 1).padStart(3, '0') });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const beginEdit = (item: BukuKas) => {
    setEditingId(item.id);
    setForm({
      tgl: item.tgl,
      no_ref: item.no_ref,
      kode_bukti: item.kode_bukti || '',
      keterangan: item.keterangan,
      kategori: item.kategori,
      proyek: item.proyek || '',
      arah: item.masuk > 0 ? 'Masuk' : 'Keluar',
      nominal: String(item.masuk > 0 ? item.masuk : item.keluar),
    });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const saveTransaction = () => {
    setError('');
    setMessage('');
    const nominal = Number(form.nominal);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.tgl)) {
      setError('Tanggal transaksi wajib diisi.');
      return;
    }
    if (!form.no_ref.trim()) {
      setError('Nomor referensi wajib diisi agar transaksi mudah ditelusuri.');
      return;
    }
    if (!form.keterangan.trim()) {
      setError('Keterangan transaksi wajib diisi.');
      return;
    }
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setError('Nominal harus angka lebih besar dari nol.');
      return;
    }
    const record: BukuKas = {
      id: editingId || 'KAS-' + Date.now().toString(36).toUpperCase(),
      tgl: form.tgl,
      no_ref: form.no_ref.trim(),
      kode_bukti: form.kode_bukti.trim(),
      keterangan: form.keterangan.trim(),
      kategori: form.kategori,
      proyek: form.proyek.trim(),
      masuk: form.arah === 'Masuk' ? nominal : 0,
      keluar: form.arah === 'Keluar' ? nominal : 0,
      status_verifikasi: 'PERLU_KONFIRMASI',
    };
    if (editingId) dispatch({ type: 'UPDATE_BUKU_KAS', payload: record });
    else dispatch({ type: 'ADD_BUKU_KAS', payload: record });
    setShowForm(false);
    setEditingId(null);
    setMessage(editingId
      ? 'Transaksi diperbarui. Status bukti ditentukan dari dokumen yang terhubung.'
      : 'Transaksi dicatat. Transaksi baru tidak dianggap memiliki bukti sampai file/tautan diperiksa pada Arsip Bukti.');
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'LENGKAP': return <CheckCircle size={14} className="text-emerald-600" />;
      case 'TANPA_BUKTI': return <XCircle size={14} className="text-red-600" />;
      default: return <AlertCircle size={14} className="text-amber-600" />;
    }
  };
  const statusClass = (status: string) => {
    switch (status) {
      case 'LENGKAP': return 'bg-emerald-100 text-emerald-800';
      case 'TANPA_BUKTI': return 'bg-red-100 text-red-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };
  const statusText = (status: string) => status === 'LENGKAP'
    ? 'Bukti terverifikasi'
    : status === 'TANPA_BUKTI' ? 'Belum ada bukti' : 'Menunggu konfirmasi';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><BookOpen size={24} className="text-indigo-500" />Buku Kas — Catatan Transaksi</h1>
          <p className="mt-1 text-gray-500">Saldo dihitung dari transaksi input; status bukti dihitung dari lampiran yang terhubung, bukan dari label manual.</p>
        </div>
        <button onClick={beginNew} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"><Plus size={18} />Tambah Transaksi</button>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Saldo catatan, bukan verifikasi saldo bank/kas fisik</p>
        <p className="mt-1">Transaksi lama dipertahankan sebagai rekap input. Baris yang tidak memiliki dokumen asli tertaut akan terlihat belum memiliki bukti. Perubahan kas tidak otomatis membuat jurnal akuntansi pada modul Akuntansi—kedua modul belum memakai satu database cloud bersama.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Total uang masuk tercatat</p><p className="mt-1 text-xl font-bold text-emerald-700">{formatRupiah(totalMasuk)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Total uang keluar tercatat</p><p className="mt-1 text-xl font-bold text-red-700">{formatRupiah(totalKeluar)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Saldo catatan</p><p className="mt-1 text-xl font-bold text-indigo-700">{formatRupiah(saldoCatatan)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Transaksi belum punya bukti lengkap</p><p className="mt-1 text-xl font-bold text-amber-700">{missingEvidence} / {state.bukuKas.length}</p></div>
      </div>

      {showForm && (
        <section className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Transaksi Kas' : 'Tambah Transaksi Kas'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">Tanggal *
              <input type="date" value={form.tgl} onChange={e => updateForm('tgl', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Nomor referensi *
              <input value={form.no_ref} onChange={e => updateForm('no_ref', e.target.value)} placeholder="Nomor transaksi / bukti" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Kode bukti
              <input value={form.kode_bukti} onChange={e => updateForm('kode_bukti', e.target.value)} placeholder="Isi sama dengan kode pada Arsip Bukti" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2">Keterangan *
              <input value={form.keterangan} onChange={e => updateForm('keterangan', e.target.value)} placeholder="Misalnya pembayaran cut & fill tahap 3" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Kategori
              <select value={form.kategori} onChange={e => updateForm('kategori', e.target.value as BukuKas['kategori'])} className="mt-1 w-full rounded-lg border px-3 py-2">{categories.map(category => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}</select>
            </label>
            <label className="text-sm font-medium text-gray-700">Proyek / lokasi
              <input value={form.proyek} onChange={e => updateForm('proyek', e.target.value)} placeholder="Nama proyek/site" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Jenis arus
              <select value={form.arah} onChange={e => updateForm('arah', e.target.value as CashDirection)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="Masuk">Kas masuk</option><option value="Keluar">Kas keluar</option></select>
            </label>
            <label className="text-sm font-medium text-gray-700">Nominal (Rp) *
              <input type="number" min="1" step="1" value={form.nominal} onChange={e => updateForm('nominal', e.target.value)} placeholder="0" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
          <div className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
            <p>Nominal masuk: <strong>{formatRupiah(form.arah === 'Masuk' ? Number(form.nominal || 0) : 0)}</strong></p>
            <p>Nominal keluar: <strong>{formatRupiah(form.arah === 'Keluar' ? Number(form.nominal || 0) : 0)}</strong></p>
            <p className="mt-1 text-xs">Setelah menyimpan, buka Arsip Bukti untuk melampirkan kuitansi, transfer, nota atau dokumen pendukung dan hubungkan ke ID transaksi ini.</p>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={saveTransaction} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"><Save size={17} />Simpan</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Batal</button></div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Daftar transaksi kas ({orderedRecords.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="border-b bg-gray-50"><tr><th className="px-3 py-3 text-left">Tanggal</th><th className="px-3 py-3 text-left">Referensi / keterangan</th><th className="px-3 py-3 text-left">Kategori / proyek</th><th className="px-3 py-3 text-right">Masuk</th><th className="px-3 py-3 text-right">Keluar</th><th className="px-3 py-3 text-right">Saldo berjalan</th><th className="px-3 py-3 text-center">Bukti</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y">
              {orderedRecords.map(item => {
                const verification = getBukuKasVerificationStatus(item, state.arsipBukti);
                const linked = getRelatedDocuments(state.arsipBukti, 'Buku Kas', item.id, item.kode_bukti);
                const backingFiles = linked.filter(doc => hasDocumentEvidence(doc));
                return <tr key={item.id} className="align-top hover:bg-gray-50">
                  <td className="px-3 py-3 text-xs text-gray-600">{item.tgl}<p className="mt-1 font-mono">{item.id}</p></td>
                  <td className="px-3 py-3"><p className="font-medium text-gray-900">{item.keterangan}</p><p className="mt-1 text-xs text-gray-500">{item.no_ref}{item.kode_bukti ? ' · Bukti '+item.kode_bukti : ' · Kode bukti kosong'}</p></td>
                  <td className="px-3 py-3"><p>{item.kategori.replace(/_/g, ' ')}</p><p className="mt-1 text-xs text-gray-500">{item.proyek || 'Proyek belum diisi'}</p></td>
                  <td className="px-3 py-3 text-right font-medium text-emerald-700">{item.masuk > 0 ? formatRupiah(item.masuk) : '—'}</td><td className="px-3 py-3 text-right font-medium text-red-700">{item.keluar > 0 ? formatRupiah(item.keluar) : '—'}</td><td className="px-3 py-3 text-right font-semibold">{formatRupiah(runningBalances[item.id] || 0)}</td>
                  <td className="px-3 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusClass(verification)}`}>{statusIcon(verification)}{statusText(verification)}</span>{backingFiles.map(doc => <p key={doc.id} className="mt-1">{doc.link_drive ? <a href={doc.link_drive} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 underline"><FileText size={12} />Buka bukti</a> : <span className="text-xs text-gray-500">File lokal: {doc.nama_file || doc.kode_bukti}</span>}</p>)}</td>
                  <td className="px-3 py-3 text-right"><button onClick={() => beginEdit(item)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button>{linked.map(doc => doc.link_drive && <a key={doc.id} href={doc.link_drive} target="_blank" rel="noreferrer" className="ml-1 inline-flex rounded border p-1 text-blue-700"><ExternalLink size={13} /></a>)}</td>
                </tr>;
              })}
              {orderedRecords.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Belum ada transaksi. Tambahkan transaksi pertama di atas.</td></tr>}
            </tbody>
            <tfoot className="border-t-2 bg-gray-50"><tr><td colSpan={3} className="px-3 py-3 font-bold">TOTAL</td><td className="px-3 py-3 text-right font-bold text-emerald-700">{formatRupiah(totalMasuk)}</td><td className="px-3 py-3 text-right font-bold text-red-700">{formatRupiah(totalKeluar)}</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(saldoCatatan)}</td><td colSpan={2}></td></tr></tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
