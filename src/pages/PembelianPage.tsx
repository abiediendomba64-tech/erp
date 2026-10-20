import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Truck, Plus } from 'lucide-react';

export default function PembelianPage() {
  const { state } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const totalPembelian = state.pembelian.reduce((s, p) => s + p.items.reduce((si, i) => si + i.subtotal, 0) + p.ppn, 0);
  const belumBayar = state.pembelian.filter(p => p.status_bayar !== 'Lunas').reduce((s, p) => s + p.items.reduce((si, i) => si + i.subtotal, 0) + p.ppn, 0);
  const statusBayarColor = (s: string) => { switch (s) { case 'Lunas': return 'bg-emerald-100 text-emerald-800'; case 'DP': return 'bg-blue-100 text-blue-800'; default: return 'bg-red-100 text-red-800'; } };
  const statusTerimaColor = (s: string) => { switch (s) { case 'Lengkap': return 'bg-emerald-100 text-emerald-800'; case 'Sebagian': return 'bg-amber-100 text-amber-800'; default: return 'bg-gray-100 text-gray-800'; } };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Truck size={24} className="text-purple-500" />Pembelian</h1><p className="text-gray-500 mt-1">Purchase Order — tracking supplier, pembayaran, penerimaan barang</p></div>
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
            <div><label className="text-sm font-medium text-gray-700">No PO</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Supplier</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Total (Rp)</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">PPN (Rp)</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Jatuh Tempo</label><input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Status Bayar</label><select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Lunas</option><option>DP</option><option>Belum Bayar</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">Status Terima</label><select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Belum</option><option>Sebagian</option><option>Lengkap</option></select></div>
          </div>
          <div className="mt-4 flex gap-2"><button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button><button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button></div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="text-left px-4 py-3 font-medium text-gray-600">No PO</th><th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th><th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th><th className="text-right px-4 py-3 font-medium text-gray-600">Total</th><th className="text-right px-4 py-3 font-medium text-gray-600">PPN</th><th className="text-right px-4 py-3 font-medium text-gray-600">Grand Total</th><th className="text-center px-4 py-3 font-medium text-gray-600">Bayar</th><th className="text-center px-4 py-3 font-medium text-gray-600">Terima</th><th className="text-left px-4 py-3 font-medium text-gray-600">Jatuh Tempo</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.pembelian.map(p => {
                const total = p.items.reduce((s, i) => s + i.subtotal, 0);
                const grandTotal = total + p.ppn;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-purple-600">{p.no_po}</td>
                    <td className="px-4 py-3 text-gray-600">{p.tanggal}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.supplier}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(total)}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(p.ppn)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatRupiah(grandTotal)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBayarColor(p.status_bayar)}`}>{p.status_bayar.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusTerimaColor(p.status_terima)}`}>{p.status_terima}</span></td>
                    <td className="px-4 py-3 text-gray-600">{p.jatuh_tempo || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
