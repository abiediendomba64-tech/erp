/**
 * API Service - Connect React App to Google Apps Script Backend
 * 
 * Cara Penggunaan:
 * 1. Deploy Apps Script sebagai Web App
 * 2. Copy URL deployment
 * 3. Ganti API_BASE_URL di bawah
 * 4. Import dan gunakan di komponen React
 */

// Set VITE_ERP_API_URL ke URL deployment Google Apps Script pada environment build.
const API_BASE_URL = String((import.meta as any).env?.VITE_ERP_API_URL || '').trim().replace(/\/$/, '');

function getApiUrl(path: string): string {
  if (!API_BASE_URL || API_BASE_URL.includes('YOUR_DEPLOYMENT_ID')) {
    throw new Error('ERP API belum dikonfigurasi. Set VITE_ERP_API_URL ke URL Web App Apps Script; aplikasi tidak akan berpura-pura tersambung.');
  }
  const separator = API_BASE_URL.includes('?') ? '&' : '?';
  return `${API_BASE_URL}${separator}path=${encodeURIComponent(path)}`;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`ERP API gagal (HTTP ${response.status}).`);
  if (payload && typeof payload === 'object' && payload.success === false) {
    throw new Error(String(payload.error || payload.message || 'ERP API menolak permintaan.'));
  }
  return payload as T;
}

const jsonRequestHeaders = { 'Content-Type': 'text/plain;charset=utf-8' };

// ============ TRANSAKSI API ============

/**
 * Get semua transaksi
 */
export async function getAllTransaksi(): Promise<any[]> {
  try {
    const response = await fetch(getApiUrl('/transaksi'));
    return await readApiResponse<any[]>(response);
  } catch (error) {
    console.error('Error getting transaksi:', error);
    throw error;
  }
}

/**
 * Tambah transaksi baru
 */
export async function addTransaksi(transaksi: {
  tanggal: string;
  jenis: string;
  keterangan: string;
  jumlah: number;
  ppn?: number;
  pihak?: string;
  referensi?: string;
}): Promise<{ success: boolean; transaksi_id: string; jurnal_id: string; jurnal_entries: number; total_debit: number; total_kredit: number }> {
  try {
    const response = await fetch(getApiUrl('/transaksi'), {
      method: 'POST',
      headers: jsonRequestHeaders,
      body: JSON.stringify(transaksi)
    });
    
    return await readApiResponse<{ success: boolean; transaksi_id: string; jurnal_id: string; jurnal_entries: number; total_debit: number; total_kredit: number }>(response);
  } catch (error) {
    console.error('Error adding transaksi:', error);
    throw error;
  }
}

/**
 * Update transaksi
 */
export async function updateTransaksi(id: string, data: any): Promise<{ success: boolean; id: string }> {
  void id;
  void data;
  throw new Error('Update transaksi yang sudah dibukukan tidak didukung. Buat jurnal reversal lalu catat transaksi yang benar agar jejak audit tetap utuh.');
}

/**
 * Hapus transaksi
 */
export async function deleteTransaksi(id: string): Promise<{ success: boolean; id: string }> {
  void id;
  throw new Error('Penghapusan transaksi yang sudah dibukukan dinonaktifkan. Gunakan reversal jurnal agar saldo dan jejak audit tetap dapat ditelusuri.');
}

export async function reverseTransaksi(transaksi_id: string, alasan: string): Promise<any> {
  if (!transaksi_id.trim() || !alasan.trim()) {
    throw new Error('ID transaksi dan alasan reversal wajib diisi.');
  }
  const response = await fetch(getApiUrl('/reversal'), {
    method: 'POST',
    headers: jsonRequestHeaders,
    body: JSON.stringify({ transaksi_id, alasan })
  });
  return await readApiResponse<any>(response);
}

// ============ OCR API ============

/**
 * Scan foto kwitansi dengan Gemini API
 */
export async function scanKwitansi(
  imageUrl: string,
  jenisDokumen: 'Kwitansi' | 'Nota' | 'Transfer_Bank' | 'Lainnya' = 'Kwitansi'
): Promise<{
  penerima?: string;
  nominal?: number;
  tanggal?: string;
  nomor_bukti?: string;
  keterangan?: string;
  confidence?: number;
}> {
  try {
    if (!imageUrl.trim()) throw new Error('URL foto kwitansi wajib diisi.');
    const response = await fetch(getApiUrl('/ocr'), {
      method: 'POST',
      headers: jsonRequestHeaders,
      body: JSON.stringify({ imageUrl, jenisDokumen })
    });
    
    const result = await readApiResponse<any>(response);
    const data = result && result.data ? result.data : result;
    return {
      penerima: data.vendor ?? data.penerima ?? undefined,
      nominal: data.total == null && data.nominal == null
        ? undefined
        : Number.isFinite(Number(data.total ?? data.nominal)) ? Number(data.total ?? data.nominal) : undefined,
      tanggal: data.tanggal ?? undefined,
      nomor_bukti: data.nomor_bukti ?? undefined,
      keterangan: data.keterangan ?? undefined,
      confidence: data.confidence == null
        ? undefined
        : Number.isFinite(Number(data.confidence)) ? Number(data.confidence) : undefined,
    };
  } catch (error) {
    console.error('Error scanning kwitansi:', error);
    throw error;
  }
}

// ============ LAPORAN API ============

/**
 * Get laporan Laba Rugi
 */
export async function getLabaRugi(): Promise<{
  total_pendapatan: number;
  total_beban: number;
  laba_bersih: number;
}> {
  try {
    const response = await fetch(getApiUrl('/laporan/laba-rugi'));
    return await readApiResponse<{ total_pendapatan: number; total_beban: number; laba_bersih: number }>(response);
  } catch (error) {
    console.error('Error getting laba rugi:', error);
    throw error;
  }
}

/**
 * Get laporan Neraca
 */
export async function getNeraca(): Promise<{
  total_aset: number;
  total_kewajiban: number;
  total_ekuitas: number;
  balance: boolean;
}> {
  try {
    const response = await fetch(getApiUrl('/laporan/neraca'));
    return await readApiResponse<{ total_aset: number; total_kewajiban: number; total_ekuitas: number; balance: boolean }>(response);
  } catch (error) {
    console.error('Error getting neraca:', error);
    throw error;
  }
}

// ============ AKUN API ============

/**
 * Get semua akun (Chart of Accounts)
 */
export async function getAllAkun(): Promise<any[]> {
  try {
    const response = await fetch(getApiUrl('/akun'));
    return await readApiResponse<any[]>(response);
  } catch (error) {
    console.error('Error getting akun:', error);
    throw error;
  }
}

// ============ HELPER FUNCTIONS ============

/**
 * Upload file ke Google Drive dan return URL
 * (Perlu setup Google Drive API terpisah)
 */
export async function uploadToDrive(file: File): Promise<string> {
  // Jangan mengembalikan string kosong seolah-olah upload sukses.
  void file;
  throw new Error('Upload Google Drive belum diimplementasikan pada backend. File tidak diunggah.');

}

/**
 * Test koneksi ke API
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl('/akun'));
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

// ============ USAGE EXAMPLES ============

/*
// Contoh penggunaan di React component:

import { getAllTransaksi, addTransaksi, scanKwitansi } from '../services/api';

function TransaksiPage() {
  const [transaksi, setTransaksi] = useState([]);
  
  // Load data saat component mount
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    const data = await getAllTransaksi();
    setTransaksi(data);
  }
  
  // Tambah transaksi
  async function handleAdd() {
    const result = await addTransaksi({
      tanggal: '2026-10-21',
      jenis: 'penjualan_tunai',
      keterangan: 'Penjualan jasa',
      jumlah: 10000000,
      ppn: 1000000
    });
    
    if (result.success) {
      alert('Transaksi berhasil ditambah!');
      loadData(); // Reload data
    }
  }
  
  // Scan kwitansi
  async function handleScan() {
    const imageUrl = 'https://drive.google.com/...'; // URL foto di Drive
    const result = await scanKwitansi(imageUrl);
    
    console.log('Hasil OCR:', result);
    // result.penerima, result.nominal, result.tanggal, dll
  }
  
  return (
    <div>
      <button onClick={handleAdd}>Tambah Transaksi</button>
      <button onClick={handleScan}>Scan Kwitansi</button>
      
      <table>
        {transaksi.map(t => (
          <tr key={t.id}>
            <td>{t.tanggal}</td>
            <td>{t.keterangan}</td>
            <td>{t.jumlah}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
*/
