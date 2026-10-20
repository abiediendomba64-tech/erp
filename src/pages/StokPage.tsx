import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { StokBarang } from '../types';
import { Plus, Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

export default function StokPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [filterKat, setFilterKat] = useState('all');
  const [formData, setFormData] = useState<Partial<StokBarang>>({ kategori: 'Bahan_Baku', satuan: 'unit', stok_awal: 0, masuk: 0, keluar: 0, harga_pokok: 0, harga_jual: 0, min_stok: 0 });

  const filtered = filterKat === 'all' ? state.stok : state.stok.filter(s => s.kategori === filterKat);
  const lowStock = state.stok.filter(s => s.stok_akhir <= s.min_stok);
  const totalNilai = state.stok.reduce((s, i) => s + (i.stok_akhir * i.harga_pokok), 0);

  const handleSubmit = () => {
    const newId = `STK-${String(state.stok.length + 1).padStart(3, '0')}`;
    const stok_akhir = (formData.stok_awal || 0) + (formData.masuk || 0) - (formData.keluar || 0);
    const newEntry: StokBarang = {
      id: newId, kode: formData.kode || newId, nama: formData.nama || '',
      kategori: formData.kategori as StokBarang['kategori'], satuan: formData.satuan || 'unit',
      stok_awal: formData.stok_awal || 0, masuk: formData.masuk || 0, keluar: formData.keluar || 0,
      stok_akhir, harga_pokok: formData.harga_pokok || 0, harga_jual: formData.harga_jual || 0,
      min_stok: formData.min_stok || 0, lokasi: formData.lokasi || '',
    };
    dispatch({ type: 'ADD_STOK', payload: newEntry });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { id: `LOG-${Date.now()}`, timestamp: new Date().toISOString(), user: 'ADMIN', aksi: 'CREATE', tabel: 'STOK', record_id: newId, nilai_lama: '-', nilai_baru: `${newEntry.nama} - Stok: ${newEntry.stok_akhir}`, alasan: 'Input barang baru', sumber_bukti: 'Manual' } });
    setShowForm(false);
  };

  const katColor = (k: string) => {
    switch (k) {
      case 'Bahan_Baku': return 'bg-blue-100 text-blue-700';
      case 'Barang_Jadi': return 'bg-emerald-100 text-emerald-700';
      case 'Barang_Dagang': return 'bg-purple-100 text-purple-700';
      case 'Perlengkapan': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
          <p className="text-xl font-bold text-indigo-600">{formatRupiah(totalNilai)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Stok Masuk</p>
          <p className="text-xl font-bold text-emerald-600">{state.stok.reduce((s, i) => s + i.masuk, 0)}</p>
        </div>
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
          <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} />Stok Menipis</p>
          <p className="text-xl font-bold text-red-600">{lowStock.length}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={16} />Peringatan Stok Menipis</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.map(s => (
              <span key={s.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{s.nama}: {s.stok_akhir} {s.satuan} (min: {s.min_stok})</span>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tambah Barang Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="text-sm font-medium text-gray-700">Kode</label><input type="text" value={formData.kode || ''} onChange={e => setFormData({...formData, kode: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700">Nama Barang</label><input type="text" value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Kategori</label><select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as StokBarang['kategori']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Bahan_Baku">Bahan Baku</option><option value="Barang_Jadi">Barang Jadi</option><option value="Barang_Dagang">Barang Dagang</option><option value="Perlengkapan">Perlengkapan</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">Satuan</label><input type="text" value={formData.satuan || ''} onChange={e => setFormData({...formData, satuan: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Stok Awal</label><input type="number" value={formData.stok_awal || ''} onChange={e => setFormData({...formData, stok_awal: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Harga Pokok</label><input type="number" value={formData.harga_pokok || ''} onChange={e => setFormData({...formData, harga_pokok: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Harga Jual</label><input type="number" value={formData.harga_jual || ''} onChange={e => setFormData({...formData, harga_jual: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Min Stok</label><input type="number" value={formData.min_stok || ''} onChange={e => setFormData({...formData, min_stok: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Lokasi</label><input type="text" value={formData.lokasi || ''} onChange={e => setFormData({...formData, lokasi: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'Bahan_Baku', 'Barang_Jadi', 'Barang_Dagang', 'Perlengkapan'].map(f => (
          <button key={f} onClick={() => setFilterKat(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterKat === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f === 'all' ? 'Semua' : f.replace(/_/g, ' ')}</button>
        ))}
      </div>

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
              {filtered.map(s => (
                <tr key={s.id} className={`hover:bg-gray-50 ${s.stok_akhir <= s.min_stok ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{s.kode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.nama}</td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded ${katColor(s.kategori)}`}>{s.kategori.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3 text-right text-emerald-600">{s.masuk}</td>
                  <td className="px-4 py-3 text-right text-red-600">{s.keluar}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{s.stok_akhir} {s.satuan}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatRupiah(s.harga_pokok)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatRupiah(s.harga_jual)}</td>
                  <td className="px-4 py-3 text-right font-medium text-indigo-600">{formatRupiah(s.stok_akhir * s.harga_pokok)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
