// ============ LAYER 1: BUKU KAS ============
export interface BukuKas {
  id: string;
  tgl: string;
  no_ref: string;
  kode_bukti: string;
  keterangan: string;
  kategori: 'Pembebasan_Tanah' | 'Cut_Fill' | 'Operasional' | 'Marketing' | 'Lainnya';
  proyek: string;
  masuk: number;
  keluar: number;
  status_verifikasi: 'LENGKAP' | 'TANPA_BUKTI' | 'PERLU_KONFIRMASI';
}

// ============ LAYER 2: ARSIP BUKTI ============
export interface ArsipBukti {
  id: string;
  kode_bukti: string;
  jenis: 'Kwitansi_Foto' | 'Transfer_Bank' | 'BAST' | 'Tidak_Ada';
  link_drive: string;
  tgl_upload: string;
  terverifikasi: 'Ya' | 'Tidak' | 'Perlu_Konfirmasi';
  catatan_audit: string;
  penerima: string;
  nominal: number;
  keterangan: string;
}

// ============ LAYER 3: POS KEWAJIBAN ============
export interface PosKewajiban {
  id: string;
  kode_utang: string;
  pihak: string;
  nilai_menurut_dokumen: number;
  nilai_menurut_workbook: number;
  selisih: number;
  status: 'Sepakat' | 'Dalam_Penelusuran' | 'Sengketa';
  keterangan: string;
}

// ============ AUDIT LOG ============
export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  aksi: string;
  tabel: string;
  record_id: string;
  nilai_lama: string;
  nilai_baru: string;
  alasan: string;
  sumber_bukti: string;
}

// ============ TANAH (Land Records) ============
export interface Tanah {
  id: string;
  pemilik: string;
  luas_bt: number;
  harga_per_bt: number;
  nilai_total: number;
  dp: number;
  sisa: number;
  status: 'Lunas' | 'DP' | 'Belum_Bayar';
  kode_bukti: string;
  url_bukti: string;
  catatan: string;
}

// ============ BEKO (Excavator Records) ============
export interface Beko {
  id: string;
  item: string;
  panjang: number;
  lebar: number;
  tinggi: number;
  tarif: number;
  nilai: number;
  status: 'Lunas' | 'Belum_Ada_Kwitansi' | 'Foto_Belum_Tersedia';
  kode_bukti: string;
  url_bukti: string;
  catatan: string;
}

// ============ NOTA MATERIAL ============
export interface NotaMaterial {
  id: string;
  nomor_nota: string;
  tanggal: string;
  toko: string;
  keterangan: string;
  nominal: number;
  url_bukti: string;
  status: 'Terverifikasi' | 'Belum_Verifikasi';
}

// ============ USER ROLES ============
export type UserRole = 'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER';

export interface User {
  id: string;
  nama: string;
  role: UserRole;
}

// ============ DASHBOARD SUMMARY ============
export interface DashboardSummary {
  total_kas_masuk: number;
  total_kas_keluar: number;
  saldo: number;
  bukti_lengkap: number;
  bukti_tanpa: number;
  bukti_perlu_konfirmasi: number;
  total_kewajiban: number;
  kewajiban_sepakat: number;
  kewajiban_penelusuran: number;
  total_tanah: number;
  total_beko: number;
  total_nota: number;
}
