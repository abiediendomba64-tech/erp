import { useState } from 'react';
import { useAccounting } from '../store/accounting';
import { formatRupiah, getLocalDateISO } from '../data/accounting';
import { generateLabaRugi, generateNeraca, generateArusKas } from '../utils/accounting';
import { FileText, Download, Printer } from 'lucide-react';

type LaporanType = 'laba_rugi' | 'neraca' | 'arus_kas';

export default function LaporanKeuanganPage() {
  const { state } = useAccounting();
  const [jenisLaporan, setJenisLaporan] = useState<LaporanType>('laba_rugi');
  const [periode, setPeriode] = useState(() => getLocalDateISO().slice(0, 7));

  // Periode laba rugi/arus kas mengikuti bulan terpilih; neraca memakai tanggal akhir bulan yang valid.
  const periodeValid = /^\\d{4}-\\d{2}$/.test(periode) ? periode : getLocalDateISO().slice(0, 7);
  const [tahunLaporan, bulanLaporan] = periodeValid.split('-').map(Number);
  const tanggalNeraca = getLocalDateISO(new Date(tahunLaporan, bulanLaporan, 0));
  const labaRugi = generateLabaRugi(state.akun, state.jurnal, periodeValid);
  const neraca = generateNeraca(state.akun, state.jurnal, tanggalNeraca);
  const arusKas = generateArusKas(state.akun, state.jurnal, periodeValid);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [['Laporan Keuangan', jenisLaporan], ['Periode', periodeValid], []];
    const addLines = (title: string, items: { akun?: string; keterangan?: string; jumlah: number }[]) => {
      rows.push([title, 'Keterangan', 'Nominal']);
      items.forEach(item => rows.push([title, item.akun || item.keterangan || '', item.jumlah]));
    };

    if (jenisLaporan === 'laba_rugi') {
      addLines('Pendapatan', labaRugi.pendapatan);
      rows.push(['Total Pendapatan', '', labaRugi.total_pendapatan], []);
      addLines('Beban', labaRugi.beban);
      rows.push(['Total Beban', '', labaRugi.total_beban], ['Laba/Rugi Bersih', '', labaRugi.laba_bersih]);
    } else if (jenisLaporan === 'neraca') {
      rows.push(['Tanggal Neraca', tanggalNeraca], []);
      addLines('Aset Lancar', neraca.aset.aset_lancar);
      addLines('Aset Tetap', neraca.aset.aset_tetap);
      rows.push(['Total Aset', '', neraca.aset.total_aset], []);
      addLines('Kewajiban Jangka Pendek', neraca.kewajiban.kewajiban_jangka_pendek);
      addLines('Kewajiban Jangka Panjang', neraca.kewajiban.kewajiban_jangka_panjang);
      addLines('Ekuitas', neraca.ekuitas);
      rows.push(['Total Kewajiban + Ekuitas', '', neraca.total_kewajiban_ekuitas]);
    } else {
      addLines('Arus Kas Operasi', arusKas.arus_kas_operasi);
      addLines('Arus Kas Investasi', arusKas.arus_kas_investasi);
      addLines('Arus Kas Pendanaan', arusKas.arus_kas_pendanaan);
      rows.push(['Kas Awal Periode', '', arusKas.kas_awal_periode],
        ['Kenaikan/Penurunan Kas', '', arusKas.kenaikan_penurunan_kas],
        ['Kas Akhir Periode', '', arusKas.kas_akhir_periode]);
    }

    const escapeCell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = '\\uFEFF' + rows.map(row => row.map(escapeCell).join(';')).join('\\r\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `laporan-${jenisLaporan}-${periodeValid}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={24} className="text-indigo-500" />
            Laporan Keuangan
          </h1>
          <p className="text-gray-500 mt-1">Laporan otomatis dari jurnal transaksi - Laba Rugi, Neraca, Arus Kas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Jenis Laporan</label>
            <select
              value={jenisLaporan}
              onChange={e => setJenisLaporan(e.target.value as LaporanType)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="laba_rugi">Laba Rugi</option>
              <option value="neraca">Neraca (Balance Sheet)</option>
              <option value="arus_kas">Arus Kas</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Periode</label>
            <input
              type="month"
              value={periode}
              onChange={e => setPeriode(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* LABA RUGI */}
      {jenisLaporan === 'laba_rugi' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">LAPORAN LABA RUGI</h2>
            <p className="text-sm text-gray-500">Periode: {periodeValid}</p>
          </div>

          <div className="space-y-4">
            {/* Pendapatan */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">PENDAPATAN</h3>
              <div className="space-y-1">
                {labaRugi.pendapatan.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Tidak ada pendapatan</p>
                ) : (
                  labaRugi.pendapatan.map((p, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{p.akun}</span>
                      <span className="text-sm font-medium text-emerald-600">{formatRupiah(p.jumlah)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                <span className="font-bold text-gray-900">Total Pendapatan</span>
                <span className="font-bold text-emerald-600">{formatRupiah(labaRugi.total_pendapatan)}</span>
              </div>
            </div>

            {/* Beban */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">BEBAN</h3>
              <div className="space-y-1">
                {labaRugi.beban.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Tidak ada beban</p>
                ) : (
                  labaRugi.beban.map((b, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{b.akun}</span>
                      <span className="text-sm font-medium text-red-600">{formatRupiah(b.jumlah)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                <span className="font-bold text-gray-900">Total Beban</span>
                <span className="font-bold text-red-600">{formatRupiah(labaRugi.total_beban)}</span>
              </div>
            </div>

            {/* Laba Bersih */}
            <div className={`p-4 rounded-lg ${labaRugi.laba_bersih >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex justify-between">
                <span className="font-bold text-lg text-gray-900">LABA BERSIH</span>
                <span className={`font-bold text-lg ${labaRugi.laba_bersih >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatRupiah(labaRugi.laba_bersih)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NERACA */}
      {jenisLaporan === 'neraca' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">NERACA (BALANCE SHEET)</h2>
            <p className="text-sm text-gray-500">Per tanggal: {neraca.tanggal}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ASET */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg border-b-2 border-gray-300 pb-2">ASET</h3>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Aset Lancar</h4>
                <div className="space-y-1">
                  {neraca.aset.aset_lancar.map((a, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{a.akun}</span>
                      <span className="text-sm font-medium">{formatRupiah(a.jumlah)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                  <span className="font-semibold text-gray-900">Total Aset Lancar</span>
                  <span className="font-semibold">{formatRupiah(neraca.aset.total_aset_lancar)}</span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Aset Tetap</h4>
                <div className="space-y-1">
                  {neraca.aset.aset_tetap.map((a, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{a.akun}</span>
                      <span className="text-sm font-medium">{formatRupiah(a.jumlah)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                  <span className="font-semibold text-gray-900">Total Aset Tetap</span>
                  <span className="font-semibold">{formatRupiah(neraca.aset.total_aset_tetap)}</span>
                </div>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-gray-300 bg-blue-50 px-3 rounded">
                <span className="font-bold text-gray-900">TOTAL ASET</span>
                <span className="font-bold text-blue-700">{formatRupiah(neraca.aset.total_aset)}</span>
              </div>
            </div>

            {/* KEWAJIBAN & EKUITAS */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg border-b-2 border-gray-300 pb-2">KEWAJIBAN & EKUITAS</h3>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Kewajiban Jangka Pendek</h4>
                <div className="space-y-1">
                  {neraca.kewajiban.kewajiban_jangka_pendek.map((k, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{k.akun}</span>
                      <span className="text-sm font-medium">{formatRupiah(k.jumlah)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                  <span className="font-semibold text-gray-900">Total Kewajiban JP</span>
                  <span className="font-semibold">{formatRupiah(neraca.kewajiban.total_kewajiban_jangka_pendek)}</span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Kewajiban Jangka Panjang</h4>
                <div className="space-y-1">
                  {neraca.kewajiban.kewajiban_jangka_panjang.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Tidak ada</p>
                  ) : (
                    neraca.kewajiban.kewajiban_jangka_panjang.map((k, i) => (
                      <div key={i} className="flex justify-between py-1">
                        <span className="text-sm text-gray-700">{k.akun}</span>
                        <span className="text-sm font-medium">{formatRupiah(k.jumlah)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                  <span className="font-semibold text-gray-900">Total Kewajiban JPanjang</span>
                  <span className="font-semibold">{formatRupiah(neraca.kewajiban.total_kewajiban_jangka_panjang)}</span>
                </div>
              </div>

              <div className="flex justify-between py-2 border-t border-gray-200 mb-4">
                <span className="font-bold text-gray-900">Total Kewajiban</span>
                <span className="font-bold text-red-600">{formatRupiah(neraca.kewajiban.total_kewajiban)}</span>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Ekuitas</h4>
                <div className="space-y-1">
                  {neraca.ekuitas.map((e, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{e.akun}</span>
                      <span className="text-sm font-medium">{formatRupiah(e.jumlah)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                  <span className="font-semibold text-gray-900">Total Ekuitas</span>
                  <span className="font-semibold text-emerald-600">{formatRupiah(neraca.total_ekuitas)}</span>
                </div>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-gray-300 bg-emerald-50 px-3 rounded">
                <span className="font-bold text-gray-900">TOTAL KEWAJIBAN & EKUITAS</span>
                <span className="font-bold text-emerald-700">{formatRupiah(neraca.total_kewajiban_ekuitas)}</span>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className={`mt-6 p-4 rounded-lg ${neraca.aset.total_aset === neraca.total_kewajiban_ekuitas ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">
                {neraca.aset.total_aset === neraca.total_kewajiban_ekuitas ? '✅ BALANCE!' : '❌ TIDAK BALANCE!'}
              </span>
              <span className="text-sm text-gray-600">
                Aset: {formatRupiah(neraca.aset.total_aset)} | Kewajiban + Ekuitas: {formatRupiah(neraca.total_kewajiban_ekuitas)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ARUS KAS */}
      {jenisLaporan === 'arus_kas' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">LAPORAN ARUS KAS</h2>
            <p className="text-sm text-gray-500">Periode: {periodeValid}</p>
          </div>

          <div className="space-y-4">
            {/* Arus Kas Operasi */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">ARUS KAS DARI AKTIVITAS OPERASI</h3>
              <div className="space-y-1">
                {arusKas.arus_kas_operasi.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Tidak ada arus kas operasi</p>
                ) : (
                  arusKas.arus_kas_operasi.map((a, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{a.keterangan}</span>
                      <span className={`text-sm font-medium ${a.jumlah >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatRupiah(a.jumlah)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                <span className="font-bold text-gray-900">Total Arus Kas Operasi</span>
                <span className={`font-bold ${arusKas.total_arus_kas_operasi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatRupiah(arusKas.total_arus_kas_operasi)}
                </span>
              </div>
            </div>

            {/* Arus Kas Investasi */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">ARUS KAS DARI AKTIVITAS INVESTASI</h3>
              <div className="space-y-1">
                {arusKas.arus_kas_investasi.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Tidak ada arus kas investasi</p>
                ) : (
                  arusKas.arus_kas_investasi.map((a, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{a.keterangan}</span>
                      <span className={`text-sm font-medium ${a.jumlah >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatRupiah(a.jumlah)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                <span className="font-bold text-gray-900">Total Arus Kas Investasi</span>
                <span className={`font-bold ${arusKas.total_arus_kas_investasi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatRupiah(arusKas.total_arus_kas_investasi)}
                </span>
              </div>
            </div>

            {/* Arus Kas Pendanaan */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">ARUS KAS DARI AKTIVITAS PENDANAAN</h3>
              <div className="space-y-1">
                {arusKas.arus_kas_pendanaan.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Tidak ada arus kas pendanaan</p>
                ) : (
                  arusKas.arus_kas_pendanaan.map((a, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-sm text-gray-700">{a.keterangan}</span>
                      <span className={`text-sm font-medium ${a.jumlah >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatRupiah(a.jumlah)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                <span className="font-bold text-gray-900">Total Arus Kas Pendanaan</span>
                <span className={`font-bold ${arusKas.total_arus_kas_pendanaan >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatRupiah(arusKas.total_arus_kas_pendanaan)}
                </span>
              </div>
            </div>

            {/* Ringkasan */}
            <div className="border-t-4 border-gray-300 pt-4 space-y-2">
              <div className="flex justify-between py-1">
                <span className="font-semibold text-gray-900">Kenaikan/Penurunan Kas</span>
                <span className={`font-semibold ${arusKas.kenaikan_penurunan_kas >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatRupiah(arusKas.kenaikan_penurunan_kas)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-700">Kas Awal Periode</span>
                <span className="text-sm">{formatRupiah(arusKas.kas_awal_periode)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300 bg-indigo-50 px-3 rounded">
                <span className="font-bold text-gray-900">KAS AKHIR PERIODE</span>
                <span className="font-bold text-indigo-700">{formatRupiah(arusKas.kas_akhir_periode)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
