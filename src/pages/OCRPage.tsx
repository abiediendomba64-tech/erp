import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { Scan, Camera, Upload, Sparkles } from 'lucide-react';
import { scanKwitansi } from '../services/api';
import type { OCRResult } from '../types';

export default function OCRPage() {
  const { state, dispatch } = useAppContext();
  const [showUpload, setShowUpload] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [jenisDokumen, setJenisDokumen] = useState<OCRResult['jenis_dokumen']>('Kwitansi');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  const terverifikasi = state.ocr.filter(o => o.status === 'Terverifikasi');
  const pending = state.ocr.filter(o => o.status === 'Pending');
  const avgConfidence = state.ocr.length > 0 ? state.ocr.reduce((s, o) => s + o.confidence, 0) / state.ocr.length : 0;

  const handleScan = async () => {
    setScanError('');
    setScanMessage('');
    if (!imageUrl.trim()) {
      setScanError('Masukkan URL gambar terlebih dahulu. Form ini belum mengunggah file dari perangkat.');
      return;
    }

    setScanning(true);
    try {
      const result = await scanKwitansi(imageUrl.trim(), jenisDokumen);
      if (!result.penerima && result.nominal === undefined && !result.tanggal && !result.keterangan) {
        throw new Error('OCR tidak mengembalikan field yang dapat digunakan. Periksa URL gambar dan coba lagi.');
      }

      const record: OCRResult = {
        id: 'OCR-' + Date.now(),
        timestamp: new Date().toISOString(),
        image_url: imageUrl.trim(),
        jenis_dokumen: jenisDokumen,
        data_ekstrak: {
          penerima: result.penerima,
          nominal: result.nominal,
          tanggal: result.tanggal,
          nomor_bukti: result.nomor_bukti,
          keterangan: result.keterangan,
        },
        confidence: Math.max(0, Math.min(100, result.confidence ?? 0)),
        status: 'Pending',
        catatan: 'Hasil OCR belum diverifikasi manusia dan tidak otomatis masuk jurnal atau buku kas.',
      };
      dispatch({ type: 'ADD_OCR', payload: record });
      setScanMessage('Hasil tersimpan dengan status Pending. Periksa bukti dan data sebelum pembukuan.');
      setShowUpload(false);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Scan size={24} className="text-violet-500" />OCR / Vision AI</h1><p className="text-gray-500 mt-1">Ekstraksi OCR dari URL gambar; hasil tetap Pending sampai diperiksa manusia</p></div>
        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"><Upload size={18} />Scan dari URL</button>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <h3 className="font-semibold text-violet-800 flex items-center gap-2"><Sparkles size={16} />Cara Kerja OCR + Vision AI</h3>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">1</div><p className="text-xs text-violet-800 font-medium">Masukkan URL</p><p className="text-xs text-violet-600">Gambar harus dapat diakses Apps Script</p></div>
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">2</div><p className="text-xs text-violet-800 font-medium">Gemini Vision</p><p className="text-xs text-violet-600">AI membaca teks, nominal, tanggal, penerima</p></div>
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">3</div><p className="text-xs text-violet-800 font-medium">Simpan Pending</p><p className="text-xs text-violet-600">OCR tidak membuat jurnal otomatis</p></div>
          <div className="bg-white rounded-lg p-3 border border-violet-100"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm mb-2">4</div><p className="text-xs text-violet-800 font-medium">Review Manual</p><p className="text-xs text-violet-600">Confidence bukan persetujuan</p></div>
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
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Camera size={18} className="text-violet-500" />Scan URL Gambar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700">Jenis Dokumen</label><select value={jenisDokumen} onChange={event => setJenisDokumen(event.target.value as OCRResult['jenis_dokumen'])} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="Kwitansi">Kwitansi</option><option value="Nota">Nota</option><option value="Transfer_Bank">Transfer Bank</option><option value="Lainnya">Lainnya</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">URL Gambar Publik</label><input type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://contoh.com/bukti.jpg" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Form ini mengirim URL ke Apps Script; belum ada upload file lokal ke Drive. Link Drive privat mungkin tidak dapat dibaca. Backend harus dikonfigurasi melalui VITE_ERP_API_URL sebelum scan dapat digunakan.</p>
          {scanError && <p role="alert" className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{scanError}</p>}
          {scanMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">{scanMessage}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={handleScan} disabled={scanning || !imageUrl.trim()} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"><Sparkles size={14} />{scanning ? 'Sedang memproses…' : 'Scan URL dengan AI'}</button>
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
