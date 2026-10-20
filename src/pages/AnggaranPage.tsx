import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Anggaran, ArusKas } from '../types';
import { Plus, PieChart, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function AnggaranPage() {
  const { state, dispatch } = useAppContext();
  const [showFormAnggaran, setShowFormAnggaran] = useState(false);
  const [showFormArusKas, setShowFormArusKas] = useState(false);
  const [tab, setTab] = useState<'anggaran' | 'aruskas'>('anggaran');
  const [formDataAnggaran, setFormDataAnggaran] = useState<Partial<Anggaran>>({ anggaran: 0, realisasi: 0 });
  const [formDataArusKas, setFormDataArusKas] = useState<Partial<ArusKas>>({ kategori: 'Operasional', masuk: 0, keluar: 0 });

  const totalAnggaran = state.anggaran.reduce((s, a) => s + a.anggaran, 0);
  const totalRealisasi = state.anggaran.reduce((s, a) => s + a.realisasi, 0);
  const totalSisa = state.anggaran.reduce((s, a) => s + a.sisa, 0);
  const overBudget = state.anggaran.filter(a => a.realisasi > a.anggaran);

  const saldoAkhir = state.arusKas.length > 0 ? state.arusKas[state.arusKas.length - 1].saldo : 0;

  const handleSubmitAnggaran = () => {
    const newId = `AG-${String(state.anggaran.length + 1).padStart(3, '0')}`;
    const anggaran = formDataAnggaran.anggaran || 0;
    const realisasi = formDataAnggaran.realisasi || 0;
    const newEntry: Anggaran = {
      id: newId, kategori: formDataAnggaran.kategori || '', anggaran, realisasi,
      sisa: anggaran - realisasi, persentase: anggaran > 0 ? (realisasi / anggaran) * 100 : 0,
      periode: formDataAnggaran.periode || '2024', catatan: formDataAnggaran.catatan || '',
    };
    dispatch({ type: 'ADD_ANGGARAN', payload: newEntry });
    setShowFormAnggaran(false);
  };

  const handleSubmitArusKas = () => {
    const newId = `AK-${String(state.arusKas.length + 1).padStart(3, '0')}`;
    const lastSaldo = state.arusKas.length > 0 ? state.arusKas[state.arusKas.length - 1].saldo : 0;
    const saldo = lastSaldo + (formDataArusKas.masuk || 0) - (formDataArusKas.keluar || 0);
    const newEntry: ArusKas = {
      id: newId, tanggal: formDataArusKas.tanggal || new Date().toISOString().split('T')[0],
      keterangan: formDataArusKas.keterangan || '', kategori: formDataArusKas.kategori as ArusKas['kategori'],
      masuk: formDataArusKas.masuk || 0, keluar: formDataArusKas.keluar || 0, saldo,
      referensi: formDataArusKas.referensi || '',
    };
    dispatch({ type: 'ADD_ARUS_KAS', payload: newEntry });
    setShowFormArusKas(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><PieChart size={24} className="text-indigo-500" />Anggaran & Arus Kas</h1>
          <p className="text-gray-500 mt-1">Monitoring anggaran vs realisasi dan arus kas operasional, investasi, pendanaan</p>
        </div>
        <div className="flex gap-2">
          {tab === 'anggaran' && <button onClick={() => setShowFormAnggaran(!showFormAnggaran)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"><Plus size={16} />Anggaran</button>}
          {tab === 'aruskas' && <button onClick={() => setShowFormArusKas(!showFormArusKas)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"><Plus size={16} />Arus Kas</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab('anggaran')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'anggaran' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Anggaran</button>
        <button onClick={() => setTab('aruskas')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'aruskas' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Arus Kas</button>
      </div>

      {/* Summary */}
      {tab === 'anggaran' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Anggaran</p><p className="text-xl font-bold text-indigo-600">{formatRupiah(totalAnggaran)}</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Realisasi</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(totalRealisasi)}</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Sisa Anggaran</p><p className="text-xl font-bold text-blue-600">{formatRupiah(totalSisa)}</p></div>
            <div className={`rounded-xl shadow-sm border p-4 ${overBudget.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}><p className="text-xs text-gray-500 flex items-center gap-1">{overBudget.length > 0 && <AlertTriangle size={12} />}Over Budget</p><p className="text-xl font-bold text-red-600">{overBudget.length} kategori</p></div>
          </div>

          {overBudget.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={16} />Peringatan Over Budget</h3>
              <div className="mt-2 space-y-1">
                {overBudget.map(a => (
                  <p key={a.id} className="text-sm text-red-700">{a.kategori}: Realisasi {formatRupiah(a.realisasi)} melebihi anggaran {formatRupiah(a.anggaran)} (selisih: {formatRupiah(a.realisasi - a.anggaran)})</p>
                ))}
              </div>
            </div>
          )}

          {showFormAnggaran && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Input Anggaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-gray-700">Kategori</label><input type="text" value={formDataAnggaran.kategori || ''} onChange={e => setFormDataAnggaran({...formDataAnggaran, kategori: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Anggaran (Rp)</label><input type="number" value={formDataAnggaran.anggaran || ''} onChange={e => setFormDataAnggaran({...formDataAnggaran, anggaran: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Realisasi (Rp)</label><input type="number" value={formDataAnggaran.realisasi || ''} onChange={e => setFormDataAnggaran({...formDataAnggaran, realisasi: Number(e.target.value)})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Periode</label><input type="text" value={formDataAnggaran.periode || ''} onChange={e => setFormDataAnggaran({...formDataAnggaran, periode: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700">Catatan</label><input type="text" value={formDataAnggaran.catatan || ''} onChange={e => setFormDataAnggaran({...formDataAnggaran, catatan: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={handleSubmitAnggaran} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
                <button onClick={() => setShowFormAnggaran(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
              </div>
            </div>
          )}

          {/* Anggaran Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Anggaran</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Realisasi</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Sisa</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">% Terpakai</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.anggaran.map(a => (
                    <tr key={a.id} className={`hover:bg-gray-50 ${a.realisasi > a.anggaran ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{a.kategori}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(a.anggaran)}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(a.realisasi)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${a.sisa < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(a.sisa)}</td>
                      <td className="px-4 py-3 text-center"><span className={`text-xs font-bold ${a.persentase > 100 ? 'text-red-600' : a.persentase > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{a.persentase.toFixed(1)}%</span></td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${a.persentase > 100 ? 'bg-red-500' : a.persentase > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(a.persentase, 100)}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-700">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold">{formatRupiah(totalAnggaran)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatRupiah(totalRealisasi)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${totalSisa < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(totalSisa)}</td>
                    <td className="px-4 py-3 text-center font-bold">{totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : 0}%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'aruskas' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp size={12} className="text-emerald-500" />Total Masuk</p><p className="text-xl font-bold text-emerald-600">{formatRupiah(state.arusKas.reduce((s, a) => s + a.masuk, 0))}</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500 flex items-center gap-1"><TrendingDown size={12} className="text-red-500" />Total Keluar</p><p className="text-xl font-bold text-red-600">{formatRupiah(state.arusKas.reduce((s, a) => s + a.keluar, 0))}</p></div>
            <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 p-4"><p className="text-xs text-indigo-600">Saldo Akhir</p><p className="text-xl font-bold text-indigo-700">{formatRupiah(saldoAkhir)}</p></div>
          </div>

          {showFormArusKas && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Input Arus Kas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" value={formDataArusKas.tanggal || ''} onChange={e => setFormDataArusKas({...formDataArusKas, tanggal: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium text-gray-700">Keterangan</label><input type="text" value={formDataArusKas.keterangan || ''} onChange={e => setFormDataArusKas({...formDataArusKas, keterangan: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Kategori</label><select value={formDataArusKas.kategori} onChange={e => setFormDataArusKas({...formDataArusKas, kategori: e.target.value as ArusKas['kategori']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Operasional">Operasional</option><option value="Investasi">Investasi</option><option value="Pendanaan">Pendanaan</option></select></div>
                <div><label className="text-sm font-medium text-gray-700">Masuk (Rp)</label><input type="number" value={formDataArusKas.masuk || ''} onChange={e => setFormDataArusKas({...formDataArusKas, masuk: Number(e.target.value), keluar: 0})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Keluar (Rp)</label><input type="number" value={formDataArusKas.keluar || ''} onChange={e => setFormDataArusKas({...formDataArusKas, keluar: Number(e.target.value), masuk: 0})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Referensi</label><input type="text" value={formDataArusKas.referensi || ''} onChange={e => setFormDataArusKas({...formDataArusKas, referensi: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={handleSubmitArusKas} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
                <button onClick={() => setShowFormArusKas(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Kategori</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Masuk</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Keluar</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.arusKas.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{a.tanggal}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{a.keterangan}</td>
                      <td className="px-4 py-3 text-center"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{a.kategori}</span></td>
                      <td className="px-4 py-3 text-right text-emerald-600">{a.masuk > 0 ? formatRupiah(a.masuk) : '—'}</td>
                      <td className="px-4 py-3 text-right text-red-600">{a.keluar > 0 ? formatRupiah(a.keluar) : '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(a.saldo)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.referensi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
