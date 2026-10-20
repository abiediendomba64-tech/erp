import { BukuKas, ArsipBukti, PosKewajiban, AuditLog, Tanah, Beko, NotaMaterial } from './types';

// ============ SAMPLE DATA FROM AUDIT REPORT ============

export const initialTanah: Tanah[] = [
  {
    id: 'T-001',
    pemilik: 'Sukiat',
    luas_bt: 18,
    harga_per_bt: 800000,
    nilai_total: 14400000,
    dp: 1400000,
    sisa: 13000000,
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
    nilai_total: 63200000,
    dp: 30000000,
    sisa: 33200000,
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
    nilai_total: 2000000,
    dp: 2000000,
    sisa: 0,
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
    nilai_total: 71000000,
    dp: 0,
    sisa: 71000000,
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
    nilai: 16900000,
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
    nilai: 41325000,
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
    nilai: 13125000,
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
    nilai: 0,
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
    nilai: 0,
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
    nilai: 4300000,
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
    selisih: 0,
    status: 'Dalam_Penelusuran',
    keterangan: 'DP Rp1.400.000 sudah dibayar. Sisa Rp13.000.000 belum ada bukti.'
  },
  {
    id: 'UT-002',
    kode_utang: 'UT-002',
    pihak: 'Ija (79 BT)',
    nilai_menurut_dokumen: 63200000,
    nilai_menurut_workbook: 63200000,
    selisih: 0,
    status: 'Dalam_Penelusuran',
    keterangan: 'DP Rp30.000.000 sudah dibayar. Sisa Rp33.200.000 belum ada bukti.'
  },
  {
    id: 'UT-003',
    kode_utang: 'UT-003',
    pihak: 'Enapsiah & Bonus Ija',
    nilai_menurut_dokumen: 71000000,
    nilai_menurut_workbook: 71000000,
    selisih: 0,
    status: 'Dalam_Penelusuran',
    keterangan: 'Perlu klarifikasi status pembayaran dan bukti'
  },
  {
    id: 'UT-004',
    kode_utang: 'UT-004',
    pihak: 'Selisih Rekonsiliasi',
    nilai_menurut_dokumen: 34700000,
    nilai_menurut_workbook: 37200000,
    selisih: 2500000,
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
