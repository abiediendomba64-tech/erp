import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Tanah } from '../types';
import { Plus, LandPlot, Camera } from 'lucide-react';

export default function TanahPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Tanah>>({
    status: 'Belum_Bayar',
    luas_bt: 0,
    harga_per_bt: 800000,
    dp: 0,
  });

  const totalNilai = state.tanah.reduce((s, t) => s + t.nilai_total, 0);
  const totalDP = state.tanah.reduce((s, t) => s + t.dp, 0);
  const totalSisa = state.tanah.reduce((s, t) => s + t.sisa, 0);

  // Auto-calculate
  const calculatedTotal = (formData.luas_bt || 0) * (formData.harga_per_bt || 0);
  const calculatedSisa = calculatedTotal - (formData.dp || 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'Lunas': return 'bg-emerald-100 text-emerald-800';
      case 'DP': return 'bg-amber-100 text-amber-800';
      case 'Belum_Bayar': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = () => {
    const newId = `T-${String(state.tanah.length + 1).padStart(3, '0')}`;
    const nilai_total = (formData.luas_bt || 0) * (formData.harga_per_bt || 0);
    const sisa = nilai_total - (formData.dp || 0);
    const status = sisa === 0 && nilai_total > 0 ? 'Lunas' : formData.dp && formData.dp > 0 ? 'DP' : 'Belum_Bayar';

    const newEntry: Tanah = {
      id: newId,
      pemilik: formData.pemilik || '',
      luas_bt: formData.luas_bt || 0,
      harga_per_bt: formData.harga_per_bt || 0,
      nilai_total,
      dp: formData.dp || 0,
      sisa,
      status: status as Tanah['status'],
      kode_bukti: formData.kode_bukti || '',
      url_bukti: formData.url_bukti || '',
      catatan: formData.catatan || '',
    };

    dispatch({ type: 'ADD_TANAH', payload: newEntry });
    dispatch({
      type: 'ADD_AUDIT_LOG',
      payload: {
        id: `LOG-${String(state.auditLog.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        user: 'ADMIN',
        aksi: 'CREATE',
        tabel: 'TANAH',
        record_id: newId,
        nilai_lama: '-',
        nilai_baru: `${newEntry.pemilik} - ${newEntry.luas_bt} BT - ${formatRupiah(nilai_total)}`,
        alasan: 'Input data tanah baru',
        sumber_bukti: newEntry.kode_bukti || 'Menunggu bukti'
      }
    });
    setShowForm(false);
    setFormData({ status: 'Belum_Bayar', luas_bt: 0, harga_per_bt: 800000, dp: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LandPlot size={24} className="text-blue-500" />
            Kwitansi Tanah
          </h1>
          <p className="text-gray-500 mt-1">Pos buku ↔ foto ↔ nominal kwitansi ↔ nominal buku ↔ selisih otomatis</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={18} />
          Tambah Tanah
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Nilai Tanah</p>
          <p className="text-lg font-bold text-gray-900">{formatRupiah(totalNilai)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total DP Dibayar</p>
          <p className="text-lg font-bold text-emerald-600">{formatRupiah(totalDP)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Sisa Belum Ada Bukti</p>
          <p className="text-lg font-bold text-red-600">{formatRupiah(totalSisa)}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Input Data Tanah Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Pemilik</label>
              <input type="text" value={formData.pemilik || ''} onChange={e => setFormData({...formData, pemilik: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Luas (BT)</label>
              <input type="number" step="0.1" value={formData.luas_bt || ''} onChange={e => setFormData({...formData, luas_bt: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Harga per BT (Rp)</label>
              <input type="number" value={formData.harga_per_bt || ''} onChange={e => setFormData({...formData, harga_per_bt: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">DP (Rp)</label>
              <input type="number" value={formData.dp || ''} onChange={e => setFormData({...formData, dp: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Kode Bukti</label>
              <input type="text" placeholder="BUKTI-XXX" value={formData.kode_bukti || ''}
                onChange={e => setFormData({...formData, kode_bukti: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">URL Bukti (Drive)</label>
              <input type="url" placeholder="https://drive.google.com/..." value={formData.url_bukti || ''}
                onChange={e => setFormData({...formData, url_bukti: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium text-gray-700">Catatan</label>
              <input type="text" value={formData.catatan || ''} onChange={e => setFormData({...formData, catatan: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {/* Auto-calculation preview */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Perhitungan otomatis:</strong> Nilai = {formData.luas_bt || 0} BT × {formatRupiah(formData.harga_per_bt || 0)} = <strong>{formatRupiah(calculatedTotal)}</strong>
              {' '}| Sisa = {formatRupiah(calculatedTotal)} - {formatRupiah(formData.dp || 0)} = <strong className={calculatedSisa > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatRupiah(calculatedSisa)}</strong>
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pemilik</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Luas (BT)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga/BT</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">DP</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sisa</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.tanah.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{t.id}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{t.pemilik}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{t.luas_bt}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(t.harga_per_bt)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRupiah(t.nilai_total)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(t.dp)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${t.sisa > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(t.sisa)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColor(t.status)}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.url_bukti ? (
                      <span className="inline-flex items-center gap-1 text-indigo-600 cursor-pointer">
                        <Camera size={14} /> 📷
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(totalNilai)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatRupiah(totalDP)}</td>
                <td className={`px-4 py-3 text-right font-bold ${totalSisa > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalSisa)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Catatan per record */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Catatan Audit per Record</h3>
        <div className="space-y-2">
          {state.tanah.filter(t => t.catatan).map(t => (
            <div key={t.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-xs font-mono text-blue-600 mt-0.5">{t.id}</span>
              <span className="text-xs text-gray-600">{t.catatan}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
