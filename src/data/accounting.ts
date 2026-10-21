import { Akun, JurnalUmum, Invoice, PurchaseOrder, RAB, Schedule } from '../types/accounting';

// ============ CHART OF ACCOUNTS (DAFTAR AKUN) ============
export const initialAkun: Akun[] = [
  // ASET
  { kode: '1-1001', nama: 'Kas', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1002', nama: 'Bank', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1003', nama: 'Piutang Usaha', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1004', nama: 'Persediaan Barang', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1005', nama: 'Biaya Dibayar Dimuka', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-2001', nama: 'Peralatan', tipe: 'Aset', kategori: 'Aset Tetap', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-2002', nama: 'Kendaraan', tipe: 'Aset', kategori: 'Aset Tetap', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-2003', nama: 'Bangunan', tipe: 'Aset', kategori: 'Aset Tetap', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-2004', nama: 'Akumulasi Penyusutan', tipe: 'Aset', kategori: 'Aset Tetap', saldo_normal: 'Kredit', saldo: 0 },
  
  // KEWAJIBAN
  { kode: '2-1001', nama: 'Utang Usaha', tipe: 'Kewajiban', kategori: 'Kewajiban Jangka Pendek', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '2-1002', nama: 'Utang Bank', tipe: 'Kewajiban', kategori: 'Kewajiban Jangka Pendek', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '2-1003', nama: 'Utang Pajak', tipe: 'Kewajiban', kategori: 'Kewajiban Jangka Pendek', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '2-1004', nama: 'Pendapatan Diterima Dimuka', tipe: 'Kewajiban', kategori: 'Kewajiban Jangka Pendek', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '2-2001', nama: 'Utang Jangka Panjang', tipe: 'Kewajiban', kategori: 'Kewajiban Jangka Panjang', saldo_normal: 'Kredit', saldo: 0 },
  
  // EKUITAS
  { kode: '3-1001', nama: 'Modal Pemilik', tipe: 'Ekuitas', kategori: 'Ekuitas', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '3-1002', nama: 'Laba Ditahan', tipe: 'Ekuitas', kategori: 'Ekuitas', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '3-1003', nama: 'Prive', tipe: 'Ekuitas', kategori: 'Ekuitas', saldo_normal: 'Debit', saldo: 0 },
  
  // PENDAPATAN
  { kode: '4-1001', nama: 'Pendapatan Penjualan', tipe: 'Pendapatan', kategori: 'Pendapatan Usaha', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '4-1002', nama: 'Pendapatan Jasa', tipe: 'Pendapatan', kategori: 'Pendapatan Usaha', saldo_normal: 'Kredit', saldo: 0 },
  { kode: '4-1003', nama: 'Pendapatan Lain-lain', tipe: 'Pendapatan', kategori: 'Pendapatan Non-Usaha', saldo_normal: 'Kredit', saldo: 0 },
  
  // BEBAN
  { kode: '5-1001', nama: 'Harga Pokok Penjualan', tipe: 'Beban', kategori: 'Beban Langsung', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2001', nama: 'Beban Gaji', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2002', nama: 'Beban Sewa', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2003', nama: 'Beban Listrik & Air', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2004', nama: 'Beban Telepon & Internet', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2005', nama: 'Beban Transportasi', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2006', nama: 'Beban Perlengkapan', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2007', nama: 'Beban Penyusutan', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
  { kode: '5-2008', nama: 'Beban Lain-lain', tipe: 'Beban', kategori: 'Beban Operasional', saldo_normal: 'Debit', saldo: 0 },
];

// ============ SAMPLE JURNAL ============
export const initialJurnal: JurnalUmum[] = [
  {
    id: 'J-001',
    tanggal: '2026-01-05',
    no_jurnal: 'JU-2026-001',
    keterangan: 'Setoran modal awal',
    entries: [
      { id: 'E-001', akun_kode: '1-1001', akun_nama: 'Kas', debit: 100000000, kredit: 0 },
      { id: 'E-002', akun_kode: '3-1001', akun_nama: 'Modal Pemilik', debit: 0, kredit: 100000000 },
    ],
    total_debit: 100000000,
    total_kredit: 100000000,
    status: 'Posted',
    createdBy: 'Admin',
    createdAt: '2026-01-05T10:00:00Z'
  },
  {
    id: 'J-002',
    tanggal: '2026-01-10',
    no_jurnal: 'JU-2026-002',
    keterangan: 'Pembelian peralatan',
    entries: [
      { id: 'E-003', akun_kode: '1-2001', akun_nama: 'Peralatan', debit: 15000000, kredit: 0 },
      { id: 'E-004', akun_kode: '1-1001', akun_nama: 'Kas', debit: 0, kredit: 15000000 },
    ],
    total_debit: 15000000,
    total_kredit: 15000000,
    status: 'Posted',
    createdBy: 'Admin',
    createdAt: '2026-01-10T14:30:00Z'
  },
  {
    id: 'J-003',
    tanggal: '2026-01-15',
    no_jurnal: 'JU-2026-003',
    keterangan: 'Penjualan jasa - Invoice INV-001',
    referensi: 'INV-001',
    entries: [
      { id: 'E-005', akun_kode: '1-1003', akun_nama: 'Piutang Usaha', debit: 25000000, kredit: 0 },
      { id: 'E-006', akun_kode: '4-1002', akun_nama: 'Pendapatan Jasa', debit: 0, kredit: 25000000 },
    ],
    total_debit: 25000000,
    total_kredit: 25000000,
    status: 'Posted',
    createdBy: 'Admin',
    createdAt: '2026-01-15T09:15:00Z'
  },
  {
    id: 'J-004',
    tanggal: '2026-01-20',
    no_jurnal: 'JU-2026-004',
    keterangan: 'Pembayaran piutang dari pelanggan',
    entries: [
      { id: 'E-007', akun_kode: '1-1001', akun_nama: 'Kas', debit: 25000000, kredit: 0 },
      { id: 'E-008', akun_kode: '1-1003', akun_nama: 'Piutang Usaha', debit: 0, kredit: 25000000 },
    ],
    total_debit: 25000000,
    total_kredit: 25000000,
    status: 'Posted',
    createdBy: 'Admin',
    createdAt: '2026-01-20T16:45:00Z'
  },
  {
    id: 'J-005',
    tanggal: '2026-01-25',
    no_jurnal: 'JU-2026-005',
    keterangan: 'Pembayaran gaji karyawan',
    entries: [
      { id: 'E-009', akun_kode: '5-2001', akun_nama: 'Beban Gaji', debit: 8000000, kredit: 0 },
      { id: 'E-010', akun_kode: '1-1001', akun_nama: 'Kas', debit: 0, kredit: 8000000 },
    ],
    total_debit: 8000000,
    total_kredit: 8000000,
    status: 'Posted',
    createdBy: 'Admin',
    createdAt: '2026-01-25T17:00:00Z'
  },
];

// ============ SAMPLE INVOICE ============
export const initialInvoice: Invoice[] = [
  {
    id: 'INV-001',
    no_invoice: 'INV-2026-001',
    tanggal: '2026-01-15',
    jatuh_tempo: '2026-02-15',
    pelanggan: 'PT Maju Jaya',
    items: [
      { deskripsi: 'Jasa Konsultasi', qty: 1, harga: 25000000, subtotal: 25000000 }
    ],
    subtotal: 25000000,
    diskon: 0,
    ppn: 2500000,
    total: 27500000,
    status: 'Paid',
    pembayaran: [
      { tanggal: '2026-01-20', jumlah: 27500000, metode: 'Transfer', referensi: 'TRF-001' }
    ]
  }
];

// ============ SAMPLE PURCHASE ORDER ============
export const initialPO: PurchaseOrder[] = [
  {
    id: 'PO-001',
    no_po: 'PO-2026-001',
    tanggal: '2026-01-10',
    supplier: 'Toko Peralatan ABC',
    items: [
      { deskripsi: 'Laptop', qty: 1, harga: 15000000, subtotal: 15000000 }
    ],
    subtotal: 15000000,
    ppn: 1500000,
    total: 16500000,
    status: 'Received',
    penerimaan: [
      { tanggal: '2026-01-12', items: [{ deskripsi: 'Laptop', qty_diterima: 1 }] }
    ]
  }
];

// ============ SAMPLE RAB ============
export const initialRAB: RAB[] = [
  {
    id: 'RAB-001',
    nama_proyek: 'Pembangunan Gudang',
    tanggal: '2026-01-01',
    items: [
      { kategori: 'Material', deskripsi: 'Semen', volume: 100, satuan: 'zak', harga_satuan: 65000, jumlah: 6500000 },
      { kategori: 'Material', deskripsi: 'Pasir', volume: 10, satuan: 'truk', harga_satuan: 800000, jumlah: 8000000 },
      { kategori: 'Upah', deskripsi: 'Tukang', volume: 30, satuan: 'hari', harga_satuan: 150000, jumlah: 4500000 },
      { kategori: 'Upah', deskripsi: 'Kenek', volume: 30, satuan: 'hari', harga_satuan: 100000, jumlah: 3000000 },
      { kategori: 'Alat', deskripsi: 'Sewa Mixer', volume: 5, satuan: 'hari', harga_satuan: 200000, jumlah: 1000000 },
    ],
    total_biaya: 23000000,
    status: 'Approved'
  }
];

// ============ SAMPLE SCHEDULE ============
export const initialSchedule: Schedule[] = [
  {
    id: 'SCH-001',
    judul: 'Jatuh Tempo Invoice INV-001',
    tanggal: '2026-02-15',
    kategori: 'Invoice',
    deskripsi: 'PT Maju Jaya - Rp27.500.000',
    reminder: true,
    synced: false
  },
  {
    id: 'SCH-002',
    judul: 'Meeting dengan Supplier',
    tanggal: '2026-01-28',
    waktu: '10:00',
    kategori: 'Meeting',
    deskripsi: 'Negosiasi harga material',
    reminder: true,
    synced: false
  }
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
