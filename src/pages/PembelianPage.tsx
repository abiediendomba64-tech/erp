import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Pembelian } from '../types';
import { Plus, Truck, Package } from 'lucide-react';

export default function PembelianPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Pembelian>>({ status_bayar: 'Belum_Bayar', status_terima: 'Belum', ppn: 0 });

  const totalPembelian = state.pembelian.reduce((s, p) => s + p.grand_total, 0);
  const belumBayar = state.pembelian.filter(p => p.status_bayar !== 'Lunas').reduce((s, p) => s + p.grand_total, 0);

  const statusBayarColor = (s: string) => {
    switch (s) { case 'Lunas': return 'bg-emerald-100 text-emerald-800'; case 'DP': return 'bg-blue-100 text-blue-800'; default: return 'bg-red-100 text-red-800'; }
  };
  const statusTerimaColor = (s: string) => {
    switch (s) { case 'Lengkap': return 'bg-emerald-100 text-emerald-800'; case 'Sebagian': return 'bg-amber-100 text-amber-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  const handleSubmit = () => {
    const newId = `PB-${String(state.pembelian.length + 1).padStart(3, '0')}`;
    const total = formData.total || 0;
    const grand_total = total + (formData.ppn || 0);
    const newEntry: Pembelian = {
      id: newId, no_po: formData.no_po || `PO-2024-${String(state.pembelian.length + 1).padStart(3, '0')}`,
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      supplier: formData.supplier || '', items: [], total, ppn: formData.ppn || 0, grand_total,
      status_bayar: formData.status_bayar as Pembelian['status_bayar'],
      status_terima: formData.status_terima as Pembelian['status_terima'],
      jatuh_tempo: formData.jatuh_tempo || '',
    };
    dispatch({ type: 'ADD_PEMBELIAN', payload: newEntry });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { id: `LOG-${Date.now()}`, timestamp: new Date().toISOString(), user: 'ADMIN', aksi: 'CREATE', tabel: 'PEMBELIAN', record_id: newId, nilai_lama: '-', nilai_baru: `${newEntry.supplier} - ${formatRupiah(grand_total)}`, alasan: 'Input PO baru', sumber_bukti: 'Manual' } });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Truck size={24} className="text-purple-500" />Pembelian</h1>
          <p className="text-gray-500 mt-1">Purchase Order — tracking supplier, pembayaran, dan penerimaan barang</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"><Plus size={18} />Buat PO</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total PO</p><p className="text-xl font-bold">{state.pembelian.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Pembelian</p><p className="text-xl font-bold text-purple-600">{formatRupiah(totalPembelian)}</p></div>
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4"><p className="text-xs text-red-600">Utang Dagang</p><p className="text-xl font-bold text-red-600">{formatRupiah(belumBayar)}</p></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Buat PO Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-gray-700">No PO</label><input type="text" value={formData.no_po || ''} onChange={e => setFormData({...formData, no_po: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" value={formData.tanggal || ''} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Supplier</label><input type="text" value={formData.supplier || ''} onChange={e => setFormData({...formData, supplier: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Total (Rp)</label><input type="number" value={formData.total || ''} onChange={e => setFormData({...formData, total: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">PPN (Rp)</label><input type="number" value={formData.ppn || ''} onChange={e => setFormData({...formData, ppn: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Jatuh Tempo</label><input type="date" value={formData.jatuh_tempo || ''} onChange={e => setFormData({...formData, jatuh_tempo: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Status Bayar</label><select value={formData.status_bayar} onChange={e => setFormData({...formData, status_bayar: e.target.value as Pembelian['status_bayar']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Lunas">Lunas</option><option value="DP">DP</option><option value="Belum_Bayar">Belum Bayar</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">Status Terima</label><select value={formData.status_terima} onChange={e => setFormData({...formData, status_terima: e.target.value as Pembelian['status_terima']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Belum">Belum</option><option value="Sebagian">Sebagian</option><option value="Lengkap">Lengkap</option></select></div>
          </div>
          <div className="mt-3 p-3 bg-purple-50 rounded-lg"><p className="text-sm text-purple-800"><strong>Grand Total:</strong> {formatRupiah((formData.total || 0) + (formData.ppn || 0))}</p></div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No PO</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">PPN</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Grand Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Bayar</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Terima</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.pembelian.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-purple-600">{p.no_po}</td>
                  <td className="px-4 py-3 text-gray-600">{p.tanggal}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.supplier}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(p.total)}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(p.ppn)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatRupiah(p.grand_total)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBayarColor(p.status_bayar)}`}>{p.status_bayar.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusTerimaColor(p.status_terima)}`}>{p.status_terima}</span></td>
                  <td className="px-4 py-3 text-gray-600">{p.jatuh_tempo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
