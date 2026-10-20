import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Penjualan } from '../types';
import { Plus, ShoppingCart, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function PenjualanPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Penjualan>>({ status_bayar: 'Belum_Bayar', metode_bayar: 'Tunai', diskon: 0, ppn: 0 });

  const totalPenjualan = state.penjualan.reduce((s, p) => s + p.grand_total, 0);
  const lunas = state.penjualan.filter(p => p.status_bayar === 'Lunas').reduce((s, p) => s + p.grand_total, 0);
  const belumLunas = state.penjualan.filter(p => p.status_bayar !== 'Lunas').reduce((s, p) => s + p.grand_total, 0);

  const statusColor = (s: string) => {
    switch (s) { case 'Lunas': return 'bg-emerald-100 text-emerald-800'; case 'DP': return 'bg-blue-100 text-blue-800'; case 'Belum_Bayar': return 'bg-red-100 text-red-800'; case 'Jatuh_Tempo': return 'bg-amber-100 text-amber-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  const handleSubmit = () => {
    const newId = `PJ-${String(state.penjualan.length + 1).padStart(3, '0')}`;
    const total = formData.total || 0;
    const grand_total = total - (formData.diskon || 0) + (formData.ppn || 0);
    const newEntry: Penjualan = {
      id: newId, no_invoice: formData.no_invoice || `INV-2024-${String(state.penjualan.length + 1).padStart(3, '0')}`,
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      pelanggan: formData.pelanggan || '', items: [], total, diskon: formData.diskon || 0,
      ppn: formData.ppn || 0, grand_total, status_bayar: formData.status_bayar as Penjualan['status_bayar'],
      metode_bayar: formData.metode_bayar as Penjualan['metode_bayar'], jatuh_tempo: formData.jatuh_tempo || '',
    };
    dispatch({ type: 'ADD_PENJUALAN', payload: newEntry });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { id: `LOG-${Date.now()}`, timestamp: new Date().toISOString(), user: 'ADMIN', aksi: 'CREATE', tabel: 'PENJUALAN', record_id: newId, nilai_lama: '-', nilai_baru: `${newEntry.pelanggan} - ${formatRupiah(grand_total)}`, alasan: 'Input invoice', sumber_bukti: 'Manual' } });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShoppingCart size={24} className="text-emerald-500" />Penjualan</h1>
          <p className="text-gray-500 mt-1">Invoice penjualan — tracking pembayaran dan jatuh tempo</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"><Plus size={18} />Buat Invoice</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Invoice</p><p className="text-xl font-bold">{state.penjualan.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Penjualan</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(totalPenjualan)}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500 flex items-center gap-1"><CheckCircle size={12} />Lunas</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(lunas)}</p></div>
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4"><p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />Belum Lunas</p><p className="text-xl font-bold text-red-600">{formatRupiah(belumLunas)}</p></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Buat Invoice Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-gray-700">No Invoice</label><input type="text" value={formData.no_invoice || ''} onChange={e => setFormData({...formData, no_invoice: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" value={formData.tanggal || ''} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Pelanggan</label><input type="text" value={formData.pelanggan || ''} onChange={e => setFormData({...formData, pelanggan: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Total (Rp)</label><input type="number" value={formData.total || ''} onChange={e => setFormData({...formData, total: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Diskon (Rp)</label><input type="number" value={formData.diskon || ''} onChange={e => setFormData({...formData, diskon: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">PPN (Rp)</label><input type="number" value={formData.ppn || ''} onChange={e => setFormData({...formData, ppn: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Status Bayar</label><select value={formData.status_bayar} onChange={e => setFormData({...formData, status_bayar: e.target.value as Penjualan['status_bayar']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Lunas">Lunas</option><option value="DP">DP</option><option value="Belum_Bayar">Belum Bayar</option><option value="Jatuh_Tempo">Jatuh Tempo</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">Metode Bayar</label><select value={formData.metode_bayar} onChange={e => setFormData({...formData, metode_bayar: e.target.value as Penjualan['metode_bayar']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Tunai">Tunai</option><option value="Transfer">Transfer</option><option value="Kredit">Kredit</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">Jatuh Tempo</label><input type="date" value={formData.jatuh_tempo || ''} onChange={e => setFormData({...formData, jatuh_tempo: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="mt-3 p-3 bg-emerald-50 rounded-lg"><p className="text-sm text-emerald-800"><strong>Grand Total:</strong> {formatRupiah((formData.total || 0) - (formData.diskon || 0) + (formData.ppn || 0))}</p></div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pelanggan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Diskon</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">PPN</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Grand Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.penjualan.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-emerald-600">{p.no_invoice}</td>
                  <td className="px-4 py-3 text-gray-600">{p.tanggal}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.pelanggan}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(p.total)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{p.diskon > 0 ? formatRupiah(p.diskon) : '—'}</td>
                  <td className="px-4 py-3 text-right">{p.ppn > 0 ? formatRupiah(p.ppn) : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(p.grand_total)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status_bayar)}`}>{p.status_bayar.replace(/_/g, ' ')}</span></td>
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
