import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Factory, Plus, CheckCircle, Clock, FileEdit } from 'lucide-react';

export default function ProduksiPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);

  const totalBiaya = state.produksi.reduce((s, p) => s + p.biaya_tenaga_kerja + p.biaya_overhead, 0);
  const selesai = state.produksi.filter(p => p.status === 'Selesai').length;
  const dalamProses = state.produksi.filter(p => p.status === 'Dalam_Proses').length;

  const statusColor = (s: string) => {
    switch (s) { case 'Selesai': return 'bg-emerald-100 text-emerald-800'; case 'Dalam_Proses': return 'bg-amber-100 text-amber-800'; case 'Draft': return 'bg-gray-100 text-gray-800'; case 'Batal': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Factory size={24} className="text-orange-500" />Produksi</h1>
          <p className="text-gray-500 mt-1">Surat Perintah Kerja (SPK) — bahan baku, tenaga kerja, overhead, HPP</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"><Plus size={18} />Buat SPK</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total SPK</p><p className="text-xl font-bold">{state.produksi.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Selesai</p><p className="text-xl font-bold text-emerald-600">{selesai}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Dalam Proses</p><p className="text-xl font-bold text-amber-600">{dalamProses}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Biaya Produksi</p><p className="text-xl font-bold text-indigo-600">{formatRupiah(totalBiaya)}</p></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Buat SPK Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-gray-700">No. SPK</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Produk</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Jumlah</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Biaya Tenaga Kerja</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Biaya Overhead</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Status</label><select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Draft</option><option>Dalam Proses</option><option>Selesai</option></select></div>
            <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700">Catatan</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No SPK</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Jumlah</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Biaya TK</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Overhead</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.produksi.map(p => {
                const total = p.biaya_tenaga_kerja + p.biaya_overhead;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-orange-600">{p.no_produksi}</td>
                    <td className="px-4 py-3 text-gray-600">{p.tanggal}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.produk}</td>
                    <td className="px-4 py-3 text-center">{p.jumlah}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(p.biaya_tenaga_kerja)}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(p.biaya_overhead)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(total)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status.replace(/_/g, ' ')}</span></td>
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
