import { useAccounting } from '../store/accounting';
import { formatRupiah, getLocalDateISO } from '../data/accounting';
import { generateLabaRugi, generateNeraca } from '../utils/accounting';
import { TrendingUp, TrendingDown, DollarSign, FileText, Calendar, AlertCircle } from 'lucide-react';

export default function AccountingDashboard() {
  const { state } = useAccounting();

  // Dashboard selalu mengikuti periode dan posisi saldo saat ini.
  const hariIni = getLocalDateISO();
  const periodeSaatIni = hariIni.slice(0, 7);
  const labaRugi = generateLabaRugi(state.akun, state.jurnal, periodeSaatIni);
  const neraca = generateNeraca(state.akun, state.jurnal, hariIni);

  // Hitung ringkasan
  const totalAset = neraca.aset.total_aset;
  const totalKewajiban = neraca.kewajiban.total_kewajiban;
  const totalEkuitas = neraca.total_ekuitas;
  const labaBersih = labaRugi.laba_bersih;

  // Ambil saldo dari neraca hasil jurnal, bukan hanya saldo awal Chart of Accounts.
  const kas = neraca.aset.aset_lancar
    .filter(item => item.akun === 'Kas' || item.akun === 'Bank')
    .reduce((sum, item) => sum + item.jumlah, 0);
  const piutang = neraca.aset.aset_lancar.find(item => item.akun === 'Piutang Usaha')?.jumlah || 0;
  const utang = neraca.kewajiban.kewajiban_jangka_pendek.find(item => item.akun === 'Utang Usaha')?.jumlah || 0;

  // Statistik transaksi hanya menghitung jurnal Posted sebagai pembukuan final.
  const totalJurnal = state.jurnal.filter(jurnal => jurnal.status === 'Posted').length;
  const totalInvoice = state.invoice.length;
  const invoiceBelumLunas = state.invoice.filter(invoice =>
    invoice.status !== 'Paid' && invoice.status !== 'Cancelled'
  ).length;
  const scheduleMendatang = state.schedule.filter(schedule => schedule.tanggal > hariIni).length;
  const invoiceJatuhTempo = state.invoice.filter(invoice =>
    invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.jatuh_tempo && invoice.jatuh_tempo < hariIni
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Akuntansi</h1>
        <p className="text-gray-500 mt-1">Ringkasan keuangan perusahaan - Auto-generate dari transaksi</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Aset</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatRupiah(totalAset)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Laba Bersih</p>
              <p className={`text-xl font-bold mt-1 ${labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatRupiah(labaBersih)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${labaBersih >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {labaBersih >= 0 ? <TrendingUp size={24} className="text-emerald-600" /> : <TrendingDown size={24} className="text-red-600" />}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Kas & Bank</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatRupiah(kas)}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Piutang</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{formatRupiah(piutang)}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Statistik Transaksi</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Jurnal</span>
              <span className="font-bold text-gray-900">{totalJurnal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Invoice</span>
              <span className="font-bold text-gray-900">{totalInvoice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Invoice Belum Lunas</span>
              <span className="font-bold text-amber-600">{invoiceBelumLunas}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Kewajiban & Ekuitas</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Utang</span>
              <span className="font-bold text-red-600">{formatRupiah(utang)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Kewajiban</span>
              <span className="font-bold text-red-600">{formatRupiah(totalKewajiban)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Ekuitas</span>
              <span className="font-bold text-emerald-600">{formatRupiah(totalEkuitas)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Schedule Mendatang</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Jadwal Aktif</span>
              <span className="font-bold text-gray-900">{scheduleMendatang}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Invoice Jatuh Tempo</span>
              <span className="font-bold text-amber-600">{invoiceJatuhTempo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">PO Pending</span>
              <span className="font-bold text-blue-600">{state.purchaseOrder.filter(p => p.status === 'Sent').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Laba Rugi Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Laba Rugi - {labaRugi.periode}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-600 mb-1">Total Pendapatan</p>
            <p className="text-xl font-bold text-emerald-700">{formatRupiah(labaRugi.total_pendapatan)}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 mb-1">Total Beban</p>
            <p className="text-xl font-bold text-red-700">{formatRupiah(labaRugi.total_beban)}</p>
          </div>
          <div className={`p-4 rounded-lg ${labaRugi.laba_bersih >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className={`text-sm mb-1 ${labaRugi.laba_bersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Laba Bersih
            </p>
            <p className={`text-xl font-bold ${labaRugi.laba_bersih >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatRupiah(labaRugi.laba_bersih)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Journals */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Jurnal Terbaru</h3>
        <div className="space-y-2">
          {state.jurnal.filter(jurnal => jurnal.status === 'Posted').slice(-5).reverse().map(jurnal => (
            <div key={jurnal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{jurnal.keterangan}</p>
                <p className="text-xs text-gray-500">{jurnal.no_jurnal} • {jurnal.tanggal}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{formatRupiah(jurnal.total_debit)}</p>
                <p className="text-xs text-gray-500">{jurnal.entries.length} entries</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-indigo-500" />
          Jadwal Mendatang
        </h3>
        <div className="space-y-2">
          {state.schedule
            .filter(s => new Date(s.tanggal) > new Date())
            .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
            .slice(0, 5)
            .map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{schedule.judul}</p>
                  <p className="text-xs text-gray-500">{schedule.tanggal} {schedule.waktu && `• ${schedule.waktu}`}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  schedule.kategori === 'Invoice' ? 'bg-amber-100 text-amber-800' :
                  schedule.kategori === 'PO' ? 'bg-blue-100 text-blue-800' :
                  schedule.kategori === 'Meeting' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {schedule.kategori}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
