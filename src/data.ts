import { BukuKas, ArsipBukti, PosKewajiban, AuditLog, Tanah, Beko, NotaMaterial, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas, OCRResult, WhatsAppLog, MenuItem } from './types';

// ================================================================
// DATA REAL DARI LAPORAN AUDIT — Cross-validated
// ================================================================

// ============ A. PENERIMAAN DANA (Buku Kas Masuk) ============
export const initialBukuKas: BukuKas[] = [
  { id: 'KAS-M00', tgl: '2026-08-01', no_ref: 'KAS-M00', kode_bukti: '', keterangan: 'Penerimaan dana sebelum 28 Sep 2026', kategori: 'Operasional', proyek: 'Site A', masuk: 204000000, keluar: 0, status_verifikasi: 'LENGKAP' },
  { id: 'KAS-M01', tgl: '2026-08-28', no_ref: 'KAS-M01', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 32500000, keluar: 0, status_verifikasi: 'LENGKAP' },
  { id: 'KAS-M02', tgl: '2026-09-28', no_ref: 'KAS-M02', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 50000000, keluar: 0, status_verifikasi: 'LENGKAP' },
  { id: 'KAS-M03', tgl: '2026-09-30', no_ref: 'KAS-M03', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 50000000, keluar: 0, status_verifikasi: 'LENGKAP' },
  { id: 'KAS-M04', tgl: '2026-10-05', no_ref: 'KAS-M04', kode_bukti: '', keterangan: 'Penerimaan dana', kategori: 'Operasional', proyek: 'Site A', masuk: 60000000, keluar: 0, status_verifikasi: 'LENGKAP' },
  { id: 'KAS-M05', tgl: '2026-10-13', no_ref: 'KAS-M05', kode_bukti: '', keterangan: 'Menerima dana', kategori: 'Operasional', proyek: 'Site A', masuk: 15000000, keluar: 0, status_verifikasi: 'LENGKAP' },
  // PENGELUARAN
  { id: 'KAS-K01', tgl: '2026-10-13', no_ref: 'KAS-K01', kode_bukti: '', keterangan: 'Pembebasan tanah (teralokasi)', kategori: 'Pembebasan_Tanah', proyek: 'Site A', masuk: 0, keluar: 309400000, status_verifikasi: 'LENGKAP' },
  { id: 'KAS-K02', tgl: '2026-10-13', no_ref: 'KAS-K02', kode_bukti: '', keterangan: 'Cut fill & beko', kategori: 'Cut_Fill', proyek: 'Site A', masuk: 0, keluar: 71350000, status_verifikasi: 'LENGKAP' },
  { id: 'KAS-K03', tgl: '2026-10-13', no_ref: 'KAS-K03', kode_bukti: '', keterangan: 'Biaya lain-lain (ATK PT)', kategori: 'Operasional', proyek: 'Site A', masuk: 0, keluar: 13596000, status_verifikasi: 'LENGKAP' },
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
  { id: 'T-10', pemilik: 'Ija (Sutija) - Lain', luas_bt: 0, harga_per_bt: 0, dp: 1000000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Tanpa luas - nominal langsung' },
  { id: 'T-11', pemilik: 'DUDI', luas_bt: 36.5, harga_per_bt: 800000, dp: 15000000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: 'Belum lunas - sisa 14.2jt' },
  { id: 'T-12', pemilik: 'Enapsiah', luas_bt: 0, harga_per_bt: 0, dp: 70000000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: 'Tanpa luas - nominal langsung' },
  { id: 'T-13', pemilik: 'Balong', luas_bt: 30, harga_per_bt: 850000, dp: 15000000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: 'Belum lunas - sisa 10.5jt' },
];

// ============ BEKO (8 Item) ============
export const initialBeko: Beko[] = [
  { id: 'BK-01', item: 'Mobilisasi', panjang: 0, lebar: 0, tinggi: 0, tarif: 0, status: 'Lunas', kode_bukti: 'KW-BK01', url_bukti: '', catatan: 'Biaya mobilisasi - ls' },
  { id: 'BK-02', item: 'Mobilisasi Beko', panjang: 25.5, lebar: 1, tinggi: 1, tarif: 650000, status: 'Lunas', kode_bukti: 'KW-BK02', url_bukti: '', catatan: '25.5 × 650.000' },
  { id: 'BK-03', item: 'Cut Fill #1', panjang: 21, lebar: 15, tinggi: 2, tarif: 25000, status: 'Lunas', kode_bukti: 'KW-BK03', url_bukti: '', catatan: '630 m3 × 25.000' },
  { id: 'BK-04', item: 'Cut Fill #2', panjang: 13, lebar: 26, tinggi: 2, tarif: 25000, status: 'Lunas', kode_bukti: 'KW-BK04', url_bukti: '', catatan: '676 m3 × 25.000' },
  { id: 'BK-05', item: 'Cut Fill #3', panjang: 9, lebar: 10, tinggi: 2, tarif: 25000, status: 'Lunas', kode_bukti: 'KW-BK05', url_bukti: '', catatan: '180 m3 × 25.000' },
  { id: 'BK-06', item: 'Cut Fill #4', panjang: 25, lebar: 14, tinggi: 1.5, tarif: 25000, status: 'Belum_Ada_Kwitansi', kode_bukti: '', url_bukti: '', catatan: '525 m3 × 25.000 - tanpa kwitansi' },
  { id: 'BK-07', item: 'Cut Fill #5 (DI LUAR)', panjang: 26, lebar: 26, tinggi: 1.5, tarif: 25000, status: 'Belum_Ada_Kwitansi', kode_bukti: '', url_bukti: '', catatan: '1014 m3 × 25.000 - TIDAK masuk total' },
  { id: 'BK-08', item: 'Cut Fill #6 (DI LUAR)', panjang: 14, lebar: 39, tinggi: 1.5, tarif: 25000, status: 'Belum_Ada_Kwitansi', kode_bukti: '', url_bukti: '', catatan: '819 m3 × 25.000 - TIDAK masuk total' },
];

// ============ DANA BEKO PER TAHAP ============
export const initialArsipBukti: ArsipBukti[] = [
  { id: 'DBK-01', kode_bukti: 'DBK-01', jenis: 'Kwitansi_Foto', link_drive: '', tgl_upload: '2026-09-01', terverifikasi: 'Ya', catatan_audit: 'Beko ke-1 - pembukaan jalan', penerima: 'Operator', nominal: 4500000, keterangan: 'Tahap 1' },
  { id: 'DBK-02', kode_bukti: 'DBK-02', jenis: 'Kwitansi_Foto', link_drive: '', tgl_upload: '2026-09-05', terverifikasi: 'Ya', catatan_audit: 'Beko ke-2 - samping Pak Didi', penerima: 'Operator', nominal: 16575000, keterangan: 'Tahap 2' },
  { id: 'DBK-03', kode_bukti: 'DBK-03', jenis: 'Kwitansi_Foto', link_drive: '', tgl_upload: '2026-09-10', terverifikasi: 'Ya', catatan_audit: 'Beko ke-3 - Dokter Agus', penerima: 'Operator', nominal: 15750000, keterangan: 'Tahap 3' },
  { id: 'DBK-04', kode_bukti: 'DBK-04', jenis: 'Kwitansi_Foto', link_drive: '', tgl_upload: '2026-09-20', terverifikasi: 'Ya', catatan_audit: 'Beko ke-4 - DUDI', penerima: 'Operator', nominal: 16900000, keterangan: 'Tahap 4' },
  { id: 'DBK-05', kode_bukti: 'DBK-05', jenis: 'Kwitansi_Foto', link_drive: '', tgl_upload: '2026-09-28', terverifikasi: 'Ya', catatan_audit: 'Beko ke-5', penerima: 'Operator', nominal: 4500000, keterangan: 'Tahap 5' },
  { id: 'DBK-06', kode_bukti: 'DBK-06', jenis: 'Kwitansi_Foto', link_drive: '', tgl_upload: '2026-10-05', terverifikasi: 'Ya', catatan_audit: 'Beko ke-6', penerima: 'Operator', nominal: 3125000, keterangan: 'Tahap 6' },
];

// ============ POS KEWAJIBAN (Utang Tanah) ============
export const initialPosKewajiban: PosKewajiban[] = [
  { id: 'UT-01', kode_utang: 'UT-01', pihak: 'Sanaris (19 BT)', nilai_menurut_dokumen: 15200000, nilai_menurut_workbook: 15200000, dp_dibayar: 5200000, status: 'Dalam_Penelusuran', keterangan: 'DP 5.2jt, sisa 10jt' },
  { id: 'UT-02', kode_utang: 'UT-02', pihak: 'DUDI (36.5 BT)', nilai_menurut_dokumen: 29200000, nilai_menurut_workbook: 29200000, dp_dibayar: 15000000, status: 'Dalam_Penelusuran', keterangan: 'DP 15jt, sisa 14.2jt' },
  { id: 'UT-03', kode_utang: 'UT-03', pihak: 'Balong (30 BT)', nilai_menurut_dokumen: 25500000, nilai_menurut_workbook: 25500000, dp_dibayar: 15000000, status: 'Dalam_Penelusuran', keterangan: 'DP 15jt, sisa 10.5jt' },
];

// ============ AUDIT LOG ============
export const initialAuditLog: AuditLog[] = [
  { id: 'LOG-001', timestamp: '2026-10-13T10:00:00', user: 'ADMIN', aksi: 'CREATE', tabel: 'AUDIT_REKAP', record_id: 'AR-001', nilai_lama: '-', nilai_baru: 'Total dana masuk: 411.500.000', alasan: 'Input rekap audit', sumber_bukti: 'Buku Arus Kas' },
];

export const initialNotaMaterial: NotaMaterial[] = [
  { id: 'NT-001', nomor_nota: 'NT-001', tanggal: '2026-09-15', toko: 'ATK PT', keterangan: 'Biaya lain-lain', nominal: 13596000, url_bukti: '', status: 'Terverifikasi' },
];

// ============ ARUS KAS (Running Balance) ============
export const initialArusKas: ArusKas[] = [
  { id: 'AK-01', tanggal: '2026-08-01', keterangan: 'Penerimaan dana awal', kategori: 'Operasional', masuk: 204000000, keluar: 0, referensi: 'Sebelum 28 Sep' },
  { id: 'AK-02', tanggal: '2026-08-28', keterangan: 'Penerimaan dana', kategori: 'Operasional', masuk: 32500000, keluar: 0, referensi: 'KAS-M01' },
  { id: 'AK-03', tanggal: '2026-09-28', keterangan: 'Penerimaan dana', kategori: 'Operasional', masuk: 50000000, keluar: 0, referensi: 'KAS-M02' },
  { id: 'AK-04', tanggal: '2026-09-30', keterangan: 'Penerimaan dana', kategori: 'Operasional', masuk: 50000000, keluar: 0, referensi: 'KAS-M03' },
  { id: 'AK-05', tanggal: '2026-10-05', keterangan: 'Penerimaan dana (Pak Didi)', kategori: 'Operasional', masuk: 60000000, keluar: 0, referensi: 'KAS-M04' },
  { id: 'AK-06', tanggal: '2026-10-13', keterangan: 'Menerima dana', kategori: 'Operasional', masuk: 15000000, keluar: 0, referensi: 'KAS-M05' },
  { id: 'AK-07', tanggal: '2026-10-13', keterangan: 'Pembebasan tanah', kategori: 'Investasi', masuk: 0, keluar: 309400000, referensi: 'KAS-K01' },
  { id: 'AK-08', tanggal: '2026-10-13', keterangan: 'Cut fill & beko', kategori: 'Investasi', masuk: 0, keluar: 71350000, referensi: 'KAS-K02' },
  { id: 'AK-09', tanggal: '2026-10-13', keterangan: 'Biaya ATK PT', kategori: 'Operasional', masuk: 0, keluar: 13596000, referensi: 'KAS-K03' },
];

// ============ ERP DATA - CONTOH REALISTIS ============
export const initialStok: StokBarang[] = [
  { id: 'STK-001', kode: 'BB-001', nama: 'Semen Portland 50kg', kategori: 'Bahan_Baku', satuan: 'zak', stok_awal: 100, masuk: 50, keluar: 80, harga_pokok: 65000, harga_jual: 75000, min_stok: 20, lokasi: 'Gudang A' },
  { id: 'STK-002', kode: 'BB-002', nama: 'Pasir Pasang', kategori: 'Bahan_Baku', satuan: 'truk', stok_awal: 10, masuk: 5, keluar: 8, harga_pokok: 800000, harga_jual: 950000, min_stok: 3, lokasi: 'Yard' },
  { id: 'STK-003', kode: 'BB-003', nama: 'Besi Beton 10mm', kategori: 'Bahan_Baku', satuan: 'batang', stok_awal: 200, masuk: 100, keluar: 150, harga_pokok: 85000, harga_jual: 95000, min_stok: 50, lokasi: 'Gudang A' },
  { id: 'STK-004', kode: 'BJ-001', nama: 'Rumah Type 36', kategori: 'Barang_Jadi', satuan: 'unit', stok_awal: 0, masuk: 2, keluar: 1, harga_pokok: 250000000, harga_jual: 350000000, min_stok: 0, lokasi: 'Site A' },
  { id: 'STK-005', kode: 'BD-001', nama: 'Keramik 40x40', kategori: 'Barang_Dagang', satuan: 'dus', stok_awal: 50, masuk: 30, keluar: 40, harga_pokok: 120000, harga_jual: 150000, min_stok: 10, lokasi: 'Gudang B' },
];

export const initialProduksi: Produksi[] = [
  { id: 'PRD-001', no_produksi: 'SPK-2024-001', tanggal: '2024-01-10', produk: 'Rumah Type 36', jumlah: 1, bahan_baku: [{ barang_id: 'STK-001', jumlah: 40 }, { barang_id: 'STK-003', jumlah: 100 }], biaya_tenaga_kerja: 15000000, biaya_overhead: 3000000, status: 'Selesai', catatan: 'Unit 1 Site A' },
  { id: 'PRD-002', no_produksi: 'SPK-2024-002', tanggal: '2024-02-01', produk: 'Rumah Type 36', jumlah: 1, bahan_baku: [{ barang_id: 'STK-001', jumlah: 40 }, { barang_id: 'STK-003', jumlah: 100 }], biaya_tenaga_kerja: 15000000, biaya_overhead: 3000000, status: 'Dalam_Proses', catatan: 'Unit 2 Site A - progress 60%' },
];

export const initialPenjualan: Penjualan[] = [
  { id: 'PJ-001', no_invoice: 'INV-2024-001', tanggal: '2024-02-15', pelanggan: 'Budi Santoso', items: [{ barang_id: 'STK-004', jumlah: 1, harga: 350000000, subtotal: 350000000 }], diskon: 10000000, ppn: 0, status_bayar: 'Lunas', metode_bayar: 'Transfer', jatuh_tempo: '' },
  { id: 'PJ-002', no_invoice: 'INV-2024-002', tanggal: '2024-03-01', pelanggan: 'Ahmad Wijaya', items: [{ barang_id: 'STK-005', jumlah: 10, harga: 150000, subtotal: 1500000 }], diskon: 0, ppn: 165000, status_bayar: 'Belum_Bayar', metode_bayar: 'Tunai', jatuh_tempo: '2024-04-01' },
];

export const initialPembelian: Pembelian[] = [
  { id: 'PB-001', no_po: 'PO-2024-001', tanggal: '2024-01-05', supplier: 'PT Semen Indonesia', items: [{ barang_id: 'STK-001', jumlah: 50, harga: 65000, subtotal: 3250000 }], ppn: 357500, status_bayar: 'Lunas', status_terima: 'Lengkap', jatuh_tempo: '' },
  { id: 'PB-002', no_po: 'PO-2024-002', tanggal: '2024-01-20', supplier: 'Toko Besi Jaya', items: [{ barang_id: 'STK-003', jumlah: 100, harga: 85000, subtotal: 8500000 }], ppn: 935000, status_bayar: 'DP', status_terima: 'Lengkap', jatuh_tempo: '2024-02-20' },
];

export const initialPenggajian: Penggajian[] = [
  { id: 'GJ-001', nip: 'EMP-001', nama: 'Budi Hermawan', jabatan: 'Mandor', departemen: 'Produksi', gaji_pokok: 5000000, tunjangan: 1000000, lembur: 500000, potongan: 100000, pph21: 100000, periode: '2024-03', status: 'Dibayar' },
  { id: 'GJ-002', nip: 'EMP-002', nama: 'Sri Wahyuni', jabatan: 'Admin', departemen: 'Keuangan', gaji_pokok: 4500000, tunjangan: 800000, lembur: 0, potongan: 80000, pph21: 80000, periode: '2024-03', status: 'Dibayar' },
  { id: 'GJ-003', nip: 'EMP-003', nama: 'Agus Prasetyo', jabatan: 'Operator Beko', departemen: 'Proyek', gaji_pokok: 5500000, tunjangan: 1500000, lembur: 800000, potongan: 150000, pph21: 150000, periode: '2024-03', status: 'Disetujui' },
];

export const initialAnggaran: Anggaran[] = [
  { id: 'AG-001', kategori: 'Pembebasan Tanah', anggaran: 500000000, realisasi: 309400000, periode: '2024', catatan: 'Termasuk DP Sukiat, Ija, Enapsiah' },
  { id: 'AG-002', kategori: 'Cut & Fill (Beko)', anggaran: 200000000, realisasi: 71350000, periode: '2024', catatan: 'Item 1-6' },
  { id: 'AG-003', kategori: 'Material & Perlengkapan', anggaran: 150000000, realisasi: 13596000, periode: '2024', catatan: 'ATK PT' },
  { id: 'AG-004', kategori: 'Tenaga Kerja', anggaran: 120000000, realisasi: 22820000, periode: '2024', catatan: 'Gaji 3 karyawan + lembur' },
];

export const initialOCR: OCRResult[] = [
  { id: 'OCR-001', timestamp: '2024-03-15T10:30:00', image_url: 'https://drive.google.com/file/d/xxx1', jenis_dokumen: 'Kwitansi', data_ekstrak: { penerima: 'Sukiat', nominal: 1400000, tanggal: '2024-01-15', nomor_bukti: 'KW-001', keterangan: 'DP Tanah 18 BT' }, confidence: 95, status: 'Terverifikasi', catatan: 'Cocok dengan BUKTI-001' },
  { id: 'OCR-002', timestamp: '2024-03-15T10:35:00', image_url: 'https://drive.google.com/file/d/xxx2', jenis_dokumen: 'Kwitansi', data_ekstrak: { penerima: 'Ija', nominal: 30000000, tanggal: '2024-01-20', nomor_bukti: 'KW-002', keterangan: 'DP Tanah 79 BT' }, confidence: 92, status: 'Terverifikasi', catatan: 'Cocok dengan BUKTI-002' },
  { id: 'OCR-003', timestamp: '2024-03-16T09:00:00', image_url: 'https://drive.google.com/file/d/xxx3', jenis_dokumen: 'Kwitansi', data_ekstrak: { penerima: '???', nominal: 13000000, tanggal: '', nomor_bukti: '', keterangan: 'Tidak terbaca jelas' }, confidence: 45, status: 'Pending', catatan: 'Foto buram, perlu upload ulang' },
];

export const initialWhatsApp: WhatsAppLog[] = [
  { id: 'WA-001', timestamp: '2024-03-15T08:00:00', nomor: '081234567890', nama: 'Budi Santoso', pesan_masuk: 'Saya sudah transfer DP rumah type 36 sebesar 50jt', respon_sistem: 'Terima kasih. Pembayaran DP Rp50.000.000 tercatat. Invoice: INV-2024-001', tipe: 'Input_Transaksi', status: 'Terkirim' },
  { id: 'WA-002', timestamp: '2024-03-15T09:30:00', nomor: '081298765432', nama: 'Siti Aminah', pesan_masuk: 'Kapan jatuh tempo cicilan saya?', respon_sistem: 'Jatuh tempo cicilan: 1 Juni 2024. Sisa: Rp400.000.000', tipe: 'Laporan', status: 'Terkirim' },
  { id: 'WA-003', timestamp: '2024-03-16T07:00:00', nomor: 'SYSTEM', nama: 'Sistem', pesan_masuk: '', respon_sistem: 'Reminder: Jatuh tempo PO-2024-002 (Toko Besi Jaya) pada 20 Feb 2024', tipe: 'Reminder', status: 'Terkirim' },
];

export const initialMenuConfig: MenuItem[] = [
  { id: 'M-01', label: 'Dashboard', icon: 'LayoutDashboard', page: 'dashboard', order: 1, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'] },
  { id: 'M-02', label: 'Audit Rekap', icon: 'FileBarChart', page: 'auditrekap', order: 2, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'VIEWER'] },
  { id: 'M-03', label: 'Register Tanah', icon: 'LandPlot', page: 'tanah', order: 3, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK'] },
  { id: 'M-04', label: 'Rincian Beko', icon: 'Truck', page: 'beko', order: 4, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK'] },
  { id: 'M-05', label: 'Buku Kas', icon: 'BookOpen', page: 'bukukas', order: 5, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-06', label: 'Utang Tanah', icon: 'Scale', page: 'poskewajiban', order: 6, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-07', label: 'Arsip Bukti', icon: 'FolderArchive', page: 'arsipbukti', order: 7, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-08', label: 'Audit Log', icon: 'History', page: 'auditlog', order: 8, visible: true, role_access: ['ADMIN'] },
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

// ============ CROSS-VALIDATION CONSTANTS ============
// Angka-angka ini HARUS cocok dengan hasil perhitungan otomatis
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
  PEMERIKSAAN_ANGKA: 34,
  PEMERIKSAAN_OK: 32,
  PEMERIKSAAN_SELISIH: 2,
  TERBUKA: 16,
  TERJAWAB: 5,
};
