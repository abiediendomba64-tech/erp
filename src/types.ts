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
  jenis:
    | 'Kwitansi_Foto'
    | 'Transfer_Bank'
    | 'BAST'
    | 'Tidak_Ada'
    | 'Nota_Foto'
    | 'Invoice_Faktur'
    | 'Perjanjian_Jual_Beli'
    | 'PPJB'
    | 'AJB'
    | 'Akta_Notaris'
    | 'Sertifikat_SHM'
    | 'Sertifikat_SHGB'
    | 'PBB'
    | 'Surat_Kuasa'
    | 'KTP_NPWP'
    | 'Surat_Pernyataan'
    | 'Kontrak_Kerja'
    | 'SPK'
    | 'Addendum_Kontrak'
    | 'RAB'
    | 'Progress_Pekerjaan'
    | 'Dokumen_PBG_IMB'
    | 'SLF'
    | 'NIB'
    | 'Lainnya';
  link_drive: string;
  tgl_upload: string;
  terverifikasi: 'Ya' | 'Tidak' | 'Perlu_Konfirmasi';
  catatan_audit: string;
  penerima: string;
  nominal: number;
  keterangan: string;
  // Metadata dokumen pendukung. File lokal disimpan pada IndexedDB perangkat/browser ini.
  judul_dokumen?: string;
  nomor_dokumen?: string;
  tanggal_dokumen?: string;
  proyek?: string;
  modul_terkait?: 'Buku Kas' | 'Tanah' | 'Beko' | 'Utang Tanah' | 'Nota Material' | 'Kontrak' | 'Proyek' | 'Lainnya';
  id_terkait?: string;
  nama_file?: string;
  mime_type?: string;
  ukuran_bytes?: number;
  local_file_key?: string;
  nama_pengunggah?: string;
  waktu_dibuat?: string;
  diverifikasi_oleh?: string;
  waktu_verifikasi?: string;
}

// ============ LAYER 3: POS KEWAJIBAN ============
export interface PosKewajiban {
  id: string;
  kode_utang: string;
  pihak: string;
  nilai_menurut_dokumen: number; // Nilai total menurut dokumen
  nilai_menurut_workbook: number; // Nilai total menurut workbook
  dp_dibayar: number; // DP referensi yang sudah dibayar
  tanah_id?: string; // jika terhubung, register Tanah menjadi sumber nilai/pembayaran terkini
  status: 'Sepakat' | 'Dalam_Penelusuran' | 'Sengketa';
  keterangan: string;
  // COMPUTED: sisa_utang = nilai_menurut_dokumen - dp_dibayar
  // COMPUTED: selisih_rekonsiliasi = nilai_menurut_workbook - nilai_menurut_dokumen
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
  dp: number;
  status: 'Lunas' | 'DP' | 'Belum_Bayar';
  kode_bukti: string;
  url_bukti: string;
  catatan: string;
  nilai_total_manual?: number; // wajib isi jika luas/harga tidak tersedia dan nilai berasal dari nominal kesepakatan langsung
  // COMPUTED: nilai_total = nilai_total_manual jika ada; selain itu luas_bt × harga_per_bt
  // COMPUTED: sisa = max(0, nilai_total - dp)
}

// ============ BEKO (Excavator Records) ============
export interface Beko {
  id: string;
  item: string;
  panjang: number;
  lebar: number;
  tinggi: number;
  tarif: number;
  status: 'Lunas' | 'Belum_Ada_Kwitansi' | 'Foto_Belum_Tersedia';
  kode_bukti: string;
  url_bukti: string;
  catatan: string;
  termasuk_rekap?: boolean;
  satuan_volume?: 'm3' | 'unit' | 'ls';
  status_pembayaran?: 'Belum_Dikonfirmasi' | 'Belum_Bayar' | 'DP' | 'Lunas';
  // COMPUTED: volume × tarif; item LS menggunakan tarif sebagai nilai lumpsum.
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
  harga_pokok: number;
  harga_jual: number;
  min_stok: number;
  lokasi: string;
  // COMPUTED: stok_akhir = stok_awal + masuk - keluar
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
  status: 'Draft' | 'Dalam_Proses' | 'Selesai' | 'Batal';
  catatan: string;
  // COMPUTED: total_biaya = biaya_tenaga_kerja + biaya_overhead
}

// PENJUALAN
export interface Penjualan {
  id: string;
  no_invoice: string;
  tanggal: string;
  pelanggan: string;
  items: { barang_id: string; jumlah: number; harga: number; subtotal: number }[];
  diskon: number;
  ppn: number;
  status_bayar: 'Lunas' | 'Belum_Bayar' | 'DP' | 'Jatuh_Tempo';
  metode_bayar: 'Tunai' | 'Transfer' | 'Kredit';
  jatuh_tempo: string;
  // COMPUTED: total = sum(items.subtotal)
  // COMPUTED: grand_total = total - diskon + ppn
}

// PEMBELIAN
export interface Pembelian {
  id: string;
  no_po: string;
  tanggal: string;
  supplier: string;
  items: { barang_id: string; jumlah: number; harga: number; subtotal: number }[];
  ppn: number;
  status_bayar: 'Lunas' | 'Belum_Bayar' | 'DP';
  status_terima: 'Belum' | 'Sebagian' | 'Lengkap';
  jatuh_tempo: string;
  // COMPUTED: total = sum(items.subtotal)
  // COMPUTED: grand_total = total + ppn
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
  periode: string;
  status: 'Draft' | 'Disetujui' | 'Dibayar';
  // COMPUTED: gaji_bersih = gaji_pokok + tunjangan + lembur - potongan - pph21
}

// ANGGARAN
export interface Anggaran {
  id: string;
  kategori: string;
  anggaran: number;
  realisasi: number;
  periode: string;
  catatan: string;
  // COMPUTED: sisa = anggaran - realisasi
  // COMPUTED: persentase = (realisasi / anggaran) × 100
}

// ARUS KAS
export interface ArusKas {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: 'Operasional' | 'Investasi' | 'Pendanaan';
  masuk: number;
  keluar: number;
  referensi: string;
  // COMPUTED: saldo = running total (masuk - keluar) dari semua transaksi sebelumnya
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
