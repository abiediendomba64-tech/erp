import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Users, Plus, CheckCircle, Clock } from 'lucide-react';

export default function PenggajianPage() {
  const { state } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const totalGaji = state.penggajian.reduce((s, g) => s + g.gaji_pokok + g.tunjangan + g.lembur - g.potongan - g.pph21, 0);
  const dibayar = state.penggajian.filter(g => g.status === 'Dibayar').reduce((s, g) => s + g.gaji_pokok + g.tunjangan + g.lembur - g.potongan - g.pph21, 0);
  const belum = totalGaji - dibayar;
  const statusColor = (s: string) => { switch (s) { case 'Dibayar': return 'bg-emerald-100 text-emerald-800'; case 'Disetujui': return 'bg-blue-100 text-blue-800'; case 'Draft': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; } };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users size={24} className="text-teal-500" />Penggajian</h1><p className="text-gray-500 mt-1">Slip gaji karyawan — gaji pokok, tunjangan, lembur, PPh 21</p></div>
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
            <div><label className="text-sm font-medium text-gray-700">NIP</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Nama</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Jabatan</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Departemen</label><input type="text" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Gaji Pokok</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Tunjangan</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Lembur</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Potongan</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">PPh 21</label><input type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Periode</label><input type="month" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Status</label><select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Draft</option><option>Disetujui</option><option>Dibayar</option></select></div>
          </div>
          <div className="mt-4 flex gap-2"><button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button><button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button></div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="text-left px-4 py-3 font-medium text-gray-600">NIP</th><th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th><th className="text-left px-4 py-3 font-medium text-gray-600">Jabatan</th><th className="text-right px-4 py-3 font-medium text-gray-600">Gaji Pokok</th><th className="text-right px-4 py-3 font-medium text-gray-600">Tunjangan</th><th className="text-right px-4 py-3 font-medium text-gray-600">Lembur</th><th className="text-right px-4 py-3 font-medium text-gray-600">Potongan</th><th className="text-right px-4 py-3 font-medium text-gray-600">PPh 21</th><th className="text-right px-4 py-3 font-medium text-gray-600">Bersih</th><th className="text-center px-4 py-3 font-medium text-gray-600">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.penggajian.map(g => {
                const bersih = g.gaji_pokok + g.tunjangan + g.lembur - g.potongan - g.pph21;
                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-teal-600">{g.nip}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{g.nama}</td>
                    <td className="px-4 py-3 text-gray-600">{g.jabatan}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(g.gaji_pokok)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(g.tunjangan)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(g.lembur)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatRupiah(g.potongan)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatRupiah(g.pph21)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(bersih)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(g.status)}`}>{g.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr><td colSpan={8} className="px-4 py-3 font-bold text-gray-700">Total</td><td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(totalGaji)}</td><td></td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
