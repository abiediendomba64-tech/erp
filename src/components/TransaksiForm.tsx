import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { formatRupiah, parseRupiah } from '../utils/numberParser';
import { validateTransaction, TransactionKey } from '../utils/transactionGuard';
import { Save, X, AlertCircle } from 'lucide-react';

interface TransaksiFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransaksiForm({ mode, initialData, onClose, onSuccess }: TransaksiFormProps) {
  const { state, dispatch } = useAppContext();
  
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    jenis: 'penjualan_tunai',
    keterangan: '',
    jumlah: '',
    ppn: '',
    pihak: '',
    referensi: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        tanggal: initialData.tanggal || new Date().toISOString().split('T')[0],
        jenis: initialData.jenis || 'penjualan_tunai',
        keterangan: initialData.keterangan || '',
        jumlah: initialData.jumlah?.toString() || '',
        ppn: initialData.ppn?.toString() || '',
        pihak: initialData.pihak || '',
        referensi: initialData.referensi || '',
      });
    }
  }, [mode, initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newWarnings: string[] = [];

    // Required fields
    if (!formData.tanggal) newErrors.tanggal = 'Tanggal wajib diisi';
    if (!formData.keterangan.trim()) newErrors.keterangan = 'Keterangan wajib diisi';
    if (!formData.jumlah) newErrors.jumlah = 'Jumlah wajib diisi';

    // Parse jumlah
    const jumlah = parseRupiah(formData.jumlah);
    if (jumlah <= 0) newErrors.jumlah = 'Jumlah harus lebih dari 0';

    // Parse PPN
    const ppn = formData.ppn ? parseRupiah(formData.ppn) : 0;

    // Check duplicate
    const txKey: TransactionKey = {
      tanggal: formData.tanggal,
      jenis: formData.jenis,
      pihak: formData.pihak,
      nominal: jumlah,
      referensi: formData.referensi,
    };

    const validation = validateTransaction(txKey, []);
    if (!validation.isValid) {
      newErrors.duplicate = validation.errors.join(', ');
    }
    if (validation.warnings.length > 0) {
      newWarnings.push(...validation.warnings);
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const jumlah = parseRupiah(formData.jumlah);
    const ppn = formData.ppn ? parseRupiah(formData.ppn) : 0;

    const transaksi = {
      id: mode === 'edit' ? initialData.id : `TRX-${Date.now()}`,
      tanggal: formData.tanggal,
      jenis: formData.jenis,
      keterangan: formData.keterangan,
      jumlah,
      ppn,
      pihak: formData.pihak,
      referensi: formData.referensi,
      createdAt: new Date().toISOString(),
      createdBy: 'Admin',
    };

    if (mode === 'create') {
      dispatch({ type: 'ADD_TRANSAKSI', payload: transaksi });
    } else {
      dispatch({ type: 'UPDATE_TRANSAKSI', payload: transaksi });
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Input Transaksi Baru' : 'Edit Transaksi'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tanggal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.tanggal}
              onChange={e => handleChange('tanggal', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                errors.tanggal ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.tanggal && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.tanggal}
              </p>
            )}
          </div>

          {/* Jenis Transaksi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Transaksi <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.jenis}
              onChange={e => handleChange('jenis', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="penjualan_tunai">💰 Penjualan Tunai</option>
              <option value="penjualan_kredit">📄 Penjualan Kredit</option>
              <option value="pembelian_tunai">🛒 Pembelian Tunai</option>
              <option value="pembelian_kredit">📦 Pembelian Kredit</option>
              <option value="terima_piutang">💵 Terima Piutang</option>
              <option value="bayar_utang">💸 Bayar Utang</option>
              <option value="beban_operasional">📝 Beban Operasional</option>
            </select>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keterangan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.keterangan}
              onChange={e => handleChange('keterangan', e.target.value)}
              placeholder="Contoh: Penjualan jasa ke PT ABC"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                errors.keterangan ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.keterangan && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.keterangan}
              </p>
            )}
          </div>

          {/* Pihak (untuk kredit) */}
          {(formData.jenis.includes('kredit') || formData.jenis === 'terima_piutang' || formData.jenis === 'bayar_utang') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pihak <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pihak}
                onChange={e => handleChange('pihak', e.target.value)}
                placeholder="Nama pelanggan/supplier"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Jumlah */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.jumlah}
              onChange={e => handleChange('jumlah', e.target.value)}
              placeholder="10000000 atau 10.000.000"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                errors.jumlah ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.jumlah && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.jumlah}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Format: 10000000 atau 10.000.000
            </p>
          </div>

          {/* PPN */}
          {(formData.jenis.includes('penjualan') || formData.jenis.includes('pembelian')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PPN (Rp)
              </label>
              <input
                type="text"
                value={formData.ppn}
                onChange={e => handleChange('ppn', e.target.value)}
                placeholder="0 atau 1.000.000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Opsional - isi jika ada PPN
              </p>
            </div>
          )}

          {/* Referensi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Referensi
            </label>
            <input
              type="text"
              value={formData.referensi}
              onChange={e => handleChange('referensi', e.target.value)}
              placeholder="KW-001, INV-001, dll"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Opsional - untuk mencegah duplikasi
            </p>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-1">⚠️ Peringatan:</p>
              <ul className="text-xs text-amber-700 space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Duplicate Error */}
          {errors.duplicate && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800 mb-1">❌ Error:</p>
              <p className="text-xs text-red-700">{errors.duplicate}</p>
            </div>
          )}

          {/* Preview Total */}
          {formData.jumlah && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-800">
                <strong>Total:</strong> {formatRupiah(parseRupiah(formData.jumlah) + (formData.ppn ? parseRupiah(formData.ppn) : 0))}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Jurnal akan otomatis tergenerate saat transaksi disimpan
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {mode === 'create' ? 'Simpan' : 'Update'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
