import { Akun, JurnalUmum, Invoice, PurchaseOrder, RAB, Schedule } from '../types/accounting';

// ============ CHART OF ACCOUNTS (DAFTAR AKUN) ============
export const initialAkun: Akun[] = [
  // ASET
  { kode: '1-1001', nama: 'Kas', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1002', nama: 'Bank', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1003', nama: 'Piutang Usaha', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1004', nama: 'Persediaan Barang', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1005', nama: 'Biaya Dibayar Dimuka', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
  { kode: '1-1006', nama: 'PPN Masukan', tipe: 'Aset', kategori: 'Aset Lancar', saldo_normal: 'Debit', saldo: 0 },
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

// Data transaksi awal sengaja kosong. Laporan hanya boleh menampilkan data yang benar-benar diinput.
export const initialJurnal: JurnalUmum[] = [];

export const initialInvoice: Invoice[] = [];

export const initialPO: PurchaseOrder[] = [];

export const initialRAB: RAB[] = [];

export const initialSchedule: Schedule[] = [];

// ============ UTILITY FUNCTIONS ============
export const getLocalDateISO = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
