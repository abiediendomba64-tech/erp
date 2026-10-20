import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { ArsipBukti } from '../types';
import { Plus, FolderArchive, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

export default function ArsipBuktiPage() {
  const { state, dispatch } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<ArsipBukti>>({
    jenis: 'Kwitansi_Foto',
    terverifikasi: 'Perlu_Konfirmasi',
  });

  const filtered = filter === 'all'
    ? state.arsipBukti
    : state.arsipBukti.filter(b => b.terverifikasi === filter);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Ya': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'Tidak': return <XCircle size={16} className="text-red-500" />;
      case 'Perlu_Konfirmasi': return <AlertCircle size={16} className="text-amber-500" />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Ya': return 'bg-emerald-100 text-emerald-800';
      case 'Tidak': return 'bg-red-100 text-red-800';
      case 'Perlu_Konfirmasi': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const jenisColor = (jenis: string) => {
    switch (jenis) {
      case 'Kwitansi_Foto': return 'bg-blue-100 text-blue-700';
      case 'Transfer_Bank': return 'bg-purple-100 text-purple-700';
      case 'BAST': return 'bg-teal-100 text-teal-700';
      case 'Tidak_Ada': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleSubmit = () => {
    const newId = `BUKTI-${String(state.arsipBukti.length + 1).padStart(3, '0')}`;
    const newEntry: ArsipBukti = {
      id: newId,
      kode_bukti: newId,
      jenis: formData.jenis as ArsipBukti['jenis'],
      link_drive: formData.link_drive || '',
      tgl_upload: formData.tgl_upload || new Date().toISOString().split('T')[0],
      terverifikasi: formData.terverifikasi as ArsipBukti['terverifikasi'],
      catatan_audit: formData.catatan_audit || '',
      penerima: formData.penerima || '',
      nominal: formData.nominal || 0,
      keterangan: formData.keterangan || '',
    };

    dispatch({ type: 'ADD_ARSIP_BUKTI', payload: newEntry });
    dispatch({
      type: 'ADD_AUDIT_LOG',
      payload: {
        id: `LOG-${String(state.auditLog.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        user: 'ADMIN',
        aksi: 'CREATE',
        tabel: 'ARSIP_BUKTI',
        record_id: newId,
        nilai_lama: '-',
        nilai_baru: `${newEntry.keterangan} - ${newEntry.penerima} - ${formatRupiah(newEntry.nominal)}`,
        alasan: 'Input bukti baru',
        sumber_bukti: newEntry.jenis
      }
    });
    setShowForm(false);
    setFormData({ jenis: 'Kwitansi_Foto', terverifikasi: 'Perlu_Konfirmasi' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderArchive size={24} className="text-purple-500" />
            Arsip Bukti — Lapisan 2
          </h1>
          <p className="text-gray-500 mt-1">Setiap baris = satu dokumen bukti. File asli di Google Drive, spreadsheet menyimpan metadata & tautan.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
          <Plus size={18} />
          Tambah Bukti
        </button>
      </div>

      {/* Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="text-sm text-purple-800">
          <strong>Cara kerja:</strong> Untuk pelunasan tanpa bukti (mis. Rp46.200.000), buat entri dengan Jenis = Tidak_Ada, Terverifikasi = Perlu_Konfirmasi. BUKU_KAS otomatis menandai transaksi terkait sebagai tidak lengkap.
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Input Bukti Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Kode Bukti</label>
              <input type="text" placeholder="BUKTI-XXX" value={formData.kode_bukti || ''}
                onChange={e => setFormData({...formData, kode_bukti: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Jenis Bukti</label>
              <select value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value as ArsipBukti['jenis']})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="Kwitansi_Foto">Kwitansi Foto</option>
                <option value="Transfer_Bank">Transfer Bank</option>
                <option value="BAST">BAST</option>
                <option value="Tidak_Ada">Tidak Ada</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Terverifikasi</label>
              <select value={formData.terverifikasi} onChange={e => setFormData({...formData, terverifikasi: e.target.value as ArsipBukti['terverifikasi']})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="Ya">Ya</option>
                <option value="Tidak">Tidak</option>
                <option value="Perlu_Konfirmasi">Perlu Konfirmasi</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Penerima</label>
              <input type="text" value={formData.penerima || ''} onChange={e => setFormData({...formData, penerima: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nominal (Rp)</label>
              <input type="number" value={formData.nominal || ''} onChange={e => setFormData({...formData, nominal: Number(e.target.value)})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Link Drive</label>
              <input type="url" placeholder="https://drive.google.com/..." value={formData.link_drive || ''}
                onChange={e => setFormData({...formData, link_drive: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Keterangan</label>
              <input type="text" value={formData.keterangan || ''} onChange={e => setFormData({...formData, keterangan: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tanggal Upload</label>
              <input type="date" value={formData.tgl_upload || ''} onChange={e => setFormData({...formData, tgl_upload: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium text-gray-700">Catatan Audit</label>
              <textarea rows={2} value={formData.catatan_audit || ''} onChange={e => setFormData({...formData, catatan_audit: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Catatan untuk keperluan audit..." />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'Ya', 'Tidak', 'Perlu_Konfirmasi'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'all' ? 'Semua' : f === 'Perlu_Konfirmasi' ? 'Perlu Konfirmasi' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jenis</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Penerima</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Link</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Catatan Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(bukti => (
                <tr key={bukti.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-purple-600">{bukti.kode_bukti}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${jenisColor(bukti.jenis)}`}>
                      {bukti.jenis.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{bukti.penerima}</td>
                  <td className="px-4 py-3 text-gray-600">{bukti.keterangan}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRupiah(bukti.nominal)}</td>
                  <td className="px-4 py-3 text-center">
                    {bukti.link_drive ? (
                      <a href={bukti.link_drive} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                        <ExternalLink size={14} /> 📷
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor(bukti.terverifikasi)}`}>
                      {statusIcon(bukti.terverifikasi)}
                      {bukti.terverifikasi === 'Perlu_Konfirmasi' ? 'Konfirmasi' : bukti.terverifikasi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{bukti.catatan_audit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
