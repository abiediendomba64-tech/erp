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

// ============ ERP MODULES ============

// STOK BARANG
export interface StokBarang {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Bahan_Baku' | 'Barang_Jadi' | 'Barang_Dagang' | 'Perlengkapan';
  satuan: string;
  stok_awal: number;
  masuk: number;
  keluar: number;
  stok_akhir: number;
  harga_pokok: number;
  harga_jual: number;
  min_stok: number;
  lokasi: string;
}

// PRODUKSI
export interface Produksi {
  id: string;
  no_produksi: string;
  tanggal: string;
  produk: string;
  jumlah: number;
  bahan_baku: { barang_id: string; jumlah: number }[];
  biaya_tenaga_kerja: number;
  biaya_overhead: number;
  total_biaya: number;
  status: 'Draft' | 'Dalam_Proses' | 'Selesai' | 'Batal';
  catatan: string;
}

// PENJUALAN
export interface Penjualan {
  id: string;
  no_invoice: string;
  tanggal: string;
  pelanggan: string;
  items: { barang_id: string; jumlah: number; harga: number; subtotal: number }[];
  total: number;
  diskon: number;
  ppn: number;
  grand_total: number;
  status_bayar: 'Lunas' | 'Belum_Bayar' | 'DP' | 'Jatuh_Tempo';
  metode_bayar: 'Tunai' | 'Transfer' | 'Kredit';
  jatuh_tempo: string;
}

// PEMBELIAN
export interface Pembelian {
  id: string;
  no_po: string;
  tanggal: string;
  supplier: string;
  items: { barang_id: string; jumlah: number; harga: number; subtotal: number }[];
  total: number;
  ppn: number;
  grand_total: number;
  status_bayar: 'Lunas' | 'Belum_Bayar' | 'DP';
  status_terima: 'Belum' | 'Sebagian' | 'Lengkap';
  jatuh_tempo: string;
}

// PENGGAJIAN
export interface Penggajian {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  departemen: string;
  gaji_pokok: number;
  tunjangan: number;
  lembur: number;
  potongan: number;
  pph21: number;
  gaji_bersih: number;
  periode: string;
  status: 'Draft' | 'Disetujui' | 'Dibayar';
}

// ANGGARAN
export interface Anggaran {
  id: string;
  kategori: string;
  anggaran: number;
  realisasi: number;
  sisa: number;
  persentase: number;
  periode: string;
  catatan: string;
}

// ARUS KAS
export interface ArusKas {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: 'Operasional' | 'Investasi' | 'Pendanaan';
  masuk: number;
  keluar: number;
  saldo: number;
  referensi: string;
}

// OCR / VISION AI
export interface OCRResult {
  id: string;
  timestamp: string;
  image_url: string;
  jenis_dokumen: 'Kwitansi' | 'Nota' | 'Transfer_Bank' | 'Lainnya';
  data_ekstrak: {
    penerima?: string;
    nominal?: number;
    tanggal?: string;
    nomor_bukti?: string;
    keterangan?: string;
  };
  confidence: number;
  status: 'Pending' | 'Terverifikasi' | 'Ditolak';
  catatan: string;
}

// WHATSAPP INTEGRATION
export interface WhatsAppLog {
  id: string;
  timestamp: string;
  nomor: string;
  nama: string;
  pesan_masuk: string;
  respon_sistem: string;
  tipe: 'Input_Transaksi' | 'Konfirmasi' | 'Laporan' | 'Reminder';
  status: 'Terkirim' | 'Diproses' | 'Gagal';
}

// MENU CONFIGURATION
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  page: string;
  order: number;
  visible: boolean;
  parent?: string;
  role_access: UserRole[];
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
