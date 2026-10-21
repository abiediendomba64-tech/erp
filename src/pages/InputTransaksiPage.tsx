import { useState } from 'react';
import { useAccounting } from '../store/accounting';
import { formatRupiah, generateId } from '../data/accounting';
import { 
  generateJurnalPenjualanTunai, 
  generateJurnalPenjualanKredit,
  generateJurnalPembelianTunai,
  generateJurnalPembelianKredit,
  generateJurnalPembayaranPiutang,
  generateJurnalPembayaranUtang,
  generateJurnalBeban
} from '../utils/accounting';
import { JurnalUmum } from '../types/accounting';
import { Plus, Save, Eye } from 'lucide-react';

type TransaksiType = 
  | 'penjualan_tunai'
  | 'penjualan_kredit'
  | 'pembelian_tunai'
  | 'pembelian_kredit'
  | 'pembayaran_piutang'
  | 'pembayaran_utang'
  | 'beban_operasional';

export default function InputTransaksiPage() {
  const { state, dispatch } = useAccounting();
  const [jenisTransaksi, setJenisTransaksi] = useState<TransaksiType>('penjualan_tunai');
  const [showPreview, setShowPreview] = useState(false);
  const [previewJurnal, setPreviewJurnal] = useState<JurnalUmum | null>(null);

  // Form state
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [keterangan, setKeterangan] = useState('');
  const [jumlah, setJumlah] = useState(0);
  const [ppn, setPpn] = useState(0);
  const [pihak, setPihak] = useState('');
  const [akunBeban, setAkunBeban] = useState('5-2008');

  const handleGeneratePreview = () => {
    let jurnalData;

    switch (jenisTransaksi) {
      case 'penjualan_tunai':
        jurnalData = generateJurnalPenjualanTunai(tanggal, keterangan, jumlah, ppn);
        break;
      case 'penjualan_kredit':
        jurnalData = generateJurnalPenjualanKredit(tanggal, keterangan, jumlah, ppn);
        break;
      case 'pembelian_tunai':
        jurnalData = generateJurnalPembelianTunai(tanggal, keterangan, jumlah, ppn);
        break;
      case 'pembelian_kredit':
        jurnalData = generateJurnalPembelianKredit(tanggal, keterangan, jumlah, ppn);
        break;
      case 'pembayaran_piutang':
        jurnalData = generateJurnalPembayaranPiutang(tanggal, keterangan, jumlah);
        break;
      case 'pembayaran_utang':
        jurnalData = generateJurnalPembayaranUtang(tanggal, keterangan, jumlah);
        break;
      case 'beban_operasional':
        const akun = state.akun.find(a => a.kode === akunBeban);
        jurnalData = generateJurnalBeban(tanggal, keterangan, akunBeban, akun?.nama || '', jumlah);
        break;
      default:
        return;
    }

    const newJurnal: JurnalUmum = {
      id: generateId('J', state.jurnal),
      no_jurnal: `JU-${new Date().getFullYear()}-${String(state.jurnal.length + 1).padStart(3, '0')}`,
      status: 'Draft',
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      ...jurnalData,
    };

    setPreviewJurnal(newJurnal);
    setShowPreview(true);
  };

  const handleSave = () => {
    if (previewJurnal) {
      dispatch({ type: 'ADD_JURNAL', payload: { ...previewJurnal, status: 'Posted' } });
      alert('Transaksi berhasil disimpan!');
      // Reset form
      setKeterangan('');
      setJumlah(0);
      setPpn(0);
      setPihak('');
      setShowPreview(false);
      setPreviewJurnal(null);
    }
  };

  const transaksiOptions = [
    { value: 'penjualan_tunai', label: '💰 Penjualan Tunai', desc: 'Terima uang dari penjualan' },
    { value: 'penjualan_kredit', label: '📄 Penjualan Kredit', desc: 'Jual barang/jasa, bayar nanti' },
    { value: 'pembelian_tunai', label: '🛒 Pembelian Tunai', desc: 'Beli barang, bayar langsung' },
    { value: 'pembelian_kredit', label: '📦 Pembelian Kredit', desc: 'Beli barang, bayar nanti' },
    { value: 'pembayaran_piutang', label: '💵 Terima Pembayaran Piutang', desc: 'Terima uang dari pelanggan' },
    { value: 'pembayaran_utang', label: '💸 Bayar Utang', desc: 'Bayar utang ke supplier' },
    { value: 'beban_operasional', label: '📝 Catat Beban', desc: 'Catat beban operasional' },
  ];

  const bebanOptions = state.akun.filter(a => a.tipe === 'Beban' && a.kategori === 'Beban Operasional');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Plus size={24} className="text-indigo-500" />
          Input Transaksi
        </h1>
        <p className="text-gray-500 mt-1">Input transaksi mudah - sistem auto-generate jurnal & laporan</p>
      </div>

      {/* Pilih Jenis Transaksi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">1. Pilih Jenis Transaksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {transaksiOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setJenisTransaksi(opt.value as TransaksiType)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                jenisTransaksi === opt.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">2. Isi Detail Transaksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Tanggal *</label>
            <input
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Keterangan *</label>
            <input
              type="text"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="Contoh: Penjualan jasa ke PT ABC"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {(jenisTransaksi === 'penjualan_kredit' || jenisTransaksi === 'pembelian_kredit' || jenisTransaksi === 'pembayaran_piutang' || jenisTransaksi === 'pembayaran_utang') && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                {jenisTransaksi.includes('piutang') ? 'Pelanggan' : 'Supplier'} *
              </label>
              <input
                type="text"
                value={pihak}
                onChange={e => setPihak(e.target.value)}
                placeholder="Nama pihak"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {jenisTransaksi === 'beban_operasional' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Jenis Beban *</label>
              <select
                value={akunBeban}
                onChange={e => setAkunBeban(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {bebanOptions.map(akun => (
                  <option key={akun.kode} value={akun.kode}>{akun.nama}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Jumlah (Rp) *</label>
            <input
              type="number"
              value={jumlah || ''}
              onChange={e => setJumlah(Number(e.target.value))}
              placeholder="0"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 1000000 atau 1.000.000</p>
          </div>

          {(jenisTransaksi === 'penjualan_tunai' || jenisTransaksi === 'penjualan_kredit' || jenisTransaksi === 'pembelian_tunai' || jenisTransaksi === 'pembelian_kredit') && (
            <div>
              <label className="text-sm font-medium text-gray-700">PPN (Rp)</label>
              <input
                type="number"
                value={ppn || ''}
                onChange={e => setPpn(Number(e.target.value))}
                placeholder="0"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Opsional - isi jika ada PPN</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleGeneratePreview}
            disabled={!keterangan || !jumlah}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Eye size={18} />
            Preview Jurnal
          </button>
        </div>
      </div>

      {/* Preview Jurnal */}
      {showPreview && previewJurnal && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">3. Preview Jurnal (Double-Entry)</h3>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>No. Jurnal:</strong> {previewJurnal.no_jurnal}<br/>
              <strong>Tanggal:</strong> {previewJurnal.tanggal}<br/>
              <strong>Keterangan:</strong> {previewJurnal.keterangan}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kode Akun</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Akun</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Debit</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewJurnal.entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{entry.akun_kode}</td>
                    <td className="px-4 py-3 text-gray-900">{entry.akun_nama}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {entry.debit > 0 ? formatRupiah(entry.debit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      {entry.kredit > 0 ? formatRupiah(entry.kredit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(previewJurnal.total_debit)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatRupiah(previewJurnal.total_kredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {previewJurnal.total_debit === previewJurnal.total_kredit ? (
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-800">
                ✅ <strong>BALANCE!</strong> Total Debit = Total Kredit = {formatRupiah(previewJurnal.total_debit)}
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                ❌ <strong>TIDAK BALANCE!</strong> Debit: {formatRupiah(previewJurnal.total_debit)} ≠ Kredit: {formatRupiah(previewJurnal.total_kredit)}
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
            >
              <Save size={18} />
              Simpan Transaksi
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tips:</strong> Sistem akan otomatis generate jurnal double-entry dari transaksi yang Anda input. 
          Setiap transaksi akan tercatat di Jurnal Umum, Buku Besar, dan langsung muncul di Laporan Keuangan.
        </p>
      </div>
    </div>
  );
}
