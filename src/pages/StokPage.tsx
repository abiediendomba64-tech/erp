import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Package, Plus, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export default function StokPage() {
  const { state } = useAppContext();
  const [showForm, setShowForm] = useState(false);

  // Hitung stok akhir otomatis
  const getStokAkhir = (stokAwal: number, masuk: number, keluar: number) => stokAwal + masuk - keluar;
  const getNilaiInventori = (stokAkhir: number, hargaPokok: number) => stokAkhir * hargaPokok;

  const totalNilaiInventori = state.stok.reduce((sum, s) => {
    const stokAkhir = getStokAkhir(s.stok_awal, s.masuk, s.keluar);
    return sum + getNilaiInventori(stokAkhir, s.harga_pokok);
  }, 0);

  const stokMenipis = state.stok.filter(s => {
    const stokAkhir = getStokAkhir(s.stok_awal, s.masuk, s.keluar);
    return stokAkhir <= s.min_stok;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package size={24} className="text-blue-500" />Stok Barang</h1>
          <p className="text-gray-500 mt-1">Manajemen inventori — bahan baku, barang jadi, barang dagang, perlengkapan</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={18} />Tambah Barang</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Item</p>
          <p className="text-xl font-bold text-gray-900">{state.stok.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Nilai Inventori</p>
          <p className="text-xl font-bold text-indigo-600">{formatRupiah(totalNilaiInventori)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Stok Masuk</p>
          <p className="text-xl font-bold text-emerald-600">{state.stok.reduce((s, i) => s + i.masuk, 0)}</p>
        </div>
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
          <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} />Stok Menipis</p>
          <p className="text-xl font-bold text-red-600">{stokMenipis.length}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stokMenipis.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={16} />Peringatan Stok Menipis</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {stokMenipis.map(s => {
              const stokAkhir = getStokAkhir(s.stok_awal, s.masuk, s.keluar);
              return (
                <span key={s.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{s.nama}: {stokAkhir} {s.satuan} (min: {s.min_stok})</span>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tambah Barang Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="text-sm font-medium text-gray-700">Kode</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700">Nama Barang</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Kategori</label><select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Bahan Baku</option><option>Barang Jadi</option><option>Barang Dagang</option><option>Perlengkapan</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">Satuan</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Stok Awal</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Harga Pokok</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Harga Jual</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Min Stok</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Lokasi</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">Simpan</button>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"><TrendingUp size={14} className="inline" /> Masuk</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"><TrendingDown size={14} className="inline" /> Keluar</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stok Akhir</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">H. Pokok</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">H. Jual</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.stok.map(s => {
                const stokAkhir = getStokAkhir(s.stok_awal, s.masuk, s.keluar);
                const nilai = getNilaiInventori(stokAkhir, s.harga_pokok);
                const isLow = stokAkhir <= s.min_stok;
                return (
                  <tr key={s.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{s.kode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.nama}</td>
                    <td className="px-4 py-3 text-center"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{s.kategori.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-right text-emerald-600">{s.masuk}</td>
                    <td className="px-4 py-3 text-right text-red-600">{s.keluar}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{stokAkhir} {s.satuan}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatRupiah(s.harga_pokok)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatRupiah(s.harga_jual)}</td>
                    <td className="px-4 py-3 text-right font-medium text-indigo-600">{formatRupiah(nilai)}</td>
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
