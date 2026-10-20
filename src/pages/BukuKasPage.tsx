import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { BukuKas } from '../types';
import { Plus, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function BukuKasPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<BukuKas>>({
    kategori: 'Pembebasan_Tanah',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 0,
  });

  const filtered = filter === 'all'
    ? state.bukuKas
    : state.bukuKas.filter(k => k.status_verifikasi === filter);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'LENGKAP': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'TANPA_BUKTI': return <XCircle size={16} className="text-red-500" />;
      case 'PERLU_KONFIRMASI': return <AlertCircle size={16} className="text-amber-500" />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'LENGKAP': return 'bg-emerald-100 text-emerald-800';
      case 'TANPA_BUKTI': return 'bg-red-100 text-red-800';
      case 'PERLU_KONFIRMASI': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = () => {
    const newId = `KAS-${String(state.bukuKas.length + 1).padStart(3, '0')}`;
    const statusVerifikasi = formData.kode_bukti ? 'LENGKAP' : 'TANPA_BUKTI';

    const newEntry: BukuKas = {
      id: newId,
      tgl: formData.tgl || new Date().toISOString().split('T')[0],
      no_ref: newId,
      kode_bukti: formData.kode_bukti || '',
      keterangan: formData.keterangan || '',
      kategori: formData.kategori as BukuKas['kategori'],
      proyek: formData.proyek || '',
      masuk: formData.masuk || 0,
      keluar: formData.keluar || 0,
      status_verifikasi: statusVerifikasi as BukuKas['status_verifikasi'],
    };

    dispatch({ type: 'ADD_BUKU_KAS', payload: newEntry });
    dispatch({
      type: 'ADD_AUDIT_LOG',
      payload: {
        id: `LOG-${String(state.auditLog.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        user: 'ADMIN',
        aksi: 'CREATE',
        tabel: 'BUKU_KAS',
        record_id: newId,
        nilai_lama: '-',
        nilai_baru: `${formData.keterangan} - ${formatRupiah(formData.keluar || formData.masuk || 0)}`,
        alasan: 'Input transaksi baru',
        sumber_bukti: formData.kode_bukti || 'Tanpa bukti'
      }
    });
    setShowForm(false);
    setFormData({ kategori: 'Pembebasan_Tanah', proyek: 'Cut & Fill Site A', masuk: 0, keluar: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={24} className="text-indigo-500" />
            Buku Kas — Lapisan 1
          </h1>
          <p className="text-gray-500 mt-1">Catatan mentah setiap rupiah yang masuk/keluar. Status verifikasi dihitung otomatis dari keberadaan Kode_Bukti.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Tambah Transaksi
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Aturan kunci:</strong> Status_Verifikasi tidak diinput manual. Ia dihitung dari keberadaan Kode_Bukti dan status di Lapisan 2 (Arsip Bukti).
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Input Transaksi Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Tanggal</label>
              <input type="date" value={formData.tgl || ''} onChange={e => setFormData({...formData, tgl: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Kode Bukti (Lapisan 2)</label>
              <input type="text" placeholder="BUKTI-XXX (kosongkan jika tanpa bukti)" value={formData.kode_bukti || ''}
                onChange={e => setFormData({...formData, kode_bukti: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Kategori</label>
              <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as BukuKas['kategori']})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="Pembebasan_Tanah">Pembebasan Tanah</option>
                <option value="Cut_Fill">Cut & Fill</option>
                <option value="Operasional">Operasional</option>
                <option value="Marketing">Marketing</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium text-gray-700">Keterangan</label>
              <input type="text" placeholder="Deskripsi transaksi" value={formData.keterangan || ''}
                onChange={e => setFormData({...formData, keterangan: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Masuk (Rp)</label>
              <input type="number" value={formData.masuk || ''} onChange={e => setFormData({...formData, masuk: Number(e.target.value), keluar: 0})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Keluar (Rp)</label>
              <input type="number" value={formData.keluar || ''} onChange={e => setFormData({...formData, keluar: Number(e.target.value), masuk: 0})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Proyek</label>
              <input type="text" value={formData.proyek || ''} onChange={e => setFormData({...formData, proyek: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'LENGKAP', 'TANPA_BUKTI', 'PERLU_KONFIRMASI'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'all' ? 'Semua' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tgl</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No Ref</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode Bukti</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Masuk</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Keluar</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(kas => (
                <tr key={kas.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{kas.tgl}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{kas.no_ref}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {kas.kode_bukti ? <span className="text-indigo-600">{kas.kode_bukti}</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{kas.keterangan}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{kas.kategori.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                    {kas.masuk > 0 ? formatRupiah(kas.masuk) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    {kas.keluar > 0 ? formatRupiah(kas.keluar) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor(kas.status_verifikasi)}`}>
                      {statusIcon(kas.status_verifikasi)}
                      {kas.status_verifikasi.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={5} className="px-4 py-3 font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">
                  {formatRupiah(filtered.reduce((s, k) => s + k.masuk, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-600">
                  {formatRupiah(filtered.reduce((s, k) => s + k.keluar, 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
