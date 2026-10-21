/**
 * API Service - Connect React App to Google Apps Script Backend
 * 
 * Cara Penggunaan:
 * 1. Deploy Apps Script sebagai Web App
 * 2. Copy URL deployment
 * 3. Ganti API_BASE_URL di bawah
 * 4. Import dan gunakan di komponen React
 */

// GANTI DENGAN URL DEPLOYMENT ANDA
const API_BASE_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

// ============ TRANSAKSI API ============

/**
 * Get semua transaksi
 */
export async function getAllTransaksi(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi`);
    if (!response.ok) throw new Error('Failed to fetch transaksi');
    return await response.json();
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
}): Promise<{ success: boolean; id: string; jurnal: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaksi)
    });
    
    if (!response.ok) throw new Error('Failed to add transaksi');
    return await response.json();
  } catch (error) {
    console.error('Error adding transaksi:', error);
    throw error;
  }
}

/**
 * Update transaksi
 */
export async function updateTransaksi(id: string, data: any): Promise<{ success: boolean; id: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Failed to update transaksi');
    return await response.json();
  } catch (error) {
    console.error('Error updating transaksi:', error);
    throw error;
  }
}

/**
 * Hapus transaksi
 */
export async function deleteTransaksi(id: string): Promise<{ success: boolean; id: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete transaksi');
    return await response.json();
  } catch (error) {
    console.error('Error deleting transaksi:', error);
    throw error;
  }
}

// ============ OCR API ============

/**
 * Scan foto kwitansi dengan Gemini API
 */
export async function scanKwitansi(imageUrl: string): Promise<{
  penerima?: string;
  nominal?: number;
  tanggal?: string;
  nomor_bukti?: string;
  keterangan?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}?path=/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl })
    });
    
    if (!response.ok) throw new Error('Failed to scan kwitansi');
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}?path=/laporan/laba-rugi`);
    if (!response.ok) throw new Error('Failed to fetch laba rugi');
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}?path=/laporan/neraca`);
    if (!response.ok) throw new Error('Failed to fetch neraca');
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}?path=/akun`);
    if (!response.ok) throw new Error('Failed to fetch akun');
    return await response.json();
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
  // Implementasi ini memerlukan Google Drive API
  // Untuk saat ini, gunakan manual upload ke Drive
  
  alert('Upload ke Drive belum tersedia. Silakan upload manual ke Google Drive dan copy link.');
  return '';
}

/**
 * Test koneksi ke API
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}?path=/akun`);
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
