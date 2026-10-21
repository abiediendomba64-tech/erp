import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Scan, Camera, Upload, Sparkles } from 'lucide-react';

export default function OCRPage() {
  const { state } = useAppContext();
  const [showUpload, setShowUpload] = useState(false);

  const terverifikasi = state.ocr.filter(o => o.status === 'Terverifikasi');
  const pending = state.ocr.filter(o => o.status === 'Pending');
  const avgConfidence = state.ocr.length > 0 ? state.ocr.reduce((s, o) => s + o.confidence, 0) / state.ocr.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Scan size={24} className="text-violet-500" />OCR / Vision AI</h1><p className="text-gray-500 mt-1">Ekstraksi data otomatis dari foto kwitansi/nota menggunakan Gemini Vision API</p></div>
        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"><Upload size={18} />Upload & Scan</button>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <h3 className="font-semibold text-violet-800 flex items-center gap-2"><Sparkles size={16} />Cara Kerja OCR + Vision AI</h3>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">1</div><p className="text-xs text-violet-800 font-medium">Upload Foto</p><p className="text-xs text-violet-600">Foto kwitansi/nota dari HP atau Drive</p></div>
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">2</div><p className="text-xs text-violet-800 font-medium">Gemini Vision</p><p className="text-xs text-violet-600">AI membaca teks, nominal, tanggal, penerima</p></div>
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">3</div><p className="text-xs text-violet-800 font-medium">Auto-Matching</p><p className="text-xs text-violet-600">Cocokkan dengan data spreadsheet & buku kas</p></div>
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">4</div><p className="text-xs text-violet-800 font-medium">Verifikasi</p><p className="text-xs text-violet-600">Konfirmasi hasil atau minta scan ulang</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Scan</p><p className="text-xl font-bold">{state.ocr.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Terverifikasi</p><p className="text-xl font-bold text-emerald-600">{terverifikasi.length}</p></div>
        <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4"><p className="text-xs text-amber-600">Pending</p><p className="text-xl font-bold text-amber-600">{pending.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Avg Confidence</p><p className="text-xl font-bold text-violet-600">{avgConfidence.toFixed(0)}%</p></div>
      </div>

      {showUpload && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Camera size={18} className="text-violet-500" />Upload & Scan Dokumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700">Jenis Dokumen</label><select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Kwitansi</option><option>Nota</option><option>Transfer Bank</option><option>Lainnya</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">URL Gambar / Drive Link</label><input type="url" placeholder="https://drive.google.com/..." className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="mt-4 border-2 border-dashed border-violet-300 rounded-xl p-8 text-center bg-violet-50/50">
            <Camera size={40} className="mx-auto text-violet-400 mb-2" />
            <p className="text-sm text-violet-700 font-medium">Drop foto kwitansi/nota di sini</p>
            <p className="text-xs text-violet-500 mt-1">atau klik untuk browse dari perangkat Anda</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-700 flex items-center gap-2"><Sparkles size={14} />Scan dengan AI</button>
            <button onClick={() => setShowUpload(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Hasil Scan OCR</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="text-left px-4 py-3 font-medium text-gray-600">ID</th><th className="text-left px-4 py-3 font-medium text-gray-600">Jenis</th><th className="text-left px-4 py-3 font-medium text-gray-600">Penerima</th><th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th><th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th><th className="text-center px-4 py-3 font-medium text-gray-600">Confidence</th><th className="text-center px-4 py-3 font-medium text-gray-600">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.ocr.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-violet-600">{o.id}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded">{o.jenis_dokumen}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.data_ekstrak.penerima || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{o.data_ekstrak.nominal ? formatRupiah(o.data_ekstrak.nominal) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{o.data_ekstrak.tanggal || '—'}</td>
                  <td className="px-4 py-3 text-center"><div className="flex items-center gap-2 justify-center"><div className="w-16 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${o.confidence > 80 ? 'bg-emerald-500' : o.confidence > 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${o.confidence}%` }}></div></div><span className="text-xs font-bold">{o.confidence}%</span></div></td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${o.status === 'Terverifikasi' ? 'bg-emerald-100 text-emerald-800' : o.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
