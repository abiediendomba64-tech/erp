/**
 * ALOKASI DANA DETAIL PER PERIODE
 * Data berdasarkan klarifikasi pengguna - 21 Oktober 2026
 * 
 * PERHATIAN: Angka ini harus direkonsiliasi dengan bukti fisik
 */

export interface AlokasiItem {
  id: string;
  keterangan: string;
  penerima: string;
  kategori: 'tanah' | 'beko' | 'biaya_pt' | 'material' | 'pajak' | 'lainnya';
  nominal: number;
  status: 'terbayar' | 'belum_terbayar' | 'dalam_proses' | 'deal';
  bukti: string;
  catatan: string;
}

export interface PeriodeDana {
  id: string;
  nomor: number;
  tanggal: string;
  jumlah_dana: number;
  alokasi: AlokasiItem[];
  total_terpakai: number;
  sisa: number;
  catatan: string;
}

// ============ PERIODE 1: Dana Rp32.500.000 (28 Agustus 2026) ============
export const periode1: PeriodeDana = {
  id: 'P-01',
  nomor: 1,
  tanggal: '2026-08-28',
  jumlah_dana: 32500000,
  alokasi: [
    {
      id: 'P1-01',
      keterangan: 'Pembayaran tanah Pak Dede',
      penerima: 'Pak Dede',
      kategori: 'tanah',
      nominal: 20000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Bagian dari total 141 BT'
    },
    {
      id: 'P1-02',
      keterangan: 'DP Tanah Sanaris 19 BT',
      penerima: 'Sanaris',
      kategori: 'tanah',
      nominal: 5200000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'DP, sisa 10jt'
    },
    {
      id: 'P1-03',
      keterangan: 'Cap/Stamp duty',
      penerima: 'Notaris',
      kategori: 'pajak',
      nominal: 350000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Cap dokumen'
    },
    {
      id: 'P1-04',
      keterangan: 'NPWP PT',
      penerima: 'Pajak',
      kategori: 'pajak',
      nominal: 150000,
      status: 'terbayar',
      bukti: 'Bukti bayar',
      catatan: 'Pembuatan NPWP'
    },
    {
      id: 'P1-05',
      keterangan: 'Tanah Ija 2.5 BT',
      penerima: 'Ija (Sutija)',
      kategori: 'tanah',
      nominal: 2000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Lunas'
    },
    {
      id: 'P1-06',
      keterangan: 'Biaya PT (legalitas)',
      penerima: 'Notaris/PPAT',
      kategori: 'biaya_pt',
      nominal: 8500000,
      status: 'belum_terbayar',
      bukti: 'Tagihan',
      catatan: 'MASIH SISA - belum dibayar dari dana ini'
    }
  ],
  total_terpakai: 27700000, // 20 + 5.2 + 0.35 + 0.15 + 2 = 27.7jt
  sisa: 4800000, // 32.5 - 27.7 = 4.8jt
  catatan: 'Biaya PT 8.5jt belum terbayar dari dana ini. Sisa 4.8jt + tagihan 8.5jt = perlu dana tambahan 3.7jt'
};

// ============ PERIODE 2: Dana Rp50.000.000 (30 September 2026) ============
export const periode2: PeriodeDana = {
  id: 'P-02',
  nomor: 2,
  tanggal: '2026-09-30',
  jumlah_dana: 50000000,
  alokasi: [
    {
      id: 'P2-01',
      keterangan: 'Beko (tahap awal)',
      penerima: 'Operator Beko',
      kategori: 'beko',
      nominal: 10000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Mobilisasi + operasional awal'
    },
    {
      id: 'P2-02',
      keterangan: 'Tanah Pak Dede (lanjutan)',
      penerima: 'Pak Dede',
      kategori: 'tanah',
      nominal: 12500000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Lanjutan pembayaran'
    },
    {
      id: 'P2-03',
      keterangan: 'Beko cut fill',
      penerima: 'Operator Beko',
      kategori: 'beko',
      nominal: 5750000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Item tertentu'
    },
    {
      id: 'P2-04',
      keterangan: 'Beko cut fill',
      penerima: 'Operator Beko',
      kategori: 'beko',
      nominal: 4500000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Item tertentu'
    },
    {
      id: 'P2-05',
      keterangan: 'Bonus/komisi Ija',
      penerima: 'Ija (Sutija)',
      kategori: 'lainnya',
      nominal: 1000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Bonus perantara'
    },
    {
      id: 'P2-06',
      keterangan: 'Bahan tangga',
      penerima: 'Supplier',
      kategori: 'material',
      nominal: 3000000,
      status: 'terbayar',
      bukti: 'Nota',
      catatan: 'Material bangunan'
    },
    {
      id: 'P2-07',
      keterangan: 'Beko cut fill',
      penerima: 'Operator Beko',
      kategori: 'beko',
      nominal: 5000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Item tertentu'
    }
  ],
  total_terpakai: 41750000, // 10 + 12.5 + 5.75 + 4.5 + 1 + 3 + 5 = 41.75jt
  sisa: 8250000, // 50 - 41.75 = 8.25jt
  catatan: 'Sisa 8.25jt belum dialokasikan'
};

// ============ PERIODE 3: Dana Rp50.000.000 (28 September 2026) ============
export const periode3: PeriodeDana = {
  id: 'P-03',
  nomor: 3,
  tanggal: '2026-09-28',
  jumlah_dana: 50000000,
  alokasi: [
    {
      id: 'P3-01',
      keterangan: 'Pelunasan Ija 79 BT (bagian)',
      penerima: 'Ija (Sutija)',
      kategori: 'tanah',
      nominal: 30000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Bagian dari pelunasan 79 BT'
    },
    {
      id: 'P3-02',
      keterangan: 'Beko cut fill',
      penerima: 'Operator Beko',
      kategori: 'beko',
      nominal: 11900000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Item tertentu'
    },
    {
      id: 'P3-03',
      keterangan: 'Bahan besi',
      penerima: 'Supplier',
      kategori: 'material',
      nominal: 296000,
      status: 'terbayar',
      bukti: 'Nota',
      catatan: 'Material besi'
    }
  ],
  total_terpakai: 42196000, // 30 + 11.9 + 0.296 = 42.196jt
  sisa: 7804000, // 50 - 42.196 = 7.804jt
  catatan: 'Sisa 7.804jt belum dialokasikan'
};

// ============ PERIODE 4: Dana Rp60.000.000 (5 Oktober 2026) ============
export const periode4: PeriodeDana = {
  id: 'P-04',
  nomor: 4,
  tanggal: '2026-10-05',
  jumlah_dana: 60000000,
  alokasi: [
    {
      id: 'P4-01',
      keterangan: 'Pelunasan Ija 79 BT (sisa)',
      penerima: 'Ija (Sutija)',
      kategori: 'tanah',
      nominal: 33200000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Sisa pelunasan 79 BT'
    },
    {
      id: 'P4-02',
      keterangan: 'DP Tanah DUDI 36.5 BT',
      penerima: 'DUDI',
      kategori: 'tanah',
      nominal: 15000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'DP, sisa 14.2jt'
    },
    {
      id: 'P4-03',
      keterangan: 'Beko cut fill',
      penerima: 'Operator Beko',
      kategori: 'beko',
      nominal: 10000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Item tertentu'
    }
  ],
  total_terpakai: 58200000, // 33.2 + 15 + 10 = 58.2jt
  sisa: 1800000, // 60 - 58.2 = 1.8jt
  catatan: 'Sisa 1.8jt belum dialokasikan'
};

// ============ PERIODE 5: Dana Rp15.000.000 (13 Oktober 2026) ============
export const periode5: PeriodeDana = {
  id: 'P-05',
  nomor: 5,
  tanggal: '2026-10-13',
  jumlah_dana: 15000000,
  alokasi: [
    {
      id: 'P5-01',
      keterangan: 'Beko cut fill',
      penerima: 'Operator Beko',
      kategori: 'beko',
      nominal: 15000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Item tertentu'
    }
  ],
  total_terpakai: 15000000,
  sisa: 0,
  catatan: 'Dana terpakai semua. Ada kewajiban beko item 14x39x2 (25jt) dan Enapsiah yang sedang deal'
};

// ============ PERIODE 0: Dana Sebelum 28 Sep 2026 (Rp204.000.000) ============
export const periode0: PeriodeDana = {
  id: 'P-00',
  nomor: 0,
  tanggal: '< 2026-09-28',
  jumlah_dana: 204000000,
  alokasi: [
    {
      id: 'P0-01',
      keterangan: 'Pembayaran tanah Pak Dede (bagian besar)',
      penerima: 'Pak Dede',
      kategori: 'tanah',
      nominal: 67500000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: '141 BT x 750rb = 105.750.000, dibayar bertahap'
    },
    {
      id: 'P0-02',
      keterangan: 'Tanah Sanaris 17 BT',
      penerima: 'Sanaris',
      kategori: 'tanah',
      nominal: 13600000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: '17 BT x 800rb = 13.600.000, lunas'
    },
    {
      id: 'P0-03',
      keterangan: 'Tanah Sukiat 18 BT',
      penerima: 'Sukiat',
      kategori: 'tanah',
      nominal: 14400000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: '18 BT x 800rb = 14.400.000, lunas'
    },
    {
      id: 'P0-04',
      keterangan: 'Tanah Supriatna 12.5 BT',
      penerima: 'Supriatna',
      kategori: 'tanah',
      nominal: 10000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: '12.5 BT x 800rb = 10.000.000, lunas'
    },
    {
      id: 'P0-05',
      keterangan: 'Tanah Ija 81.5 BT (bagian)',
      penerima: 'Ija (Sutija)',
      kategori: 'tanah',
      nominal: 33200000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'Bagian dari total 66.200.000'
    },
    {
      id: 'P0-06',
      keterangan: 'Enapsiah (tanpa luas)',
      penerima: 'Enapsiah',
      kategori: 'tanah',
      nominal: 70000000,
      status: 'dalam_proses',
      bukti: 'Perjanjian',
      catatan: 'Status ditunda/deal, belum final'
    },
    {
      id: 'P0-07',
      keterangan: 'DP Balong 30 BT',
      penerima: 'Balong',
      kategori: 'tanah',
      nominal: 15000000,
      status: 'terbayar',
      bukti: 'Kwitansi',
      catatan: 'DP, sisa 10.5jt'
    }
  ],
  total_terpakai: 223700000, // 67.5 + 13.6 + 14.4 + 10 + 33.2 + 70 + 15 = 223.7jt
  sisa: -19700000, // 204 - 223.7 = -19.7jt (OVER!)
  catatan: 'PERHATIAN: Total alokasi 223.7jt melebihi dana 204jt. Ada over-allocation 19.7jt yang perlu klarifikasi. Mungkin Enapsiah 70jt belum benar-benar dibayar?'
};

// ============ REKAPITULASI ============
export const semuaPeriode: PeriodeDana[] = [periode0, periode1, periode2, periode3, periode4, periode5];

export const rekapitulasi = {
  total_dana_masuk: semuaPeriode.reduce((sum, p) => sum + p.jumlah_dana, 0), // 411.500.000
  total_alokasi: semuaPeriode.reduce((sum, p) => sum + p.total_terpakai, 0), // 408.546.000
  total_sisa: semuaPeriode.reduce((sum, p) => sum + p.sisa, 0), // 2.954.000
  
  // Per kategori
  total_tanah: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.kategori === 'tanah').reduce((s, a) => s + a.nominal, 0), 0),
  total_beko: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.kategori === 'beko').reduce((s, a) => s + a.nominal, 0), 0),
  total_material: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.kategori === 'material').reduce((s, a) => s + a.nominal, 0), 0),
  total_pajak: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.kategori === 'pajak').reduce((s, a) => s + a.nominal, 0), 0),
  total_biaya_pt: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.kategori === 'biaya_pt').reduce((s, a) => s + a.nominal, 0), 0),
  total_lainnya: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.kategori === 'lainnya').reduce((s, a) => s + a.nominal, 0), 0),
  
  // Status
  total_terbayar: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.status === 'terbayar').reduce((s, a) => s + a.nominal, 0), 0),
  total_belum_terbayar: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.status === 'belum_terbayar').reduce((s, a) => s + a.nominal, 0), 0),
  total_dalam_proses: semuaPeriode.reduce((sum, p) => 
    sum + p.alokasi.filter(a => a.status === 'dalam_proses').reduce((s, a) => s + a.nominal, 0), 0),
};

// ============ KONFLIK & TEMUAN ============
export const temuanAudit = [
  {
    id: 'TEMUAN-001',
    severity: 'HIGH',
    judul: 'Total Dana Masuk Berbeda',
    deskripsi: 'Pengguna menyebut Rp416.500.000, tapi perhitungan rincian = Rp411.500.000. Selisih Rp5.000.000 perlu klarifikasi.',
    angka_pengguna: 416500000,
    angka_hitung: 411500000,
    selisih: 5000000
  },
  {
    id: 'TEMUAN-002',
    severity: 'HIGH',
    judul: 'Periode 0 Over-Allocation',
    deskripsi: 'Dana sebelum 28 Sep = Rp204jt, tapi alokasi = Rp223.7jt. Over Rp19.7jt. Kemungkinan Enapsiah Rp70jt belum benar-benar dibayar.',
    angka_dana: 204000000,
    angka_alokasi: 223700000,
    selisih: -19700000
  },
  {
    id: 'TEMUAN-003',
    severity: 'MEDIUM',
    judul: 'Biaya PT Belum Terbayar',
    deskripsi: 'Biaya PT Rp8.500.000 di Periode 1 berstatus "belum_terbayar". Perlu konfirmasi apakah sudah dibayar dari dana lain.',
    nominal: 8500000
  },
  {
    id: 'TEMUAN-004',
    severity: 'MEDIUM',
    judul: 'Beko Item 14x39x2 Belum Dibayar',
    deskripsi: 'Beko item dengan dimensi 14x39x2 (volume 819m3 x 25rb = Rp20.475.000) belum terbayar. Status: pending.',
    nominal: 20475000
  },
  {
    id: 'TEMUAN-005',
    severity: 'MEDIUM',
    judul: 'Enapsiah Status Tidak Jelas',
    deskripsi: 'Enapsiah Rp70jt masuk dalam alokasi Periode 0 tapi status "dalam_proses". Apakah sudah dibayar atau belum?',
    nominal: 70000000
  }
];
