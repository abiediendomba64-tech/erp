import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, getLocalDateISO } from '../data';
import { getBukuKasVerificationStatus } from '../helpers';
import type { Anggaran, BukuKas } from '../types';
import { Wallet, Plus, Pencil, Save, X, Download, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

const budgetCategories: BukuKas['kategori'][] = [
  'Pembebasan_Tanah', 'Cut_Fill', 'Operasional', 'Marketing', 'Lainnya'
];

type BudgetForm = {
  kategori: BukuKas['kategori'];
  anggaran: string;
  periode: string;
  proyek: string;
  catatan: string;
};

const emptyForm = (): BudgetForm => ({
  kategori: 'Operasional',
  anggaran: '',
  periode: getLocalDateISO().slice(0, 7),
  proyek: '',
  catatan: '',
});

function isMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

function displayCategory(category: string): string {
  return category.replace(/_/g, ' ');
}

export default function AnggaranPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetForm>(emptyForm());
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const deriveRealization = (budget: Pick<Anggaran, 'kategori' | 'periode' | 'proyek'>) =>
    state.bukuKas
      .filter(row =>
        row.tgl.slice(0, 7) === budget.periode &&
        row.kategori === budget.kategori &&
        row.keluar > 0 &&
        (!budget.proyek?.trim() || row.proyek.trim().toLowerCase() === budget.proyek.trim().toLowerCase())
      )
      .reduce((sum, row) => sum + Math.max(0, Number(row.keluar) || 0), 0);

  const budgetRows = useMemo(() => state.anggaran
    .map(budget => {
      const realisasi = deriveRealization(budget);
      const sisa = budget.anggaran - realisasi;
      const persentase = budget.anggaran > 0 ? (realisasi / budget.anggaran) * 100 : 0;
      const sourceRows = state.bukuKas.filter(row =>
        row.tgl.slice(0, 7) === budget.periode &&
        row.kategori === budget.kategori &&
        row.keluar > 0 &&
        (!budget.proyek?.trim() || row.proyek.trim().toLowerCase() === budget.proyek.trim().toLowerCase())
      );
      const missingEvidence = sourceRows.filter(row => getBukuKasVerificationStatus(row, state.arsipBukti) !== 'LENGKAP').length;
      return { budget, realisasi, sisa, persentase, sourceRows: sourceRows.length, missingEvidence };
    })
    .filter(row => {
      const text = [row.budget.kategori, row.budget.proyek, row.budget.periode, row.budget.catatan].filter(Boolean).join(' ').toLowerCase();
      return text.includes(search.trim().toLowerCase()) &&
        (!periodFilter || row.budget.periode === periodFilter);
    })
    .sort((a, b) => b.budget.periode.localeCompare(a.budget.periode) ||
      a.budget.kategori.localeCompare(b.budget.kategori) ||
      (a.budget.proyek || '').localeCompare(b.budget.proyek || '')),
  [state.anggaran, state.bukuKas, state.arsipBukti, search, periodFilter]);

  const totalBudget = budgetRows.reduce((sum, row) => sum + row.budget.anggaran, 0);
  const uniqueMatchingCashOutflows = state.bukuKas.filter(cashRow =>
    cashRow.keluar > 0 &&
    budgetRows.some(({ budget }) =>
      budget.periode === cashRow.tgl.slice(0, 7) &&
      budget.kategori === cashRow.kategori &&
      (!budget.proyek?.trim() || budget.proyek.trim().toLowerCase() === cashRow.proyek.trim().toLowerCase())
    )
  );
  const totalRealization = uniqueMatchingCashOutflows.reduce((sum, row) => sum + Math.max(0, Number(row.keluar) || 0), 0);
  const overBudgetRows = budgetRows.filter(row => row.sisa < 0).length;
  const rowsWithoutEvidence = uniqueMatchingCashOutflows.filter(row => getBukuKasVerificationStatus(row, state.arsipBukti) !== 'LENGKAP').length;
  const unallocatedOutflow = state.bukuKas.filter(cashRow =>
    cashRow.keluar > 0 &&
    (!periodFilter || cashRow.tgl.slice(0, 7) === periodFilter) &&
    !state.anggaran.some(budget =>
      budget.periode === cashRow.tgl.slice(0, 7) &&
      budget.kategori === cashRow.kategori &&
      (!budget.proyek?.trim() || budget.proyek.trim().toLowerCase() === cashRow.proyek.trim().toLowerCase())
    )
  ).reduce((sum, row) => sum + Math.max(0, Number(row.keluar) || 0), 0);

  const update = <K extends keyof BudgetForm>(key: K, value: BudgetForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const beginNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const beginEdit = (budget: Anggaran) => {
    setEditingId(budget.id);
    setForm({
      kategori: budget.kategori as BukuKas['kategori'],
      anggaran: String(budget.anggaran),
      periode: budget.periode,
      proyek: budget.proyek || '',
      catatan: budget.catatan || '',
    });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const saveBudget = () => {
    setError('');
    const amount = Number(form.anggaran);
    if (!isMonth(form.periode)) {
      setError('Pilih periode bulanan yang benar.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Nilai anggaran harus lebih besar dari nol.');
      return;
    }
    if (form.proyek.trim().length > 120 || form.catatan.trim().length > 2000) {
      setError('Nama proyek atau catatan terlalu panjang.');
      return;
    }
    const duplicate = state.anggaran.find(budget =>
      budget.id !== editingId &&
      budget.kategori === form.kategori &&
      budget.periode === form.periode &&
      (budget.proyek || '').trim().toLowerCase() === form.proyek.trim().toLowerCase()
    );
    if (duplicate) {
      setError('Anggaran untuk kategori, periode, dan proyek yang sama sudah ada. Edit baris itu, jangan membuat anggaran ganda.');
      return;
    }

    const record: Anggaran = {
      id: editingId || 'AG-' + Date.now().toString(36).toUpperCase(),
      kategori: form.kategori,
      anggaran: amount,
      // Never enter or copy a "realization" number manually. It is derived in the report.
      realisasi: 0,
      periode: form.periode,
      proyek: form.proyek.trim(),
      catatan: form.catatan.trim(),
    };
    if (editingId) dispatch({ type: 'UPDATE_ANGGARAN', payload: record });
    else dispatch({ type: 'ADD_ANGGARAN', payload: record });
    setShowForm(false);
    setEditingId(null);
    setMessage('Anggaran disimpan. Realisasi dihitung ulang dari pengeluaran Buku Kas dengan periode, kategori, dan proyek yang cocok.');
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['REKAP ANGGARAN VS REALISASI BUKU KAS'],
      ['Periode filter', periodFilter || 'Semua periode'],
      ['Catatan', 'Realisasi merupakan pengeluaran tercatat di Buku Kas, bukan saldo bank yang direkonsiliasi.'],
      [],
      ['Kategori', 'Proyek', 'Periode', 'Anggaran', 'Realisasi dari Buku Kas', 'Sisa/(Lebih Anggaran)', 'Persentase', 'Transaksi Kas', 'Transaksi tanpa bukti'],
      ...budgetRows.map(row => [
        row.budget.kategori, row.budget.proyek || 'Semua proyek',
        row.budget.periode, row.budget.anggaran, row.realisasi, row.sisa,
        Number(row.persentase.toFixed(2)), row.sourceRows, row.missingEvidence
      ]),
      [],
      ['Pengeluaran belum memiliki anggaran yang cocok', unallocatedOutflow],
    ];
    const cell = (value: string | number) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anggaran-vs-realisasi.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Wallet size={24} className="text-emerald-600" />Anggaran Proyek</h1>
          <p className="mt-1 text-gray-500">Rencana diinput satu kali; realisasi dihitung dari pengeluaran Buku Kas menurut kategori, proyek, dan bulan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"><Download size={16} />Ekspor CSV</button>
          <button onClick={beginNew} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"><Plus size={17} />Tambah Anggaran</button>
        </div>
      </header>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Perbedaan anggaran dan uang keluar</p>
        <p className="mt-1">Anggaran adalah rencana; tidak mengurangi saldo kas dan tidak membuat jurnal. Realisasi hanya menjumlahkan baris pengeluaran pada Buku Kas yang cocok dengan periode, kategori dan proyek. Baris tanpa kuitansi/transfer terhubung tetap ditampilkan sebagai transaksi yang perlu konfirmasi.</p>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Total anggaran terfilter</p><p className="mt-2 text-xl font-bold">{formatRupiah(totalBudget)}</p><p className="mt-1 text-xs text-gray-500">{budgetRows.length} rencana biaya</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Realisasi pengeluaran tercatat</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(totalRealization)}</p><p className="mt-1 text-xs text-gray-500">Baris Buku Kas yang cocok</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Anggaran terlampaui</p><p className="mt-2 text-xl font-bold text-amber-700">{overBudgetRows}</p><p className="mt-1 text-xs text-gray-500">Baris dengan realisasi di atas rencana</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Pengeluaran tanpa anggaran cocok</p><p className="mt-2 text-xl font-bold text-amber-700">{formatRupiah(unallocatedOutflow)}</p><p className="mt-1 text-xs text-gray-500">{rowsWithoutEvidence} transaksi cocok yang belum didukung bukti</p></div>
      </section>

      {showForm && <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Anggaran' : 'Tambah Anggaran'}</h2><button onClick={() => setShowForm(false)} aria-label="Tutup form" className="rounded p-2 hover:bg-gray-100"><X size={18} /></button></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Kategori pengeluaran *
            <select value={form.kategori} onChange={e => update('kategori', e.target.value as BukuKas['kategori'])} className="mt-1 w-full rounded-lg border px-3 py-2">{budgetCategories.map(category => <option key={category} value={category}>{displayCategory(category)}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-gray-700">Periode bulan *
            <input type="month" value={form.periode} onChange={e => update('periode', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Proyek / lokasi (opsional)
            <input value={form.proyek} onChange={e => update('proyek', e.target.value)} placeholder="Kosongkan untuk semua proyek" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Anggaran (Rp) *
            <input type="number" min="1" step="1" value={form.anggaran} onChange={e => update('anggaran', e.target.value)} placeholder="Masukkan nilai yang disetujui" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700 md:col-span-2">Catatan / dasar persetujuan
            <textarea rows={2} value={form.catatan} onChange={e => update('catatan', e.target.value)} placeholder="Nomor RAB, persetujuan, versi, atau batas lingkup." className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
        </div>
        <div className="mt-4 flex gap-2"><button onClick={saveBudget} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"><Save size={17} />Simpan Anggaran</button><button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Batal</button></div>
      </section>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kategori, proyek, catatan…" className="flex-1 rounded-lg border bg-white px-3 py-2" />
        <input type="month" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="rounded-lg border bg-white px-3 py-2" aria-label="Filter periode" />
        <button onClick={() => setPeriodFilter('')} className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50">Semua periode</button>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Anggaran vs realisasi otomatis ({budgetRows.length})</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b bg-gray-50"><tr><th className="px-3 py-3 text-left">Periode / kategori</th><th className="px-3 py-3 text-left">Proyek</th><th className="px-3 py-3 text-right">Rencana</th><th className="px-3 py-3 text-right">Realisasi Buku Kas</th><th className="px-3 py-3 text-right">Sisa/(Lebih)</th><th className="px-3 py-3 text-left">Serapan</th><th className="px-3 py-3 text-center">Bukti</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
          <tbody className="divide-y">
            {budgetRows.map(({ budget, realisasi, sisa, persentase, sourceRows, missingEvidence }) => <tr key={budget.id} className="hover:bg-gray-50">
              <td className="px-3 py-3"><p className="font-semibold">{budget.periode}</p><p className="text-xs text-gray-500">{displayCategory(budget.kategori)}</p></td><td className="px-3 py-3">{budget.proyek || 'Semua proyek'}<p className="text-xs text-gray-500">{budget.catatan}</p></td><td className="px-3 py-3 text-right">{formatRupiah(budget.anggaran)}</td><td className="px-3 py-3 text-right font-semibold text-red-700">{formatRupiah(realisasi)}<p className="text-xs font-normal text-gray-500">{sourceRows} transaksi</p></td><td className={`px-3 py-3 text-right font-semibold ${sisa < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatRupiah(sisa)}</td>
              <td className="px-3 py-3"><div className="mb-1 flex justify-between text-xs"><span>{persentase.toFixed(1)}%</span><span>{persentase > 100 ? 'Melebihi' : 'Serapan'}</span></div><div className="h-2 w-28 overflow-hidden rounded bg-gray-100"><div className={`h-2 ${persentase > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.max(0, persentase))}%` }} /></div></td>
              <td className="px-3 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs ${missingEvidence > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{missingEvidence}/{sourceRows} perlu bukti</span></td><td className="px-3 py-3 text-right"><button onClick={() => beginEdit(budget)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-100"><Pencil size={13} />Edit</button></td>
            </tr>)}
            {budgetRows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Belum ada anggaran yang cocok. Buat rencana biaya pertama atau ubah filter.</td></tr>}
          </tbody>
          <tfoot className="border-t-2 bg-gray-50"><tr><td colSpan={2} className="px-3 py-3 font-bold">TOTAL TERFILTER</td><td className="px-3 py-3 text-right font-bold">{formatRupiah(totalBudget)}</td><td className="px-3 py-3 text-right font-bold text-red-700">{formatRupiah(totalRealization)}</td><td className={`px-3 py-3 text-right font-bold ${totalBudget-totalRealization < 0 ? 'text-red-700' : ''}`}>{formatRupiah(totalBudget - totalRealization)}</td><td colSpan={3}></td></tr></tfoot>
        </table></div>
      </section>
    </div>
  );
}
