// ============ SISTEM AKUNTANSI DOUBLE-ENTRY ============
// Setiap transaksi memiliki minimal 2 akun (Debit & Credit)

export interface Akun {
  kode: string;
  nama: string;
  tipe: 'Aset' | 'Kewajiban' | 'Ekuitas' | 'Pendapatan' | 'Beban';
  kategori: string;
  saldo_normal: 'Debit' | 'Kredit';
  saldo: number;
}

export interface JurnalUmum {
  id: string;
  tanggal: string;
  no_jurnal: string;
  keterangan: string;
  referensi?: string;
  entries: JurnalEntry[];
  total_debit: number;
  total_kredit: number;
  status: 'Draft' | 'Posted' | 'Cancelled';
  createdBy: string;
  createdAt: string;
}

export interface JurnalEntry {
  id: string;
  akun_kode: string;
  akun_nama: string;
  debit: number;
  kredit: number;
  keterangan?: string;
}

export interface BukuBesar {
  akun_kode: string;
  akun_nama: string;
  entries: BukuBesarEntry[];
  saldo_awal: number;
  total_debit: number;
  total_kredit: number;
  saldo_akhir: number;
}

export interface BukuBesarEntry {
  tanggal: string;
  no_jurnal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
}

export interface Invoice {
  id: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  pelanggan: string;
  items: InvoiceItem[];
  subtotal: number;
  diskon: number;
  ppn: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  pembayaran?: Pembayaran[];
}

export interface InvoiceItem {
  deskripsi: string;
  qty: number;
  harga: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  no_po: string;
  tanggal: string;
  supplier: string;
  items: POItem[];
  subtotal: number;
  ppn: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Received' | 'Paid' | 'Cancelled';
  penerimaan?: Penerimaan[];
}

export interface POItem {
  deskripsi: string;
  qty: number;
  harga: number;
  subtotal: number;
}

export interface Pembayaran {
  tanggal: string;
  jumlah: number;
  metode: 'Tunai' | 'Transfer' | 'Cek';
  referensi: string;
}

export interface Penerimaan {
  tanggal: string;
  items: { deskripsi: string; qty_diterima: number }[];
  catatan?: string;
}

// ============ LAPORAN KEUANGAN ============

export interface LabaRugi {
  periode: string;
  pendapatan: {
    akun: string;
    jumlah: number;
  }[];
  total_pendapatan: number;
  beban: {
    akun: string;
    jumlah: number;
  }[];
  total_beban: number;
  laba_bersih: number;
}

export interface Neraca {
  tanggal: string;
  aset: {
    aset_lancar: { akun: string; jumlah: number }[];
    aset_tetap: { akun: string; jumlah: number }[];
    total_aset_lancar: number;
    total_aset_tetap: number;
    total_aset: number;
  };
  kewajiban: {
    kewajiban_jangka_pendek: { akun: string; jumlah: number }[];
    kewajiban_jangka_panjang: { akun: string; jumlah: number }[];
    total_kewajiban_jangka_pendek: number;
    total_kewajiban_jangka_panjang: number;
    total_kewajiban: number;
  };
  ekuitas: {
    akun: string;
    jumlah: number;
  }[];
  total_ekuitas: number;
  total_kewajiban_ekuitas: number;
}

export interface ArusKas {
  periode: string;
  arus_kas_operasi: {
    keterangan: string;
    jumlah: number;
  }[];
  total_arus_kas_operasi: number;
  arus_kas_investasi: {
    keterangan: string;
    jumlah: number;
  }[];
  total_arus_kas_investasi: number;
  arus_kas_pendanaan: {
    keterangan: string;
    jumlah: number;
  }[];
  total_arus_kas_pendanaan: number;
  kenaikan_penurunan_kas: number;
  kas_awal_periode: number;
  kas_akhir_periode: number;
}

// ============ RAB (Rencana Anggaran Biaya) ============

export interface RAB {
  id: string;
  nama_proyek: string;
  tanggal: string;
  items: RABItem[];
  total_biaya: number;
  status: 'Draft' | 'Approved' | 'In Progress' | 'Completed';
}

export interface RABItem {
  kategori: 'Material' | 'Upah' | 'Alat' | 'Lainnya';
  deskripsi: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  jumlah: number;
}

// ============ SCHEDULE & CALENDAR ============

export interface Schedule {
  id: string;
  judul: string;
  tanggal: string;
  waktu?: string;
  kategori: 'Invoice' | 'PO' | 'Meeting' | 'Deadline' | 'Lainnya';
  deskripsi?: string;
  reminder?: boolean;
  synced?: boolean;
  googleCalendarId?: string;
}
