import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Penggajian } from '../types';
import { Plus, Users, CheckCircle, Clock, FileEdit } from 'lucide-react';

export default function PenggajianPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Penggajian>>({ status: 'Draft', gaji_pokok: 0, tunjangan: 0, lembur: 0, potongan: 0, pph21: 0 });

  const totalGaji = state.penggajian.reduce((s, g) => s + g.gaji_bersih, 0);
  const dibayar = state.penggajian.filter(g => g.status === 'Dibayar').reduce((s, g) => s + g.gaji_bersih, 0);
  const belum = state.penggajian.filter(g => g.status !== 'Dibayar').reduce((s, g) => s + g.gaji_bersih, 0);

  const gajiBersih = (formData.gaji_pokok || 0) + (formData.tunjangan || 0) + (formData.lembur || 0) - (formData.potongan || 0) - (formData.pph21 || 0);

  const statusColor = (s: string) => {
    switch (s) { case 'Dibayar': return 'bg-emerald-100 text-emerald-800'; case 'Disetujui': return 'bg-blue-100 text-blue-800'; case 'Draft': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  const handleSubmit = () => {
    const newId = `GJ-${String(state.penggajian.length + 1).padStart(3, '0')}`;
    const gaji_bersih = (formData.gaji_pokok || 0) + (formData.tunjangan || 0) + (formData.lembur || 0) - (formData.potongan || 0) - (formData.pph21 || 0);
    const newEntry: Penggajian = {
      id: newId, nip: formData.nip || `EMP-${String(state.penggajian.length + 1).padStart(3, '0')}`,
      nama: formData.nama || '', jabatan: formData.jabatan || '', departemen: formData.departemen || '',
      gaji_pokok: formData.gaji_pokok || 0, tunjangan: formData.tunjangan || 0, lembur: formData.lembur || 0,
      potongan: formData.potongan || 0, pph21: formData.pph21 || 0, gaji_bersih,
      periode: formData.periode || new Date().toISOString().slice(0, 7),
      status: formData.status as Penggajian['status'],
    };
    dispatch({ type: 'ADD_PENGGAJIAN', payload: newEntry });
    dispatch({ type: 'ADD_AUDIT_LOG', payload: { id: `LOG-${Date.now()}`, timestamp: new Date().toISOString(), user: 'ADMIN', aksi: 'CREATE', tabel: 'PENGGAJIAN', record_id: newId, nilai_lama: '-', nilai_baru: `${newEntry.nama} - ${formatRupiah(gaji_bersih)}`, alasan: 'Input slip gaji', sumber_bukti: 'Manual' } });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users size={24} className="text-teal-500" />Penggajian</h1>
          <p className="text-gray-500 mt-1">Slip gaji karyawan — gaji pokok, tunjangan, lembur, PPh 21</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"><Plus size={18} />Input Slip Gaji</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Karyawan</p><p className="text-xl font-bold">{state.penggajian.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Gaji Bersih</p><p className="text-xl font-bold text-teal-600">{formatRupiah(totalGaji)}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500 flex items-center gap-1"><CheckCircle size={12} />Sudah Dibayar</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(dibayar)}</p></div>
        <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4"><p className="text-xs text-amber-600 flex items-center gap-1"><Clock size={12} />Belum Dibayar</p><p className="text-xl font-bold text-amber-600">{formatRupiah(belum)}</p></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Input Slip Gaji</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-gray-700">NIP</label><input type="text" value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Nama</label><input type="text" value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Jabatan</label><input type="text" value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Departemen</label><input type="text" value={formData.departemen || ''} onChange={e => setFormData({...formData, departemen: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Gaji Pokok</label><input type="number" value={formData.gaji_pokok || ''} onChange={e => setFormData({...formData, gaji_pokok: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Tunjangan</label><input type="number" value={formData.tunjangan || ''} onChange={e => setFormData({...formData, tunjangan: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Lembur</label><input type="number" value={formData.lembur || ''} onChange={e => setFormData({...formData, lembur: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Potongan</label><input type="number" value={formData.potongan || ''} onChange={e => setFormData({...formData, potongan: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">PPh 21</label><input type="number" value={formData.pph21 || ''} onChange={e => setFormData({...formData, pph21: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Periode</label><input type="month" value={formData.periode || ''} onChange={e => setFormData({...formData, periode: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Penggajian['status']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Draft">Draft</option><option value="Disetujui">Disetujui</option><option value="Dibayar">Dibayar</option></select></div>
          </div>
          <div className="mt-3 p-3 bg-teal-50 rounded-lg"><p className="text-sm text-teal-800"><strong>Gaji Bersih:</strong> {formatRupiah(gajiBersih)}</p></div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NIP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jabatan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Gaji Pokok</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Tunjangan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Lembur</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Potongan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">PPh 21</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Bersih</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.penggajian.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-teal-600">{g.nip}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{g.nama}</td>
                  <td className="px-4 py-3 text-gray-600">{g.jabatan}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(g.gaji_pokok)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(g.tunjangan)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(g.lembur)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatRupiah(g.potongan)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatRupiah(g.pph21)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(g.gaji_bersih)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(g.status)}`}>{g.status}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={8} className="px-4 py-3 font-bold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(totalGaji)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
