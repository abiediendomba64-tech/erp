import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { PosKewajiban } from '../types';
import { Plus, Scale, AlertTriangle } from 'lucide-react';

export default function PosKewajibanPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<PosKewajiban>>({
    status: 'Dalam_Penelusuran',
    nilai_menurut_dokumen: 0,
    nilai_menurut_workbook: 0,
  });

  const totalDokumen = state.posKewajiban.reduce((s, p) => s + p.nilai_menurut_dokumen, 0);
  const totalWorkbook = state.posKewajiban.reduce((s, p) => s + p.nilai_menurut_workbook, 0);
  const totalSelisih = state.posKewajiban.reduce((s, p) => s + p.selisih, 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'Sepakat': return 'bg-emerald-100 text-emerald-800';
      case 'Dalam_Penelusuran': return 'bg-amber-100 text-amber-800';
      case 'Sengketa': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = () => {
    const newId = `UT-${String(state.posKewajiban.length + 1).padStart(3, '0')}`;
    const selisih = (formData.nilai_menurut_workbook || 0) - (formData.nilai_menurut_dokumen || 0);
    const newEntry: PosKewajiban = {
      id: newId,
      kode_utang: newId,
      pihak: formData.pihak || '',
      nilai_menurut_dokumen: formData.nilai_menurut_dokumen || 0,
      nilai_menurut_workbook: formData.nilai_menurut_workbook || 0,
      selisih,
      status: formData.status as PosKewajiban['status'],
      keterangan: formData.keterangan || '',
    };

    dispatch({ type: 'ADD_POS_KEWAJIBAN', payload: newEntry });
    dispatch({
      type: 'ADD_AUDIT_LOG',
      payload: {
        id: `LOG-${String(state.auditLog.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        user: 'ADMIN',
        aksi: 'CREATE',
        tabel: 'POS_KEWAJIBAN',
        record_id: newId,
        nilai_lama: '-',
        nilai_baru: `${newEntry.pihak} - Dokumen: ${formatRupiah(newEntry.nilai_menurut_dokumen)} | Workbook: ${formatRupiah(newEntry.nilai_menurut_workbook)}`,
        alasan: 'Input kewajiban baru',
        sumber_bukti: 'Manual input'
      }
    });
    setShowForm(false);
    setFormData({ status: 'Dalam_Penelusuran', nilai_menurut_dokumen: 0, nilai_menurut_workbook: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scale size={24} className="text-amber-500" />
            Pos Kewajiban — Lapisan 3
          </h1>
          <p className="text-gray-500 mt-1">Mencatat utang & komitmen, BUKAN kas. Mencampurnya ke BUKU_KAS akan membuat total pengeluaran salah.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
          <Plus size={18} />
          Tambah Kewajiban
        </button>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-800">Penting: Ini Bukan Pengeluaran Kas</h3>
            <p className="text-sm text-amber-700 mt-1">
              Sistem tidak akan pernah menjumlahkan kedua angka (PDF & Workbook) sebagai "total utang" sampai status berubah menjadi <strong>Sepakat</strong> dan angka yang disepakati dipilih.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Menurut Dokumen (PDF)</p>
          <p className="text-lg font-bold text-gray-900">{formatRupiah(totalDokumen)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Menurut Workbook</p>
          <p className="text-lg font-bold text-gray-900">{formatRupiah(totalWorkbook)}</p>
        </div>
        <div className={`rounded-xl shadow-sm border p-4 ${totalSelisih !== 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <p className="text-xs text-gray-500">Total Selisih</p>
          <p className={`text-lg font-bold ${totalSelisih !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalSelisih)}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Input Kewajiban Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Pihak</label>
              <input type="text" placeholder="Nama penerima" value={formData.pihak || ''}
                onChange={e => setFormData({...formData, pihak: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nilai Menurut Dokumen (Rp)</label>
              <input type="number" value={formData.nilai_menurut_dokumen || ''}
                onChange={e => setFormData({...formData, nilai_menurut_dokumen: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nilai Menurut Workbook (Rp)</label>
              <input type="number" value={formData.nilai_menurut_workbook || ''}
                onChange={e => setFormData({...formData, nilai_menurut_workbook: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as PosKewajiban['status']})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="Sepakat">Sepakat</option>
                <option value="Dalam_Penelusuran">Dalam Penelusuran</option>
                <option value="Sengketa">Sengketa</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Keterangan</label>
              <input type="text" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {formData.nilai_menurut_dokumen !== undefined && formData.nilai_menurut_workbook !== undefined && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Selisih otomatis: <strong className={((formData.nilai_menurut_workbook || 0) - (formData.nilai_menurut_dokumen || 0)) !== 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {formatRupiah((formData.nilai_menurut_workbook || 0) - (formData.nilai_menurut_dokumen || 0))}
                </strong>
              </p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm">Simpan</button>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pihak</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai Dokumen</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nilai Workbook</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Selisih</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.posKewajiban.map(pos => (
                <tr key={pos.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-amber-600">{pos.kode_utang}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{pos.pihak}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(pos.nilai_menurut_dokumen)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(pos.nilai_menurut_workbook)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${pos.selisih !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatRupiah(pos.selisih)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor(pos.status)}`}>
                      {pos.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{pos.keterangan}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(totalDokumen)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(totalWorkbook)}</td>
                <td className={`px-4 py-3 text-right font-bold ${totalSelisih !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalSelisih)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
