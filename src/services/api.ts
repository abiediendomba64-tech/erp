/**
 * Authenticated ERP service helpers.
 * All requests run through the Apps Script HTML Service bridge; this file intentionally
 * does not fetch public GET/POST endpoints, which are disabled on the backend.
 */
import { gasRpc, getActiveWorkspaceId, WorkspaceLoad } from '../lib/gasBridge';
import { generateLabaRugi, generateNeraca } from '../utils/accounting';

async function loadActiveWorkspace(): Promise<WorkspaceLoad> {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) throw new Error('Workspace cloud belum aktif. Masuk lewat URL Web App Google Apps Script terlebih dahulu.');
  return gasRpc<WorkspaceLoad>('workspace.load', { workspaceId });
}

export async function getAllTransaksi(): Promise<any[]> {
  const snapshot = await loadActiveWorkspace();
  const records = snapshot.operational.bukuKas;
  if (!Array.isArray(records)) throw new Error('Data Buku Kas dari cloud tidak valid.');
  return records;
}

/**
 * Transaction writes must currently go through the ERP forms/store so the audit rules,
 * evidence links, and journal status stay consistent. The retired legacy REST endpoint
 * is intentionally not called from the browser.
 */
export async function addTransaksi(_transaksi: {
  tanggal: string;
  jenis: string;
  keterangan: string;
  jumlah: number;
  ppn?: number;
  pihak?: string;
  referensi?: string;
}): Promise<{ success: boolean; transaksi_id: string; jurnal_id: string; jurnal_entries: number; total_debit: number; total_kredit: number }> {
  throw new Error('Pencatatan melalui API lama dinonaktifkan. Gunakan formulir ERP; transaksi harus tervalidasi dan tersimpan melalui store cloud.');
}

export async function updateTransaksi(id: string, data: any): Promise<{ success: boolean; id: string }> {
  void id; void data;
  throw new Error('Transaksi yang sudah dibukukan tidak boleh diubah melalui API. Gunakan alur koreksi/reversal yang sah.');
}

export async function deleteTransaksi(id: string): Promise<{ success: boolean; id: string }> {
  void id;
  throw new Error('Penghapusan transaksi dibatasi untuk menjaga jejak audit. Gunakan alur koreksi/reversal yang sah.');
}

export async function reverseTransaksi(transaksi_id: string, alasan: string): Promise<any> {
  if (!transaksi_id.trim() || !alasan.trim()) throw new Error('ID transaksi dan alasan reversal wajib diisi.');
  throw new Error('Reversal melalui endpoint lama dinonaktifkan. Tidak ada jurnal yang dibalik; gunakan alur koreksi yang sudah tersedia pada modul akuntansi.');
}

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
  if (!imageUrl.trim()) throw new Error('URL foto kwitansi wajib diisi.');
  // Server currently returns ocr_not_enabled until file fetch/storage, request quotas,
  // and provider webhook verification are configured end-to-end. That explicit error
  // is surfaced to the user; the frontend does not pretend it scanned or uploaded data.
  const result = await gasRpc<any>('ocr.scan', { imageUrl: imageUrl.trim(), jenisDokumen });
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
}

export async function getLabaRugi(): Promise<{
  total_pendapatan: number;
  total_beban: number;
  laba_bersih: number;
}> {
  const snapshot = await loadActiveWorkspace();
  const period = new Date().toISOString().slice(0, 7);
  const report = generateLabaRugi(snapshot.accounting.akun as any[], snapshot.accounting.jurnal as any[], period);
  return {
    total_pendapatan: report.total_pendapatan,
    total_beban: report.total_beban,
    laba_bersih: report.laba_bersih,
  };
}

export async function getNeraca(): Promise<{
  total_aset: number;
  total_kewajiban: number;
  total_ekuitas: number;
  balance: boolean;
}> {
  const snapshot = await loadActiveWorkspace();
  const report = generateNeraca(
    snapshot.accounting.akun as any[],
    snapshot.accounting.jurnal as any[],
    new Date().toISOString().slice(0, 10)
  );
  return {
    total_aset: report.aset.total_aset,
    total_kewajiban: report.kewajiban.total_kewajiban,
    total_ekuitas: report.total_ekuitas,
    balance: Math.abs(report.aset.total_aset - report.total_kewajiban_ekuitas) < 0.005,
  };
}

export async function getAllAkun(): Promise<any[]> {
  const snapshot = await loadActiveWorkspace();
  const accounts = snapshot.accounting.akun;
  if (!Array.isArray(accounts)) throw new Error('Daftar akun dari cloud tidak valid.');
  return accounts;
}

export async function uploadToDrive(file: File): Promise<string> {
  void file;
  throw new Error('Upload Google Drive belum diaktifkan pada backend. File tidak diunggah; lampiran saat ini hanya sesuai status yang ditampilkan pada modul.');
}

export async function testConnection(): Promise<boolean> {
  try {
    await gasRpc('auth.me');
    return true;
  } catch (error) {
    console.error('Backend authentication check failed:', error);
    return false;
  }
}
