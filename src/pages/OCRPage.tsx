import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { OCRResult } from '../types';
import { Scan, Camera, CheckCircle, XCircle, Clock, Sparkles, Upload, AlertCircle } from 'lucide-react';

export default function OCRPage() {
  const { state, dispatch } = useAppContext();
  const [showUpload, setShowUpload] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadForm, setUploadForm] = useState({ jenis_dokumen: 'Kwitansi' as OCRResult['jenis_dokumen'], image_url: '' });

  const terverifikasi = state.ocr.filter(o => o.status === 'Terverifikasi');
  const pending = state.ocr.filter(o => o.status === 'Pending');
  const ditolak = state.ocr.filter(o => o.status === 'Ditolak');
  const avgConfidence = state.ocr.length > 0 ? state.ocr.reduce((s, o) => s + o.confidence, 0) / state.ocr.length : 0;

  const simulateOCR = () => {
    setProcessing(true);
    setTimeout(() => {
      const newId = `OCR-${String(state.ocr.length + 1).padStart(3, '0')}`;
      const mockResults = [
        { penerima: 'CV Maju Jaya', nominal: 5500000, tanggal: new Date().toISOString().split('T')[0], nomor_bukti: `KW-${Date.now().toString().slice(-4)}`, keterangan: 'Pembelian material' },
        { penerima: 'Toko Bangunan Sejahtera', nominal: 2800000, tanggal: new Date().toISOString().split('T')[0], nomor_bukti: `NT-${Date.now().toString().slice(-4)}`, keterangan: 'Semen & pasir' },
        { penerima: 'Operator Beko', nominal: 8500000, tanggal: new Date().toISOString().split('T')[0], nomor_bukti: `KW-${Date.now().toString().slice(-4)}`, keterangan: 'Sewa beko 3 hari' },
      ];
      const random = mockResults[Math.floor(Math.random() * mockResults.length)];
      const confidence = Math.floor(Math.random() * 30) + 70;

      const newEntry: OCRResult = {
        id: newId, timestamp: new Date().toISOString(), image_url: uploadForm.image_url || '#',
        jenis_dokumen: uploadForm.jenis_dokumen, data_ekstrak: random, confidence,
        status: confidence > 80 ? 'Terverifikasi' : 'Pending',
        catatan: confidence > 80 ? 'Hasil OCR cocok, siap diverifikasi' : 'Confidence rendah, perlu verifikasi manual',
      };
      dispatch({ type: 'ADD_OCR', payload: newEntry });
      dispatch({ type: 'ADD_AUDIT_LOG', payload: { id: `LOG-${Date.now()}`, timestamp: new Date().toISOString(), user: 'SYSTEM', aksi: 'CREATE', tabel: 'OCR', record_id: newId, nilai_lama: '-', nilai_baru: `OCR: ${random.penerima} - ${formatRupiah(random.nominal || 0)} (${confidence}%)`, alasan: 'Auto-extract dari foto', sumber_bukti: `Gemini Vision API (simulasi)` } });
      setProcessing(false);
      setShowUpload(false);
    }, 2000);
  };

  const statusColor = (s: string) => {
    switch (s) { case 'Terverifikasi': return 'bg-emerald-100 text-emerald-800'; case 'Pending': return 'bg-amber-100 text-amber-800'; case 'Ditolak': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Scan size={24} className="text-violet-500" />OCR / Vision AI</h1>
          <p className="text-gray-500 mt-1">Ekstraksi data otomatis dari foto kwitansi/nota menggunakan Gemini Vision API</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"><Upload size={18} />Upload & Scan</button>
      </div>

      {/* How it works */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <h3 className="font-semibold text-violet-800 flex items-center gap-2"><Sparkles size={16} />Cara Kerja OCR + Vision AI</h3>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 border border-violet-100">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">1</div>
            <p className="text-xs text-violet-800 font-medium">Upload Foto</p>
            <p className="text-xs text-violet-600">Foto kwitansi/nota dari HP atau Drive</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-violet-100">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">2</div>
            <p className="text-xs text-violet-800 font-medium">Gemini Vision</p>
            <p className="text-xs text-violet-600">AI membaca teks, nominal, tanggal, penerima</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-violet-100">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">3</div>
            <p className="text-xs text-violet-800 font-medium">Auto-Matching</p>
            <p className="text-xs text-violet-600">Cocokkan dengan data spreadsheet & buku kas</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-violet-100">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">4</div>
            <p className="text-xs text-violet-800 font-medium">Verifikasi</p>
            <p className="text-xs text-violet-600">Konfirmasi hasil atau minta scan ulang</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Scan</p><p className="text-xl font-bold">{state.ocr.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Terverifikasi</p><p className="text-xl font-bold text-emerald-600">{terverifikasi.length}</p></div>
        <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4"><p className="text-xs text-amber-600">Pending</p><p className="text-xl font-bold text-amber-600">{pending.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Avg Confidence</p><p className="text-xl font-bold text-violet-600">{avgConfidence.toFixed(0)}%</p></div>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Camera size={18} className="text-violet-500" />Upload & Scan Dokumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Jenis Dokumen</label>
              <select value={uploadForm.jenis_dokumen} onChange={e => setUploadForm({...uploadForm, jenis_dokumen: e.target.value as OCRResult['jenis_dokumen']})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="Kwitansi">Kwitansi</option>
                <option value="Nota">Nota</option>
                <option value="Transfer_Bank">Transfer Bank</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">URL Gambar / Drive Link</label>
              <input type="url" placeholder="https://drive.google.com/..." value={uploadForm.image_url} onChange={e => setUploadForm({...uploadForm, image_url: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-4 border-2 border-dashed border-violet-300 rounded-xl p-8 text-center bg-violet-50/50">
            <Camera size={40} className="mx-auto text-violet-400 mb-2" />
            <p className="text-sm text-violet-700 font-medium">Drop foto kwitansi/nota di sini</p>
            <p className="text-xs text-violet-500 mt-1">atau klik untuk browse dari perangkat Anda</p>
            <p className="text-xs text-violet-400 mt-2">Mendukung: JPG, PNG, PDF (max 10MB)</p>
          </div>
          {processing && (
            <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-200 flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full"></div>
              <p className="text-sm text-violet-700">Gemini Vision sedang menganalisis dokumen...</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button onClick={simulateOCR} disabled={processing} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"><Sparkles size={14} />{processing ? 'Memproses...' : 'Scan dengan AI'}</button>
            <button onClick={() => setShowUpload(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Hasil Scan OCR</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jenis</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Penerima</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No Bukti</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Confidence</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.ocr.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-violet-600">{o.id}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded">{o.jenis_dokumen}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.data_ekstrak.penerima || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{o.data_ekstrak.nominal ? formatRupiah(o.data_ekstrak.nominal) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{o.data_ekstrak.tanggal || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{o.data_ekstrak.nomor_bukti || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${o.confidence > 80 ? 'bg-emerald-500' : o.confidence > 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${o.confidence}%` }}></div>
                      </div>
                      <span className="text-xs font-bold">{o.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(o.status)}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Integrasi dengan Sistem</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800 font-medium">📊 Spreadsheet</p>
            <p className="text-xs text-blue-600 mt-1">Hasil OCR otomatis masuk ke Google Sheets (MASTER_TANAH, BEKO, dll)</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xs text-green-800 font-medium">💬 WhatsApp</p>
            <p className="text-xs text-green-600 mt-1">Foto dari WhatsApp langsung di-scan via n8n webhook</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-800 font-medium">🔗 Web App</p>
            <p className="text-xs text-purple-600 mt-1">Upload langsung dari web app → OCR → auto-entry buku kas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
