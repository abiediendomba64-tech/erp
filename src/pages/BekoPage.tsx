import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Beko } from '../types';
import { Plus, Truck, Camera } from 'lucide-react';

export default function BekoPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Beko>>({
    status: 'Belum_Ada_Kwitansi',
    panjang: 0,
    lebar: 0,
    tinggi: 0,
    tarif: 25000,
  });

  const totalNilai = state.beko.reduce((s, b) => s + b.nilai, 0);
  const calculatedNilai = (formData.panjang || 0) * (formData.lebar || 0) * (formData.tinggi || 0) * (formData.tarif || 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'Lunas': return 'bg-emerald-100 text-emerald-800';
      case 'Belum_Ada_Kwitansi': return 'bg-red-100 text-red-800';
      case 'Foto_Belum_Tersedia': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = () => {
    const newId = `B-${String(state.beko.length + 1).padStart(3, '0')}`;
    const nilai = (formData.panjang || 0) * (formData.lebar || 0) * (formData.tinggi || 0) * (formData.tarif || 0);

    const newEntry: Beko = {
      id: newId,
      item: formData.item || '',
      panjang: formData.panjang || 0,
      lebar: formData.lebar || 0,
      tinggi: formData.tinggi || 0,
      tarif: formData.tarif || 0,
      nilai: nilai || formData.nilai || 0,
      status: formData.status as Beko['status'],
      kode_bukti: formData.kode_bukti || '',
      url_bukti: formData.url_bukti || '',
      catatan: formData.catatan || '',
    };

    dispatch({ type: 'ADD_BEKO', payload: newEntry });
    dispatch({
      type: 'ADD_AUDIT_LOG',
      payload: {
        id: `LOG-${String(state.auditLog.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        user: 'ADMIN',
        aksi: 'CREATE',
        tabel: 'BEKO',
        record_id: newId,
        nilai_lama: '-',
        nilai_baru: `${newEntry.item} - ${formatRupiah(newEntry.nilai)}`,
        alasan: 'Input data beko baru',
        sumber_bukti: newEntry.kode_bukti || 'Menunggu bukti'
      }
    });
    setShowForm(false);
    setFormData({ status: 'Belum_Ada_Kwitansi', panjang: 0, lebar: 0, tinggi: 0, tarif: 25000 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck size={24} className="text-orange-500" />
            Kwitansi Beko
          </h1>
          <p className="text-gray-500 mt-1">Perhitungan: Panjang × Lebar × Tinggi × Tarif = Nilai. Semua otomatis.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
          <Plus size={18} />
          Tambah Beko
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Nilai Beko</p>
          <p className="text-lg font-bold text-gray-900">{formatRupiah(totalNilai)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Item dengan Kwitansi</p>
          <p className="text-lg font-bold text-emerald-600">{state.beko.filter(b => b.status === 'Lunas').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Item Tanpa Kwitansi</p>
          <p className="text-lg font-bold text-red-600">{state.beko.filter(b => b.status !== 'Lunas').length}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Input Data Beko Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Item</label>
              <input type="text" value={formData.item || ''} onChange={e => setFormData({...formData, item: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Panjang (m)</label>
              <input type="number" step="0.1" value={formData.panjang || ''} onChange={e => setFormData({...formData, panjang: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Lebar (m)</label>
              <input type="number" step="0.1" value={formData.lebar || ''} onChange={e => setFormData({...formData, lebar: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tinggi (m)</label>
              <input type="number" step="0.1" value={formData.tinggi || ''} onChange={e => setFormData({...formData, tinggi: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tarif per m³ (Rp)</label>
              <input type="number" value={formData.tarif || ''} onChange={e => setFormData({...formData, tarif: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Beko['status']})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="Lunas">Lunas</option>
                <option value="Belum_Ada_Kwitansi">Belum Ada Kwitansi</option>
                <option value="Foto_Belum_Tersedia">Foto Belum Tersedia</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Kode Bukti</label>
              <input type="text" placeholder="BUKTI-XXX" value={formData.kode_bukti || ''}
                onChange={e => setFormData({...formData, kode_bukti: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">URL Bukti</label>
              <input type="url" placeholder="https://drive.google.com/..." value={formData.url_bukti || ''}
                onChange={e => setFormData({...formData, url_bukti: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-4">
              <label className="text-sm font-medium text-gray-700">Catatan</label>
              <input type="text" value={formData.catatan || ''} onChange={e => setFormData({...formData, catatan: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {/* Auto-calculation */}
          <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              <strong>Perhitungan:</strong> {formData.panjang || 0} × {formData.lebar || 0} × {formData.tinggi || 0} × {formatRupiah(formData.tarif || 0)} = <strong>{formatRupiah(calculatedNilai)}</strong>
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm">Simpan</button>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">P</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">L</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">T</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Tarif</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.beko.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-orange-600">{b.id}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{b.item}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{b.panjang || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{b.lebar || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{b.tinggi || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{b.tarif ? formatRupiah(b.tarif) : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRupiah(b.nilai)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColor(b.status)}`}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {b.url_bukti ? (
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
                <td colSpan={6} className="px-4 py-3 font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(totalNilai)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Catatan */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Catatan Audit per Item</h3>
        <div className="space-y-2">
          {state.beko.filter(b => b.catatan).map(b => (
            <div key={b.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-xs font-mono text-orange-600 mt-0.5">{b.id}</span>
              <span className="text-xs text-gray-600">{b.catatan}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
