import { useMemo, useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { getBukuKasVerificationStatus } from '../helpers';
import type { BukuKas } from '../types';
import { AlertTriangle, CheckCircle, FileWarning, DollarSign, Download } from 'lucide-react';

type PeriodSummary = {
  month: string;
  records: BukuKas[];
  in: number;
  out: number;
  opening: number;
  closing: number;
  missingEvidence: number;
};


export default function AlokasiDanaPage() {
  const { state } = useAppContext();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const totalIn = state.bukuKas.reduce((sum, row) => sum + Math.max(0, Number(row.masuk) || 0), 0);
  const totalOut = state.bukuKas.reduce((sum, row) => sum + Math.max(0, Number(row.keluar) || 0), 0);
  const totalMissingEvidence = state.bukuKas.filter(row =>
    getBukuKasVerificationStatus(row, state.arsipBukti) !== 'LENGKAP'
  ).length;

  const periods = useMemo(() => {
    const monthMap = new Map<string, PeriodSummary>();
    const sorted = state.bukuKas.slice().sort((a, b) => a.tgl.localeCompare(b.tgl) || a.id.localeCompare(b.id));
    for (const row of sorted) {
      const month = /^\d{4}-\d{2}/.test(row.tgl) ? row.tgl.slice(0, 7) : 'Tanggal tidak valid';
      if (!monthMap.has(month)) {
        monthMap.set(month, { month, records: [], in: 0, out: 0, opening: 0, closing: 0, missingEvidence: 0 });
      }
      const group = monthMap.get(month)!;
      group.records.push(row);
      group.in += Math.max(0, Number(row.masuk) || 0);
      group.out += Math.max(0, Number(row.keluar) || 0);
      if (getBukuKasVerificationStatus(row, state.arsipBukti) !== 'LENGKAP') group.missingEvidence++;
    }

    let running = 0;
    const result: PeriodSummary[] = [];
    for (const group of [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month))) {
      group.opening = running;
      running += group.in - group.out;
      group.closing = running;
      result.push(group);
    }
    return result;
  }, [state.bukuKas, state.arsipBukti]);

  const categoryOutflow = useMemo(() => {
    const values = new Map<string, number>();
    for (const row of state.bukuKas) {
      const category = row.kategori.replace(/_/g, ' ');
      values.set(category, (values.get(category) || 0) + Math.max(0, Number(row.keluar) || 0));
    }
    return [...values.entries()].sort((a, b) => b[1] - a[1]);
  }, [state.bukuKas]);

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['REKAP KAS PER PERIODE', 'Nilai dari buku kas input; bukan budget approval / alokasi rencana'],
      ['Bulan', 'Saldo awal catatan', 'Kas masuk', 'Kas keluar', 'Saldo akhir catatan', 'Baris tanpa bukti lengkap'],
      ...periods.map(period => [period.month, period.opening, period.in, period.out, period.closing, period.missingEvidence]),
      [],
      ['RINCIAN TRANSAKSI'],
      ['Tanggal', 'ID', 'Referensi', 'Keterangan', 'Kategori', 'Proyek', 'Masuk', 'Keluar', 'Status bukti'],
      ...state.bukuKas.slice().sort((a, b) => a.tgl.localeCompare(b.tgl)).map(row => [
        row.tgl, row.id, row.no_ref, row.keterangan, row.kategori, row.proyek,
        row.masuk, row.keluar, getBukuKasVerificationStatus(row, state.arsipBukti)
      ])
    ];
    const escape = (value: string | number) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + rows.map(row => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rekap-kas-periode.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><DollarSign size={24} className="text-emerald-600" />Rekap Dana per Periode</h1><p className="mt-1 text-gray-500">Dihitung dari transaksi buku kas aktual yang tersimpan. Anggaran rencana/komitmen belum dianggap sebagai pengeluaran sampai dicatat.</p></div>
        <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"><Download size={16} />Ekspor CSV</button>
      </header>

      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Pemisahan data</p>
        <p className="mt-1">Halaman ini menampilkan penerimaan/pengeluaran dari Buku Kas, bukan alokasi lama yang ditulis tetap di kode. Baris lama masih merupakan rekap input dan tetap perlu dipasangkan dengan bukti asli. Untuk rencana anggaran yang belum dibayar, gunakan modul Anggaran atau catatan kewajiban, bukan mengurangkannya dari kas.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Kas masuk tercatat</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatRupiah(totalIn)}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Kas keluar tercatat</p><p className="mt-2 text-xl font-bold text-red-700">{formatRupiah(totalOut)}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Saldo catatan kumulatif</p><p className={`mt-2 text-xl font-bold ${totalIn - totalOut < 0 ? 'text-red-700' : 'text-indigo-700'}`}>{formatRupiah(totalIn - totalOut)}</p></div>
        <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Transaksi tanpa bukti lengkap</p><p className="mt-2 text-xl font-bold text-amber-700">{totalMissingEvidence}</p></div>
      </section>

      <section className="rounded-xl border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Periode bulanan dari tanggal transaksi</h2><p className="mt-1 text-xs text-gray-500">Saldo awal setiap bulan dibawa dari saldo akhir bulan sebelumnya.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-gray-50"><tr><th className="px-4 py-3 text-left">Bulan</th><th className="px-4 py-3 text-right">Saldo awal</th><th className="px-4 py-3 text-right">Masuk</th><th className="px-4 py-3 text-right">Keluar</th><th className="px-4 py-3 text-right">Saldo akhir</th><th className="px-4 py-3 text-center">Bukti belum lengkap</th><th className="px-4 py-3 text-right">Rincian</th></tr></thead>
          <tbody className="divide-y">
            {periods.map(period => <tr key={period.month} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold">{period.month}</td><td className="px-4 py-3 text-right">{formatRupiah(period.opening)}</td><td className="px-4 py-3 text-right text-emerald-700">{formatRupiah(period.in)}</td><td className="px-4 py-3 text-right text-red-700">{formatRupiah(period.out)}</td><td className={`px-4 py-3 text-right font-semibold ${period.closing < 0 ? 'text-red-700' : ''}`}>{formatRupiah(period.closing)}</td><td className="px-4 py-3 text-center">{period.missingEvidence ? <span className="inline-flex items-center gap-1 text-amber-800"><FileWarning size={14} />{period.missingEvidence}</span> : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle size={14} />0</span>}</td><td className="px-4 py-3 text-right"><button onClick={() => setExpandedMonth(expandedMonth === period.month ? null : period.month)} className="rounded border px-3 py-1 hover:bg-gray-100">{expandedMonth === period.month ? 'Tutup' : 'Lihat'}</button></td>
            </tr>)}
            {periods.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">Belum ada transaksi buku kas.</td></tr>}
          </tbody>
        </table></div>
      </section>

      {expandedMonth && periods.filter(period => period.month === expandedMonth).map(period => <section key={period.month} className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Transaksi {period.month}</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">Keterangan</th><th className="px-3 py-2 text-left">Kategori</th><th className="px-3 py-2 text-right">Masuk</th><th className="px-3 py-2 text-right">Keluar</th><th className="px-3 py-2 text-left">Status bukti</th></tr></thead><tbody className="divide-y">{period.records.map(row => <tr key={row.id}><td className="px-3 py-2">{row.tgl}</td><td className="px-3 py-2">{row.keterangan}<p className="text-xs text-gray-500">{row.id} · {row.no_ref}</p></td><td className="px-3 py-2">{row.kategori.replace(/_/g, ' ')}</td><td className="px-3 py-2 text-right text-emerald-700">{row.masuk ? formatRupiah(row.masuk) : '—'}</td><td className="px-3 py-2 text-right text-red-700">{row.keluar ? formatRupiah(row.keluar) : '—'}</td><td className="px-3 py-2">{getBukuKasVerificationStatus(row, state.arsipBukti).replace(/_/g, ' ')}</td></tr>)}</tbody></table></div></section>)}

      <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Pengeluaran menurut kategori input</h2><p className="mt-1 text-xs text-gray-500">Kategori berasal dari label transaksi kas; bukan pengesahan bahwa dokumen pendukung sudah benar.</p><div className="mt-3 space-y-3">{categoryOutflow.map(([category, amount]) => <div key={category}><div className="mb-1 flex justify-between gap-2 text-sm"><span>{category}</span><strong>{formatRupiah(amount)}</strong></div><div className="h-2 rounded bg-gray-100"><div className="h-2 rounded bg-indigo-500" style={{ width: `${totalOut > 0 ? Math.min(100, amount / totalOut * 100) : 0}%` }} /></div></div>)}{categoryOutflow.length === 0 && <p className="text-sm text-gray-500">Belum ada pengeluaran.</p>}</div></section>
    </div>
  );
}
