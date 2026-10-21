import { BukuKas, ArsipBukti, PosKewajiban, AuditLog, Tanah, Beko, NotaMaterial, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas, OCRResult, WhatsAppLog, MenuItem } from './types';

// ================================================================
// DATA RINGKASAN LAPORAN LAMA — perlu rekonsiliasi dengan bukti fisik/dokumen asli
// ================================================================

// ============ A. PENERIMAAN DANA (Buku Kas Masuk) ============
export const initialBukuKas: BukuKas[] = [
  { id: 'KAS-M00', tgl: '2026-08-01', no_ref: 'KAS-M00', kode_bukti: '', keterangan: 'Penerimaan dana sebelum 28 Sep 2026', kategori: 'Operasional', proyek: 'Site A', masuk: 204000000, keluar: 0, status_verifikasi: 'PERLU_KONFIRMASI' },
  { id: 'KAS-M01', tgl: '2026-08-28', no_ref: 'KAS-M01', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 32500000, keluar: 0, status_verifikasi: 'PERLU_KONFIRMASI' },
  { id: 'KAS-M02', tgl: '2026-09-28', no_ref: 'KAS-M02', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 50000000, keluar: 0, status_verifikasi: 'PERLU_KONFIRMASI' },
  { id: 'KAS-M03', tgl: '2026-09-30', no_ref: 'KAS-M03', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 50000000, keluar: 0, status_verifikasi: 'PERLU_KONFIRMASI' },
  { id: 'KAS-M04', tgl: '2026-10-05', no_ref: 'KAS-M04', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 60000000, keluar: 0, status_verifikasi: 'PERLU_KONFIRMASI' },
  { id: 'KAS-M05', tgl: '2026-10-13', no_ref: 'KAS-M05', kode_bukti: '', keterangan: 'Menerima dana', kategori: 'Operasional', proyek: 'Site A', masuk: 15000000, keluar: 0, status_verifikasi: 'PERLU_KONFIRMASI' },
  // PENGELUARAN
  { id: 'KAS-K01', tgl: '2026-10-13', no_ref: 'KAS-K01', kode_bukti: '', keterangan: 'Pembebasan tanah (teralokasi)', kategori: 'Pembebasan_Tanah', proyek: 'Site A', masuk: 0, keluar: 309400000, status_verifikasi: 'PERLU_KONFIRMASI' },
  { id: 'KAS-K02', tgl: '2026-10-13', no_ref: 'KAS-K02', kode_bukti: '', keterangan: 'Cut fill & beko', kategori: 'Cut_Fill', proyek: 'Site A', masuk: 0, keluar: 71350000, status_verifikasi: 'PERLU_KONFIRMASI' },
  { id: 'KAS-K03', tgl: '2026-10-13', no_ref: 'KAS-K03', kode_bukti: '', keterangan: 'Biaya lain-lain (ATK PT)', kategori: 'Operasional', proyek: 'Site A', masuk: 0, keluar: 13596000, status_verifikasi: 'PERLU_KONFIRMASI' },
];

// ============ REGISTER TANAH (13 Bidang) ============
export const initialTanah: Tanah[] = [
  { id: 'T-01', pemilik: 'Pak Dede', luas_bt: 68, harga_per_bt: 750000, dp: 51000000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 1' },
  { id: 'T-02', pemilik: 'Pak Dede', luas_bt: 50, harga_per_bt: 750000, dp: 37500000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 2' },
  { id: 'T-03', pemilik: 'Pak Dede', luas_bt: 23, harga_per_bt: 500000, dp: 11500000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 3' },
  { id: 'T-04', pemilik: 'Sanaris', luas_bt: 17, harga_per_bt: 800000, dp: 13600000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 4' },
  { id: 'T-05', pemilik: 'Sukiat', luas_bt: 18, harga_per_bt: 800000, dp: 14400000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 5' },
  { id: 'T-06', pemilik: 'Supriatna', luas_bt: 12.5, harga_per_bt: 800000, dp: 10000000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 6' },
  { id: 'T-07', pemilik: 'Sanaris (19 BT)', luas_bt: 19, harga_per_bt: 800000, dp: 5200000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: 'Belum lunas - sisa 10jt' },
  { id: 'T-08', pemilik: 'Ija (Sutija)', luas_bt: 2.5, harga_per_bt: 800000, dp: 2000000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 8' },
  { id: 'T-09', pemilik: 'Ija (Sutija)', luas_bt: 79, harga_per_bt: 800000, dp: 63200000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Bidang 9' },
  { id: 'T-10', pemilik: 'Ija (Sutija) - Lain', luas_bt: 0, harga_per_bt: 0, dp: 1000000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: 'Tanpa luas - nominal pembayaran tercatat; nilai kesepakatan harus dicek pada perjanjian' },
  { id: 'T-11', pemilik: 'DUDI', luas_bt: 36.5, harga_per_bt: 800000, dp: 15000000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: 'Belum lunas - sisa 14.2jt' },
  { id: 'T-12', pemilik: 'Enapsiah', luas_bt: 0, harga_per_bt: 0, dp: 70000000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: 'Tanpa luas - nominal langsung' },
  { id: 'T-13', pemilik: 'Balong', luas_bt: 30, harga_per_bt: 850000, dp: 15000000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: 'Belum lunas - sisa 10.5jt' },
];

// ============ BEKO (8 Item) ============
export const initialBeko: Beko[] = [
  { id: 'BK-01', item: 'Mobilisasi', panjang: 0, lebar: 0, tinggi: 0, tarif: 4500000, status: 'Lunas', kode_bukti: 'KW-BK01', url_bukti: '', catatan: 'Biaya mobilisasi - ls', termasuk_rekap: true, satuan_volume: 'ls' },
  { id: 'BK-02', item: 'Mobilisasi Beko', panjang: 25.5, lebar: 1, tinggi: 1, tarif: 650000, status: 'Lunas', kode_bukti: 'KW-BK02', url_bukti: '', catatan: '25.5 × 650.000', termasuk_rekap: true, satuan_volume: 'unit' },
  { id: 'BK-03', item: 'Cut Fill #1', panjang: 21, lebar: 15, tinggi: 2, tarif: 25000, status: 'Lunas', kode_bukti: 'KW-BK03', url_bukti: '', catatan: '630 m3 × 25.000', termasuk_rekap: true, satuan_volume: 'm3' },
  { id: 'BK-04', item: 'Cut Fill #2', panjang: 13, lebar: 26, tinggi: 2, tarif: 25000, status: 'Lunas', kode_bukti: 'KW-BK04', url_bukti: '', catatan: '676 m3 × 25.000', termasuk_rekap: true, satuan_volume: 'm3' },
  { id: 'BK-05', item: 'Cut Fill #3', panjang: 9, lebar: 10, tinggi: 2, tarif: 25000, status: 'Lunas', kode_bukti: 'KW-BK05', url_bukti: '', catatan: '180 m3 × 25.000', termasuk_rekap: true, satuan_volume: 'm3' },
  { id: 'BK-06', item: 'Cut Fill #4', panjang: 25, lebar: 14, tinggi: 1.5, tarif: 25000, status: 'Belum_Ada_Kwitansi', kode_bukti: '', url_bukti: '', catatan: '525 m3 × 25.000 - bukti belum dilampirkan', termasuk_rekap: true, satuan_volume: 'm3' },
  { id: 'BK-07', item: 'Cut Fill #5 (DI LUAR)', panjang: 26, lebar: 26, tinggi: 1.5, tarif: 25000, status: 'Belum_Ada_Kwitansi', kode_bukti: '', url_bukti: '', catatan: '1014 m3 × 25.000 - di luar lingkup rekap, menunggu konfirmasi', termasuk_rekap: false, satuan_volume: 'm3' },
  { id: 'BK-08', item: 'Cut Fill #6 (DI LUAR)', panjang: 14, lebar: 39, tinggi: 1.5, tarif: 25000, status: 'Belum_Ada_Kwitansi', kode_bukti: '', url_bukti: '', catatan: '819 m3 × 25.000 - di luar lingkup rekap, menunggu konfirmasi', termasuk_rekap: false, satuan_volume: 'm3' },
];

// ============ REKAP BIAYA BEKO PER TAHAP — BELUM DIDUKUNG FILE ASLI ============
export const initialArsipBukti: ArsipBukti[] = [
  { id: 'DBK-01', judul_dokumen: 'Rekap biaya beko tahap 01 (bukti asli belum dilampirkan)', modul_terkait: 'Beko', id_terkait: 'BK-01', kode_bukti: 'DBK-01', jenis: 'Tidak_Ada', link_drive: '', tgl_upload: '2026-09-01', terverifikasi: 'Perlu_Konfirmasi', catatan_audit: 'Rekap tahap beko 1 - bukti file belum dilampirkan', penerima: 'Operator', nominal: 4500000, keterangan: 'Tahap 1' },
  { id: 'DBK-02', judul_dokumen: 'Rekap biaya beko tahap 02 (bukti asli belum dilampirkan)', modul_terkait: 'Beko', id_terkait: 'BK-02', kode_bukti: 'DBK-02', jenis: 'Tidak_Ada', link_drive: '', tgl_upload: '2026-09-05', terverifikasi: 'Perlu_Konfirmasi', catatan_audit: 'Rekap tahap beko 2 - bukti file belum dilampirkan', penerima: 'Operator', nominal: 16575000, keterangan: 'Tahap 2' },
  { id: 'DBK-03', judul_dokumen: 'Rekap biaya beko tahap 03 (bukti asli belum dilampirkan)', modul_terkait: 'Beko', id_terkait: 'BK-03', kode_bukti: 'DBK-03', jenis: 'Tidak_Ada', link_drive: '', tgl_upload: '2026-09-10', terverifikasi: 'Perlu_Konfirmasi', catatan_audit: 'Rekap tahap beko 3 - bukti file belum dilampirkan', penerima: 'Operator', nominal: 15750000, keterangan: 'Tahap 3' },
  { id: 'DBK-04', judul_dokumen: 'Rekap biaya beko tahap 04 (bukti asli belum dilampirkan)', modul_terkait: 'Beko', id_terkait: 'BK-04', kode_bukti: 'DBK-04', jenis: 'Tidak_Ada', link_drive: '', tgl_upload: '2026-09-20', terverifikasi: 'Perlu_Konfirmasi', catatan_audit: 'Rekap tahap beko 4 - bukti file belum dilampirkan', penerima: 'Operator', nominal: 16900000, keterangan: 'Tahap 4' },
  { id: 'DBK-05', judul_dokumen: 'Rekap biaya beko tahap 05 (bukti asli belum dilampirkan)', modul_terkait: 'Beko', id_terkait: 'BK-05', kode_bukti: 'DBK-05', jenis: 'Tidak_Ada', link_drive: '', tgl_upload: '2026-09-28', terverifikasi: 'Perlu_Konfirmasi', catatan_audit: 'Rekap tahap beko 5 - bukti file belum dilampirkan', penerima: 'Operator', nominal: 4500000, keterangan: 'Tahap 5' },
  { id: 'DBK-06', judul_dokumen: 'Rekap biaya beko tahap 06 (bukti asli belum dilampirkan)', modul_terkait: 'Beko', id_terkait: 'BK-06', kode_bukti: 'DBK-06', jenis: 'Tidak_Ada', link_drive: '', tgl_upload: '2026-10-05', terverifikasi: 'Perlu_Konfirmasi', catatan_audit: 'Rekap tahap beko 6 - bukti file belum dilampirkan', penerima: 'Operator', nominal: 3125000, keterangan: 'Tahap 6' },
];

// ============ POS KEWAJIBAN (Utang Tanah) ============
export const initialPosKewajiban: PosKewajiban[] = [
  { id: 'UT-01', kode_utang: 'UT-01', tanah_id: 'T-07', pihak: 'Sanaris (19 BT)', nilai_menurut_dokumen: 15200000, nilai_menurut_workbook: 15200000, dp_dibayar: 5200000, status: 'Dalam_Penelusuran', keterangan: 'DP 5.2jt, sisa 10jt' },
  { id: 'UT-02', kode_utang: 'UT-02', tanah_id: 'T-11', pihak: 'DUDI (36.5 BT)', nilai_menurut_dokumen: 29200000, nilai_menurut_workbook: 29200000, dp_dibayar: 15000000, status: 'Dalam_Penelusuran', keterangan: 'DP 15jt, sisa 14.2jt' },
  { id: 'UT-03', kode_utang: 'UT-03', tanah_id: 'T-13', pihak: 'Balong (30 BT)', nilai_menurut_dokumen: 25500000, nilai_menurut_workbook: 25500000, dp_dibayar: 15000000, status: 'Dalam_Penelusuran', keterangan: 'DP 15jt, sisa 10.5jt' },
];

// ============ AUDIT LOG ============
export const initialAuditLog: AuditLog[] = [];

export const initialNotaMaterial: NotaMaterial[] = [
  { id: 'NT-001', nomor_nota: 'NT-001', tanggal: '2026-09-15', toko: 'ATK PT', keterangan: 'Biaya lain-lain', nominal: 13596000, url_bukti: '', status: 'Belum_Verifikasi' },
];

// ============ ARUS KAS (Running Balance) ============
// Running cash flow is derived from initialBukuKas; keep this legacy collection empty to prevent double entry.
export const initialArusKas: ArusKas[] = [];

// ============ ERP DATA - CONTOH REALISTIS ============
export const initialStok: StokBarang[] = [];
// Dataset contoh stok dihapus. Masukkan stok awal yang benar-benar sudah diverifikasi.

export const initialProduksi: Produksi[] = [];
// Data produksi awal sengaja kosong; jangan tampilkan SPK demo sebagai pekerjaan aktual.

export const initialPenjualan: Penjualan[] = [];
// Data penjualan contoh dihapus; mulai dari invoice/transaksi yang memiliki bukti.

export const initialPembelian: Pembelian[] = [];
// Data pembelian contoh dihapus; isi dari PO/tagihan yang terverifikasi.

export const initialPenggajian: Penggajian[] = [];
// Data gaji contoh dihapus untuk mencegah nama dan angka fiktif masuk laporan.

export const initialAnggaran: Anggaran[] = [];
// Anggaran contoh dihapus; input anggaran proyek yang sudah disetujui.

export const initialOCR: OCRResult[] = [];
// Hasil OCR contoh/URL placeholder dihapus; simpan hanya scan sungguhan.

export const initialWhatsApp: WhatsAppLog[] = [];
// Log WhatsApp demo dihapus; tampilkan hanya pesan yang benar-benar diterima.

export const initialMenuConfig: MenuItem[] = [
  { id: 'M-01', label: 'Dashboard', icon: 'LayoutDashboard', page: 'dashboard', order: 1, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'] },
  { id: 'M-02', label: 'Audit Rekap', icon: 'FileBarChart', page: 'auditrekap', order: 2, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'VIEWER'] },
  { id: 'M-03', label: 'Register Tanah', icon: 'LandPlot', page: 'tanah', order: 3, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK'] },
  { id: 'M-04', label: 'Rincian Beko', icon: 'Truck', page: 'beko', order: 4, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK'] },
  { id: 'M-05', label: 'Buku Kas', icon: 'BookOpen', page: 'bukukas', order: 5, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-06', label: 'Utang Tanah', icon: 'Scale', page: 'poskewajiban', order: 6, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-07', label: 'Arsip Bukti', icon: 'FolderArchive', page: 'arsipbukti', order: 7, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-08', label: 'Audit Log', icon: 'History', page: 'auditlog', order: 8, visible: true, role_access: ['ADMIN'] },
  { id: 'M-09', label: 'Alokasi Dana Detail', icon: 'DollarSign', page: 'alokasi', order: 9, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
];

// ============ UTILITY ============
export const formatRupiah = (angka: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka);
};

export const formatNumber = (angka: number): string => {
  return new Intl.NumberFormat('id-ID').format(angka);
};

// ============ NILAI PEMBANDING DARI REKAP AUDIT TERDAHULU ============
// Referensi manual untuk rekonsiliasi, BUKAN hasil live, bukan bukti transaksi, dan bukan otomatis terverifikasi.
export const AUDIT_CONSTANTS = {
  TOTAL_DANA_MASUK: 411500000,
  TOTAL_PENGELUARAN: 394346000,
  SALDO_KAS_CATATAN: 17154000,
  KAS_RIIL: 35220000,
  SELISIH_KAS_RIIL_CATATAN: 18066000,
  UANG_MENGENDAP: 2554000,
  SELISIH_RIIL_MENGENDAP: 15512000,
  TOTAL_UTANG_TANAH: 34700000,
  POSISI_NETO_CATATAN: -17546000,
  POSISI_NETO_RIIL: 520000,
  TOTAL_NILAI_TANAH: 344100000,
  TOTAL_DIBAYAR_TANAH: 309400000,
  TOTAL_LUAS_TANAH: 355.5,
  PERSENTASE_TERBAYAR: 89.9,
  TOTAL_BIAYA_BEKO: 71350000,
  TOTAL_DANA_BEKO_DITERIMA: 61350000,
  SELISIH_BEKO: -10000000,
  BIAYA_BEKO_ITEM_1_5: 58225000,
  SELISIH_DANA_ITEM_1_5: 3125000,
  PERIODE_DIDI_TERSALURKAN: 60000000,
  PERIODE_DIDI_TERSIMPAN: 20279000,
  PERIODE_DIDI_TOTAL: 80279000,
};
