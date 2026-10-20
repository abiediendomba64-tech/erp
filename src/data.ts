import { BukuKas, ArsipBukti, PosKewajiban, AuditLog, Tanah, Beko, NotaMaterial, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas, OCRResult, WhatsAppLog, MenuItem } from './types';

// ============ SAMPLE DATA FROM AUDIT REPORT ============

export const initialTanah: Tanah[] = [
  {
    id: 'T-001',
    pemilik: 'Sukiat',
    luas_bt: 18,
    harga_per_bt: 800000,
    dp: 1400000,
    status: 'DP',
    kode_bukti: 'BUKTI-001',
    url_bukti: '#',
    catatan: 'Kwitansi menyebut DP Rp1.400.000; perlu bukti sisa Rp13.000.000'
  },
  {
    id: 'T-002',
    pemilik: 'Ija (79 BT)',
    luas_bt: 79,
    harga_per_bt: 800000,
    dp: 30000000,
    status: 'DP',
    kode_bukti: 'BUKTI-002',
    url_bukti: '#',
    catatan: 'Kwitansi menyebut DP Rp30.000.000; perlu bukti sisa Rp33.200.000'
  },
  {
    id: 'T-003',
    pemilik: 'Ija (2,5 BT)',
    luas_bt: 2.5,
    harga_per_bt: 800000,
    dp: 2000000,
    status: 'Lunas',
    kode_bukti: 'BUKTI-003',
    url_bukti: '#',
    catatan: 'Cocokkan nominal dan keterangan pelunasan'
  },
  {
    id: 'T-004',
    pemilik: 'Enapsiah',
    luas_bt: 0,
    harga_per_bt: 0,
    dp: 0,
    status: 'Belum_Bayar',
    kode_bukti: '',
    url_bukti: '',
    catatan: 'Perlu klarifikasi status pembayaran dan bukti + bonus Ija'
  }
];

export const initialBeko: Beko[] = [
  {
    id: 'B-001',
    item: 'Item 4',
    panjang: 13,
    lebar: 26,
    tinggi: 2,
    tarif: 25000,
    status: 'Foto_Belum_Tersedia',
    kode_bukti: 'BUKTI-004',
    url_bukti: '',
    catatan: '13 × 26 × 2 — Laporan mencatat foto kwitansi belum tersedia'
  },
  {
    id: 'B-002',
    item: 'Item 5',
    panjang: 0,
    lebar: 0,
    tinggi: 0,
    tarif: 0,
    status: 'Lunas',
    kode_bukti: 'BUKTI-005',
    url_bukti: '#',
    catatan: 'Beko yang sudah difoto — cocokkan tiap foto dengan transaksi'
  },
  {
    id: 'B-003',
    item: 'Item 6',
    panjang: 0,
    lebar: 0,
    tinggi: 0,
    tarif: 0,
    status: 'Belum_Ada_Kwitansi',
    kode_bukti: '',
    url_bukti: '',
    catatan: 'Laporan menyatakan belum ada kwitansi'
  },
  {
    id: 'B-004',
    item: 'Item 7',
    panjang: 0,
    lebar: 0,
    tinggi: 0,
    tarif: 0,
    status: 'Belum_Ada_Kwitansi',
    kode_bukti: '',
    url_bukti: '',
    catatan: 'Menunggu data'
  },
  {
    id: 'B-005',
    item: 'Angsuran',
    panjang: 0,
    lebar: 0,
    tinggi: 0,
    tarif: 0,
    status: 'Belum_Ada_Kwitansi',
    kode_bukti: '',
    url_bukti: '',
    catatan: 'Menunggu data'
  },
  {
    id: 'B-006',
    item: 'Supriatna',
    panjang: 0,
    lebar: 0,
    tinggi: 0,
    tarif: 0,
    status: 'Belum_Ada_Kwitansi',
    kode_bukti: '',
    url_bukti: '',
    catatan: 'Pos baru — menunggu bukti'
  }
];

export const initialBukuKas: BukuKas[] = [
  {
    id: 'KAS-001',
    tgl: '2024-01-15',
    no_ref: 'KAS-001',
    kode_bukti: 'BUKTI-001',
    keterangan: 'DP Tanah Sukiat 18 BT',
    kategori: 'Pembebasan_Tanah',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 1400000,
    status_verifikasi: 'LENGKAP'
  },
  {
    id: 'KAS-002',
    tgl: '2024-01-20',
    no_ref: 'KAS-002',
    kode_bukti: 'BUKTI-002',
    keterangan: 'DP Tanah Ija 79 BT',
    kategori: 'Pembebasan_Tanah',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 30000000,
    status_verifikasi: 'LENGKAP'
  },
  {
    id: 'KAS-003',
    tgl: '2024-02-01',
    no_ref: 'KAS-003',
    kode_bukti: 'BUKTI-003',
    keterangan: 'Pelunasan Tanah Ija 2,5 BT',
    kategori: 'Pembebasan_Tanah',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 2000000,
    status_verifikasi: 'LENGKAP'
  },
  {
    id: 'KAS-004',
    tgl: '2024-02-10',
    no_ref: 'KAS-004',
    kode_bukti: 'BUKTI-005',
    keterangan: 'Pembayaran Beko Item 5',
    kategori: 'Cut_Fill',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 41325000,
    status_verifikasi: 'LENGKAP'
  },
  {
    id: 'KAS-005',
    tgl: '2024-02-15',
    no_ref: 'KAS-005',
    kode_bukti: '',
    keterangan: 'Sisa pembayaran Sukiat (tanpa bukti)',
    kategori: 'Pembebasan_Tanah',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 13000000,
    status_verifikasi: 'TANPA_BUKTI'
  },
  {
    id: 'KAS-006',
    tgl: '2024-03-01',
    no_ref: 'KAS-006',
    kode_bukti: '',
    keterangan: 'Sisa pembayaran Ija 79 BT (tanpa bukti)',
    kategori: 'Pembebasan_Tanah',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 33200000,
    status_verifikasi: 'TANPA_BUKTI'
  },
  {
    id: 'KAS-007',
    tgl: '2024-03-05',
    no_ref: 'KAS-007',
    kode_bukti: '',
    keterangan: 'Enapsiah dan bonus Ija',
    kategori: 'Pembebasan_Tanah',
    proyek: 'Cut & Fill Site A',
    masuk: 0,
    keluar: 71000000,
    status_verifikasi: 'PERLU_KONFIRMASI'
  }
];

export const initialArsipBukti: ArsipBukti[] = [
  {
    id: 'BUKTI-001',
    kode_bukti: 'BUKTI-001',
    jenis: 'Kwitansi_Foto',
    link_drive: 'https://drive.google.com/file/d/xxx1',
    tgl_upload: '2024-01-15',
    terverifikasi: 'Ya',
    catatan_audit: 'DP Rp1.400.000 terverifikasi. Sisa Rp13.000.000 perlu bukti.',
    penerima: 'Sukiat',
    nominal: 1400000,
    keterangan: 'Kwitansi DP tanah 18 BT'
  },
  {
    id: 'BUKTI-002',
    kode_bukti: 'BUKTI-002',
    jenis: 'Kwitansi_Foto',
    link_drive: 'https://drive.google.com/file/d/xxx2',
    tgl_upload: '2024-01-20',
    terverifikasi: 'Ya',
    catatan_audit: 'DP Rp30.000.000 terverifikasi. Sisa Rp33.200.000 perlu bukti.',
    penerima: 'Ija',
    nominal: 30000000,
    keterangan: 'Kwitansi DP tanah 79 BT'
  },
  {
    id: 'BUKTI-003',
    kode_bukti: 'BUKTI-003',
    jenis: 'Kwitansi_Foto',
    link_drive: 'https://drive.google.com/file/d/xxx3',
    tgl_upload: '2024-02-01',
    terverifikasi: 'Ya',
    catatan_audit: 'Pelunasan Rp2.000.000 terverifikasi.',
    penerima: 'Ija',
    nominal: 2000000,
    keterangan: 'Kwitansi pelunasan tanah 2,5 BT'
  },
  {
    id: 'BUKTI-004',
    kode_bukti: 'BUKTI-004',
    jenis: 'Tidak_Ada',
    link_drive: '',
    tgl_upload: '',
    terverifikasi: 'Perlu_Konfirmasi',
    catatan_audit: 'Foto kwitansi Beko 13×26×2 belum tersedia di Drive',
    penerima: 'Operator Beko',
    nominal: 16900000,
    keterangan: 'Beko Item 4 - belum ada bukti'
  },
  {
    id: 'BUKTI-005',
    kode_bukti: 'BUKTI-005',
    jenis: 'Kwitansi_Foto',
    link_drive: 'https://drive.google.com/file/d/xxx5',
    tgl_upload: '2024-02-10',
    terverifikasi: 'Ya',
    catatan_audit: 'Kwitansi Beko terverifikasi - cocokkan foto dengan transaksi',
    penerima: 'Operator Beko',
    nominal: 41325000,
    keterangan: 'Kwitansi Beko Item 5'
  },
  {
    id: 'BUKTI-006',
    kode_bukti: 'BUKTI-006',
    jenis: 'Tidak_Ada',
    link_drive: '',
    tgl_upload: '',
    terverifikasi: 'Tidak',
    catatan_audit: 'Belum ada kwitansi untuk pekerjaan Beko item 6',
    penerima: 'Operator Beko',
    nominal: 13125000,
    keterangan: 'Beko Item 6 - belum ada kwitansi'
  }
];

export const initialPosKewajiban: PosKewajiban[] = [
  {
    id: 'UT-001',
    kode_utang: 'UT-001',
    pihak: 'Sukiat',
    nilai_menurut_dokumen: 14400000,
    nilai_menurut_workbook: 14400000,
    status: 'Dalam_Penelusuran',
    keterangan: 'DP Rp1.400.000 sudah dibayar. Sisa Rp13.000.000 belum ada bukti.'
  },
  {
    id: 'UT-002',
    kode_utang: 'UT-002',
    pihak: 'Ija (79 BT)',
    nilai_menurut_dokumen: 63200000,
    nilai_menurut_workbook: 63200000,
    status: 'Dalam_Penelusuran',
    keterangan: 'DP Rp30.000.000 sudah dibayar. Sisa Rp33.200.000 belum ada bukti.'
  },
  {
    id: 'UT-003',
    kode_utang: 'UT-003',
    pihak: 'Enapsiah & Bonus Ija',
    nilai_menurut_dokumen: 71000000,
    nilai_menurut_workbook: 71000000,
    status: 'Dalam_Penelusuran',
    keterangan: 'Perlu klarifikasi status pembayaran dan bukti'
  },
  {
    id: 'UT-004',
    kode_utang: 'UT-004',
    pihak: 'Selisih Rekonsiliasi',
    nilai_menurut_dokumen: 34700000,
    nilai_menurut_workbook: 37200000,
    status: 'Dalam_Penelusuran',
    keterangan: 'Selisih Rp2.500.000 antara PDF dan workbook — perlu ditelusuri'
  }
];

export const initialAuditLog: AuditLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2024-01-15T08:00:00',
    user: 'ADMIN',
    aksi: 'CREATE',
    tabel: 'BUKU_KAS',
    record_id: 'KAS-001',
    nilai_lama: '-',
    nilai_baru: 'Keluar Rp1.400.000 - DP Sukiat',
    alasan: 'Input transaksi awal',
    sumber_bukti: 'Kwitansi BUKTI-001'
  },
  {
    id: 'LOG-002',
    timestamp: '2024-01-20T09:30:00',
    user: 'KEUANGAN',
    aksi: 'CREATE',
    tabel: 'BUKU_KAS',
    record_id: 'KAS-002',
    nilai_lama: '-',
    nilai_baru: 'Keluar Rp30.000.000 - DP Ija 79 BT',
    alasan: 'Pembayaran DP sesuai kwitansi',
    sumber_bukti: 'Kwitansi BUKTI-002'
  },
  {
    id: 'LOG-003',
    timestamp: '2024-03-10T14:00:00',
    user: 'ADMIN',
    aksi: 'CREATE',
    tabel: 'POS_KEWAJIBAN',
    record_id: 'UT-004',
    nilai_lama: '-',
    nilai_baru: 'Selisih Rp2.500.000 - PDF vs Workbook',
    alasan: 'Ditemukan selisih antara dokumen PDF dan workbook',
    sumber_bukti: 'Laporan_Pembebasan_Tanah_Cut_Fill.xlsx(1).pdf'
  }
];

export const initialNotaMaterial: NotaMaterial[] = [
  { id: 'NT-001', nomor_nota: 'NT-001', tanggal: '2024-01-10', toko: 'Tuan Toko', keterangan: 'Semen 50 zak', nominal: 3500000, url_bukti: '#', status: 'Terverifikasi' },
  { id: 'NT-002', nomor_nota: 'NT-002', tanggal: '2024-01-12', toko: 'Tuan Toko', keterangan: 'Pasir 10 truk', nominal: 8000000, url_bukti: '#', status: 'Terverifikasi' },
  { id: 'NT-003', nomor_nota: 'NT-003', tanggal: '2024-01-15', toko: 'Tuan Toko', keterangan: 'Besi beton', nominal: 5200000, url_bukti: '#', status: 'Belum_Verifikasi' },
  { id: 'NT-004', nomor_nota: 'NT-004', tanggal: '2024-01-18', toko: 'Tuan Toko', keterangan: 'Keramik', nominal: 2800000, url_bukti: '#', status: 'Terverifikasi' },
  { id: 'NT-005', nomor_nota: 'NT-005', tanggal: '2024-01-22', toko: 'Tuan Toko', keterangan: 'Cat & perlengkapan', nominal: 1500000, url_bukti: '#', status: 'Belum_Verifikasi' },
];

// ============ ERP SAMPLE DATA ============

export const initialStok: StokBarang[] = [
  { id: 'STK-001', kode: 'BB-001', nama: 'Semen Portland 50kg', kategori: 'Bahan_Baku', satuan: 'zak', stok_awal: 200, masuk: 100, keluar: 180, harga_pokok: 65000, harga_jual: 75000, min_stok: 50, lokasi: 'Gudang A' },
  { id: 'STK-002', kode: 'BB-002', nama: 'Pasir Pasang', kategori: 'Bahan_Baku', satuan: 'truk', stok_awal: 30, masuk: 15, keluar: 25, harga_pokok: 800000, harga_jual: 950000, min_stok: 10, lokasi: 'Yard' },
  { id: 'STK-003', kode: 'BB-003', nama: 'Besi Beton 10mm', kategori: 'Bahan_Baku', satuan: 'batang', stok_awal: 500, masuk: 200, keluar: 450, harga_pokok: 85000, harga_jual: 95000, min_stok: 100, lokasi: 'Gudang A' },
  { id: 'STK-004', kode: 'BJ-001', nama: 'Rumah Type 36', kategori: 'Barang_Jadi', satuan: 'unit', stok_awal: 0, masuk: 5, keluar: 2, harga_pokok: 250000000, harga_jual: 350000000, min_stok: 0, lokasi: 'Site A' },
  { id: 'STK-005', kode: 'BJ-002', nama: 'Rumah Type 45', kategori: 'Barang_Jadi', satuan: 'unit', stok_awal: 0, masuk: 3, keluar: 1, harga_pokok: 320000000, harga_jual: 450000000, min_stok: 0, lokasi: 'Site B' },
  { id: 'STK-006', kode: 'BD-001', nama: 'Keramik 40x40', kategori: 'Barang_Dagang', satuan: 'dus', stok_awal: 100, masuk: 50, keluar: 80, harga_pokok: 120000, harga_jual: 150000, min_stok: 20, lokasi: 'Gudang B' },
];

export const initialProduksi: Produksi[] = [
  { id: 'PRD-001', no_produksi: 'SPK-2024-001', tanggal: '2024-01-10', produk: 'Rumah Type 36', jumlah: 2, bahan_baku: [{ barang_id: 'STK-001', jumlah: 80 }, { barang_id: 'STK-003', jumlah: 200 }], biaya_tenaga_kerja: 25000000, biaya_overhead: 5000000, status: 'Selesai', catatan: 'Unit 1 & 2 Site A' },
  { id: 'PRD-002', no_produksi: 'SPK-2024-002', tanggal: '2024-02-01', produk: 'Rumah Type 45', jumlah: 1, bahan_baku: [{ barang_id: 'STK-001', jumlah: 60 }, { barang_id: 'STK-003', jumlah: 150 }], biaya_tenaga_kerja: 35000000, biaya_overhead: 7000000, status: 'Dalam_Proses', catatan: 'Site B - progress 60%' },
  { id: 'PRD-003', no_produksi: 'SPK-2024-003', tanggal: '2024-03-01', produk: 'Rumah Type 36', jumlah: 3, bahan_baku: [{ barang_id: 'STK-001', jumlah: 120 }, { barang_id: 'STK-003', jumlah: 300 }], biaya_tenaga_kerja: 45000000, biaya_overhead: 8000000, status: 'Draft', catatan: 'Rencana Site C' },
];

export const initialPenjualan: Penjualan[] = [
  { id: 'PJ-001', no_invoice: 'INV-2024-001', tanggal: '2024-02-15', pelanggan: 'Budi Santoso', items: [{ barang_id: 'STK-004', jumlah: 1, harga: 350000000, subtotal: 350000000 }], diskon: 10000000, ppn: 0, status_bayar: 'Lunas', metode_bayar: 'Transfer', jatuh_tempo: '' },
  { id: 'PJ-002', no_invoice: 'INV-2024-002', tanggal: '2024-03-01', pelanggan: 'Siti Aminah', items: [{ barang_id: 'STK-005', jumlah: 1, harga: 450000000, subtotal: 450000000 }], diskon: 0, ppn: 0, status_bayar: 'DP', metode_bayar: 'Kredit', jatuh_tempo: '2024-06-01' },
  { id: 'PJ-003', no_invoice: 'INV-2024-003', tanggal: '2024-03-10', pelanggan: 'Ahmad Wijaya', items: [{ barang_id: 'STK-006', jumlah: 20, harga: 150000, subtotal: 3000000 }], diskon: 0, ppn: 330000, status_bayar: 'Belum_Bayar', metode_bayar: 'Tunai', jatuh_tempo: '2024-04-10' },
];

export const initialPembelian: Pembelian[] = [
  { id: 'PB-001', no_po: 'PO-2024-001', tanggal: '2024-01-05', supplier: 'PT Semen Indonesia', items: [{ barang_id: 'STK-001', jumlah: 100, harga: 65000, subtotal: 6500000 }], ppn: 715000, status_bayar: 'Lunas', status_terima: 'Lengkap', jatuh_tempo: '' },
  { id: 'PB-002', no_po: 'PO-2024-002', tanggal: '2024-01-20', supplier: 'Toko Besi Jaya', items: [{ barang_id: 'STK-003', jumlah: 200, harga: 85000, subtotal: 17000000 }], ppn: 1870000, status_bayar: 'DP', status_terima: 'Lengkap', jatuh_tempo: '2024-02-20' },
  { id: 'PB-003', no_po: 'PO-2024-003', tanggal: '2024-02-10', supplier: 'CV Pasir Merapi', items: [{ barang_id: 'STK-002', jumlah: 15, harga: 800000, subtotal: 12000000 }], ppn: 0, status_bayar: 'Belum_Bayar', status_terima: 'Sebagian', jatuh_tempo: '2024-03-10' },
];

export const initialPenggajian: Penggajian[] = [
  { id: 'GJ-001', nip: 'EMP-001', nama: 'Budi Hermawan', jabatan: 'Mandor', departemen: 'Produksi', gaji_pokok: 5000000, tunjangan: 1500000, lembur: 800000, potongan: 200000, pph21: 150000, periode: '2024-03', status: 'Dibayar' },
  { id: 'GJ-002', nip: 'EMP-002', nama: 'Sri Wahyuni', jabatan: 'Admin', departemen: 'Keuangan', gaji_pokok: 4500000, tunjangan: 1000000, lembur: 0, potongan: 100000, pph21: 100000, periode: '2024-03', status: 'Dibayar' },
  { id: 'GJ-003', nip: 'EMP-003', nama: 'Agus Prasetyo', jabatan: 'Operator Beko', departemen: 'Proyek', gaji_pokok: 5500000, tunjangan: 2000000, lembur: 1200000, potongan: 300000, pph21: 200000, periode: '2024-03', status: 'Disetujui' },
  { id: 'GJ-004', nip: 'EMP-004', nama: 'Dewi Lestari', jabatan: 'Staff Gudang', departemen: 'Logistik', gaji_pokok: 4000000, tunjangan: 800000, lembur: 400000, potongan: 150000, pph21: 80000, periode: '2024-03', status: 'Draft' },
];

export const initialAnggaran: Anggaran[] = [
  { id: 'AG-001', kategori: 'Pembebasan Tanah', anggaran: 500000000, realisasi: 192600000, periode: '2024', catatan: 'Termasuk DP Sukiat, Ija, Enapsiah' },
  { id: 'AG-002', kategori: 'Cut & Fill (Beko)', anggaran: 200000000, realisasi: 75550000, periode: '2024', catatan: 'Item 4, 5, 6, Supriatna' },
  { id: 'AG-003', kategori: 'Material & Perlengkapan', anggaran: 150000000, realisasi: 21000000, periode: '2024', catatan: 'Nota Tuan Toko' },
  { id: 'AG-004', kategori: 'Tenaga Kerja', anggaran: 120000000, realisasi: 76440000, periode: '2024', catatan: 'Gaji 4 karyawan + lembur' },
  { id: 'AG-005', kategori: 'Operasional & Admin', anggaran: 50000000, realisasi: 12500000, periode: '2024', catatan: 'Transport, ATK, komunikasi' },
];

export const initialArusKas: ArusKas[] = [
  { id: 'AK-001', tanggal: '2024-01-01', keterangan: 'Saldo Awal', kategori: 'Operasional', masuk: 500000000, keluar: 0, referensi: 'Modal' },
  { id: 'AK-002', tanggal: '2024-01-15', keterangan: 'DP Tanah Sukiat', kategori: 'Investasi', masuk: 0, keluar: 1400000, referensi: 'KAS-001' },
  { id: 'AK-003', tanggal: '2024-01-20', keterangan: 'DP Tanah Ija 79 BT', kategori: 'Investasi', masuk: 0, keluar: 30000000, referensi: 'KAS-002' },
  { id: 'AK-004', tanggal: '2024-02-01', keterangan: 'Pelunasan Ija 2.5 BT', kategori: 'Investasi', masuk: 0, keluar: 2000000, referensi: 'KAS-003' },
  { id: 'AK-005', tanggal: '2024-02-15', keterangan: 'Penjualan Rumah Type 36', kategori: 'Operasional', masuk: 340000000, keluar: 0, referensi: 'INV-2024-001' },
  { id: 'AK-006', tanggal: '2024-03-01', keterangan: 'Gaji Karyawan Maret', kategori: 'Operasional', masuk: 0, keluar: 25420000, referensi: 'GJ-001 s/d GJ-004' },
];

export const initialOCR: OCRResult[] = [
  { id: 'OCR-001', timestamp: '2024-03-15T10:30:00', image_url: '#', jenis_dokumen: 'Kwitansi', data_ekstrak: { penerima: 'Sukiat', nominal: 1400000, tanggal: '2024-01-15', nomor_bukti: 'KW-001', keterangan: 'DP Tanah 18 BT' }, confidence: 95, status: 'Terverifikasi', catatan: 'Cocok dengan BUKTI-001' },
  { id: 'OCR-002', timestamp: '2024-03-15T10:35:00', image_url: '#', jenis_dokumen: 'Kwitansi', data_ekstrak: { penerima: 'Ija', nominal: 30000000, tanggal: '2024-01-20', nomor_bukti: 'KW-002', keterangan: 'DP Tanah 79 BT' }, confidence: 92, status: 'Terverifikasi', catatan: 'Cocok dengan BUKTI-002' },
  { id: 'OCR-003', timestamp: '2024-03-15T11:00:00', image_url: '#', jenis_dokumen: 'Nota', data_ekstrak: { penerima: 'Tuan Toko', nominal: 3500000, tanggal: '2024-01-10', nomor_bukti: 'NT-001', keterangan: 'Semen 50 zak' }, confidence: 88, status: 'Terverifikasi', catatan: 'Cocok dengan NT-001' },
  { id: 'OCR-004', timestamp: '2024-03-16T09:00:00', image_url: '#', jenis_dokumen: 'Kwitansi', data_ekstrak: { penerima: '???', nominal: 13000000, tanggal: '', nomor_bukti: '', keterangan: 'Tidak terbaca jelas' }, confidence: 45, status: 'Pending', catatan: 'Foto buram, perlu upload ulang' },
];

export const initialWhatsApp: WhatsAppLog[] = [
  { id: 'WA-001', timestamp: '2024-03-15T08:00:00', nomor: '081234567890', nama: 'Budi Santoso', pesan_masuk: 'Saya sudah transfer DP rumah type 36 sebesar 50jt', respon_sistem: 'Terima kasih. Pembayaran DP Rp50.000.000 tercatat. Invoice: INV-2024-002', tipe: 'Input_Transaksi', status: 'Terkirim' },
  { id: 'WA-002', timestamp: '2024-03-15T09:30:00', nomor: '081298765432', nama: 'Siti Aminah', pesan_masuk: 'Kapan jatuh tempo cicilan saya?', respon_sistem: 'Jatuh tempo cicilan: 1 Juni 2024. Sisa: Rp400.000.000', tipe: 'Laporan', status: 'Terkirim' },
  { id: 'WA-003', timestamp: '2024-03-16T07:00:00', nomor: 'SYSTEM', nama: 'Sistem', pesan_masuk: '', respon_sistem: 'Reminder: Jatuh tempo PO-2024-003 (CV Pasir Merapi) Rp12.000.000 pada 10 Maret 2024', tipe: 'Reminder', status: 'Terkirim' },
  { id: 'WA-004', timestamp: '2024-03-16T10:00:00', nomor: '081345678901', nama: 'Ahmad Wijaya', pesan_masuk: 'Foto kwitansi pembelian keramik', respon_sistem: 'Foto diterima. OCR sedang memproses. Hasil: Nota Keramik Rp3.000.000 - menunggu verifikasi', tipe: 'Input_Transaksi', status: 'Diproses' },
];

export const initialMenuConfig: MenuItem[] = [
  { id: 'M-01', label: 'Dashboard', icon: 'LayoutDashboard', page: 'dashboard', order: 1, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'] },
  { id: 'M-02', label: 'Stok Barang', icon: 'Package', page: 'stok', order: 2, visible: true, role_access: ['ADMIN', 'KEUANGAN', 'PROYEK'] },
  { id: 'M-03', label: 'Produksi', icon: 'Factory', page: 'produksi', order: 3, visible: true, role_access: ['ADMIN', 'PROYEK'] },
  { id: 'M-04', label: 'Penjualan', icon: 'ShoppingCart', page: 'penjualan', order: 4, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-05', label: 'Pembelian', icon: 'Truck', page: 'pembelian', order: 5, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-06', label: 'Akuntansi', icon: 'BookOpen', page: 'bukukas', order: 6, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-07', label: 'Penggajian', icon: 'Users', page: 'penggajian', order: 7, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-08', label: 'Anggaran', icon: 'PieChart', page: 'anggaran', order: 8, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-09', label: 'OCR / Vision AI', icon: 'Scan', page: 'ocr', order: 9, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-10', label: 'WhatsApp', icon: 'MessageCircle', page: 'whatsapp', order: 10, visible: true, role_access: ['ADMIN', 'KEUANGAN'] },
  { id: 'M-11', label: 'Konfigurasi Menu', icon: 'Settings', page: 'menuconfig', order: 11, visible: true, role_access: ['ADMIN'] },
];

// ============ UTILITY FUNCTIONS ============
export const formatRupiah = (angka: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka);
};

export const generateId = (prefix: string, existing: { id: string }[]): string => {
  const num = existing.length + 1;
  return `${prefix}-${String(num).padStart(3, '0')}`;
};
