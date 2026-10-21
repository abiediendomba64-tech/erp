import { JurnalUmum, JurnalEntry, Akun, BukuBesar, LabaRugi, Neraca, ArusKas } from '../types/accounting';

// ============ AUTO-GENERATE JURNAL DARI TRANSAKSI ============

/**
 * Generate jurnal untuk penjualan tunai
 */
export function generateJurnalPenjualanTunai(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalKredit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: totalKredit,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '4-1001',
        akun_nama: 'Pendapatan Penjualan',
        debit: 0,
        kredit: jumlah,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-3`,
        akun_kode: '2-1003',
        akun_nama: 'Utang Pajak',
        debit: 0,
        kredit: ppn,
      }] : [])
    ],
    total_debit: totalKredit,
    total_kredit: totalKredit,
  };
}

/**
 * Generate jurnal untuk penjualan kredit (piutang)
 */
export function generateJurnalPenjualanKredit(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalKredit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1003',
        akun_nama: 'Piutang Usaha',
        debit: totalKredit,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '4-1001',
        akun_nama: 'Pendapatan Penjualan',
        debit: 0,
        kredit: jumlah,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-3`,
        akun_kode: '2-1003',
        akun_nama: 'Utang Pajak',
        debit: 0,
        kredit: ppn,
      }] : [])
    ],
    total_debit: totalKredit,
    total_kredit: totalKredit,
  };
}

/**
 * Generate jurnal untuk pembelian tunai
 */
export function generateJurnalPembelianTunai(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalDebit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '5-1001',
        akun_nama: 'Harga Pokok Penjualan',
        debit: jumlah,
        kredit: 0,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1005',
        akun_nama: 'Biaya Dibayar Dimuka',
        debit: ppn,
        kredit: 0,
      }] : []),
      {
        id: `E-${Date.now()}-3`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: 0,
        kredit: totalDebit,
      },
    ],
    total_debit: totalDebit,
    total_kredit: totalDebit,
  };
}

/**
 * Generate jurnal untuk pembelian kredit (utang)
 */
export function generateJurnalPembelianKredit(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalKredit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '5-1001',
        akun_nama: 'Harga Pokok Penjualan',
        debit: jumlah,
        kredit: 0,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1005',
        akun_nama: 'Biaya Dibayar Dimuka',
        debit: ppn,
        kredit: 0,
      }] : []),
      {
        id: `E-${Date.now()}-3`,
        akun_kode: '2-1001',
        akun_nama: 'Utang Usaha',
        debit: 0,
        kredit: totalKredit,
      },
    ],
    total_debit: totalKredit,
    total_kredit: totalKredit,
  };
}

/**
 * Generate jurnal untuk pembayaran piutang
 */
export function generateJurnalPembayaranPiutang(
  tanggal: string,
  keterangan: string,
  jumlah: number
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: jumlah,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1003',
        akun_nama: 'Piutang Usaha',
        debit: 0,
        kredit: jumlah,
      },
    ],
    total_debit: jumlah,
    total_kredit: jumlah,
  };
}

/**
 * Generate jurnal untuk pembayaran utang
 */
export function generateJurnalPembayaranUtang(
  tanggal: string,
  keterangan: string,
  jumlah: number
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '2-1001',
        akun_nama: 'Utang Usaha',
        debit: jumlah,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: 0,
        kredit: jumlah,
      },
    ],
    total_debit: jumlah,
    total_kredit: jumlah,
  };
}

/**
 * Generate jurnal untuk beban operasional
 */
export function generateJurnalBeban(
  tanggal: string,
  keterangan: string,
  akunBeban: string,
  namaAkunBeban: string,
  jumlah: number
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: akunBeban,
        akun_nama: namaAkunBeban,
        debit: jumlah,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: 0,
        kredit: jumlah,
      },
    ],
    total_debit: jumlah,
    total_kredit: jumlah,
  };
}

// ============ GENERATE BUKU BESAR ============

export function generateBukuBesar(akun: Akun, journals: JurnalUmum[]): BukuBesar {
  const entries = journals
    .filter(j => j.status === 'Posted')
    .flatMap(j => 
      j.entries
        .filter(e => e.akun_kode === akun.kode)
        .map(e => ({
          tanggal: j.tanggal,
          no_jurnal: j.no_jurnal,
          keterangan: j.keterangan,
          debit: e.debit,
          kredit: e.kredit,
          saldo: 0, // Akan dihitung di bawah
        }))
    )
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  // Hitung saldo berjalan
  let saldo = akun.saldo;
  entries.forEach(entry => {
    if (akun.saldo_normal === 'Debit') {
      saldo = saldo + entry.debit - entry.kredit;
    } else {
      saldo = saldo - entry.debit + entry.kredit;
    }
    entry.saldo = saldo;
  });

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalKredit = entries.reduce((sum, e) => sum + e.kredit, 0);

  return {
    akun_kode: akun.kode,
    akun_nama: akun.nama,
    entries,
    saldo_awal: akun.saldo,
    total_debit: totalDebit,
    total_kredit: totalKredit,
    saldo_akhir: saldo,
  };
}

// ============ GENERATE LAPORAN KEUANGAN ============

/**
 * Generate Laporan Laba Rugi
 */
export function generateLabaRugi(
  akunList: Akun[],
  journals: JurnalUmum[],
  periode: string
): LabaRugi {
  // Hitung saldo setiap akun dari jurnal
  const saldoAkun = new Map<string, number>();
  
  journals
    .filter(j => j.status === 'Posted')
    .forEach(j => {
      j.entries.forEach(e => {
        const current = saldoAkun.get(e.akun_kode) || 0;
        const akun = akunList.find(a => a.kode === e.akun_kode);
        if (akun) {
          if (akun.saldo_normal === 'Debit') {
            saldoAkun.set(e.akun_kode, current + e.debit - e.kredit);
          } else {
            saldoAkun.set(e.akun_kode, current - e.debit + e.kredit);
          }
        }
      });
    });

  // Pendapatan
  const pendapatan = akunList
    .filter(a => a.tipe === 'Pendapatan')
    .map(a => ({
      akun: a.nama,
      jumlah: saldoAkun.get(a.kode) || 0,
    }))
    .filter(p => p.jumlah !== 0);

  const totalPendapatan = pendapatan.reduce((sum, p) => sum + p.jumlah, 0);

  // Beban
  const beban = akunList
    .filter(a => a.tipe === 'Beban')
    .map(a => ({
      akun: a.nama,
      jumlah: saldoAkun.get(a.kode) || 0,
    }))
    .filter(b => b.jumlah !== 0);

  const totalBeban = beban.reduce((sum, b) => sum + b.jumlah, 0);

  return {
    periode,
    pendapatan,
    total_pendapatan: totalPendapatan,
    beban,
    total_beban: totalBeban,
    laba_bersih: totalPendapatan - totalBeban,
  };
}

/**
 * Generate Neraca (Balance Sheet)
 */
export function generateNeraca(
  akunList: Akun[],
  journals: JurnalUmum[],
  tanggal: string
): Neraca {
  // Hitung saldo setiap akun dari jurnal
  const saldoAkun = new Map<string, number>();
  
  // Mulai dengan saldo awal
  akunList.forEach(a => {
    saldoAkun.set(a.kode, a.saldo);
  });
  
  // Tambahkan dari jurnal
  journals
    .filter(j => j.status === 'Posted')
    .forEach(j => {
      j.entries.forEach(e => {
        const current = saldoAkun.get(e.akun_kode) || 0;
        const akun = akunList.find(a => a.kode === e.akun_kode);
        if (akun) {
          if (akun.saldo_normal === 'Debit') {
            saldoAkun.set(e.akun_kode, current + e.debit - e.kredit);
          } else {
            saldoAkun.set(e.akun_kode, current - e.debit + e.kredit);
          }
        }
      });
    });

  // Aset Lancar
  const asetLancar = akunList
    .filter(a => a.tipe === 'Aset' && a.kategori === 'Aset Lancar')
    .map(a => ({
      akun: a.nama,
      jumlah: saldoAkun.get(a.kode) || 0,
    }))
    .filter(a => a.jumlah !== 0);

  // Aset Tetap
  const asetTetap = akunList
    .filter(a => a.tipe === 'Aset' && a.kategori === 'Aset Tetap')
    .map(a => ({
      akun: a.nama,
      jumlah: saldoAkun.get(a.kode) || 0,
    }))
    .filter(a => a.jumlah !== 0);

  const totalAsetLancar = asetLancar.reduce((sum, a) => sum + a.jumlah, 0);
  const totalAsetTetap = asetTetap.reduce((sum, a) => sum + a.jumlah, 0);
  const totalAset = totalAsetLancar + totalAsetTetap;

  // Kewajiban Jangka Pendek
  const kewajibanJP = akunList
    .filter(a => a.tipe === 'Kewajiban' && a.kategori === 'Kewajiban Jangka Pendek')
    .map(a => ({
      akun: a.nama,
      jumlah: saldoAkun.get(a.kode) || 0,
    }))
    .filter(k => k.jumlah !== 0);

  // Kewajiban Jangka Panjang
  const kewajibanJPanjang = akunList
    .filter(a => a.tipe === 'Kewajiban' && a.kategori === 'Kewajiban Jangka Panjang')
    .map(a => ({
      akun: a.nama,
      jumlah: saldoAkun.get(a.kode) || 0,
    }))
    .filter(k => k.jumlah !== 0);

  const totalKewajibanJP = kewajibanJP.reduce((sum, k) => sum + k.jumlah, 0);
  const totalKewajibanJPanjang = kewajibanJPanjang.reduce((sum, k) => sum + k.jumlah, 0);
  const totalKewajiban = totalKewajibanJP + totalKewajibanJPanjang;

  // Ekuitas
  const ekuitas = akunList
    .filter(a => a.tipe === 'Ekuitas')
    .map(a => ({
      akun: a.nama,
      jumlah: saldoAkun.get(a.kode) || 0,
    }))
    .filter(e => e.jumlah !== 0);

  // Tambahkan laba bersih ke laba ditahan
  const labaRugi = generateLabaRugi(akunList, journals, tanggal);
  const labaDitahanIndex = ekuitas.findIndex(e => e.akun === 'Laba Ditahan');
  if (labaDitahanIndex >= 0) {
    ekuitas[labaDitahanIndex].jumlah += labaRugi.laba_bersih;
  } else {
    ekuitas.push({ akun: 'Laba Bersih Periode Berjalan', jumlah: labaRugi.laba_bersih });
  }

  const totalEkuitas = ekuitas.reduce((sum, e) => sum + e.jumlah, 0);

  return {
    tanggal,
    aset: {
      aset_lancar: asetLancar,
      aset_tetap: asetTetap,
      total_aset_lancar: totalAsetLancar,
      total_aset_tetap: totalAsetTetap,
      total_aset: totalAset,
    },
    kewajiban: {
      kewajiban_jangka_pendek: kewajibanJP,
      kewajiban_jangka_panjang: kewajibanJPanjang,
      total_kewajiban_jangka_pendek: totalKewajibanJP,
      total_kewajiban_jangka_panjang: totalKewajibanJPanjang,
      total_kewajiban: totalKewajiban,
    },
    ekuitas,
    total_ekuitas: totalEkuitas,
    total_kewajiban_ekuitas: totalKewajiban + totalEkuitas,
  };
}

/**
 * Generate Laporan Arus Kas (simplified - direct method)
 */
export function generateArusKas(
  akunList: Akun[],
  journals: JurnalUmum[],
  periode: string,
  kasAwalPeriode: number = 0
): ArusKas {
  // Arus Kas Operasi
  const arusKasOperasi: { keterangan: string; jumlah: number }[] = [];
  
  // Penerimaan dari pelanggan
  const penerimaanPelanggan = journals
    .filter(j => j.status === 'Posted')
    .filter(j => j.entries.some(e => e.akun_kode === '1-1003' && e.kredit > 0))
    .reduce((sum, j) => {
      const kasEntry = j.entries.find(e => e.akun_kode === '1-1001' && e.debit > 0);
      return sum + (kasEntry?.debit || 0);
    }, 0);
  
  if (penerimaanPelanggan > 0) {
    arusKasOperasi.push({ keterangan: 'Penerimaan dari Pelanggan', jumlah: penerimaanPelanggan });
  }

  // Pembayaran ke supplier
  const pembayaranSupplier = journals
    .filter(j => j.status === 'Posted')
    .filter(j => j.entries.some(e => e.akun_kode === '2-1001' && e.debit > 0))
    .reduce((sum, j) => {
      const kasEntry = j.entries.find(e => e.akun_kode === '1-1001' && e.kredit > 0);
      return sum + (kasEntry?.kredit || 0);
    }, 0);
  
  if (pembayaranSupplier > 0) {
    arusKasOperasi.push({ keterangan: 'Pembayaran ke Supplier', jumlah: -pembayaranSupplier });
  }

  // Pembayaran beban operasional
  const bebanOperasional = journals
    .filter(j => j.status === 'Posted')
    .filter(j => j.entries.some(e => e.akun_kode.startsWith('5-2') && e.debit > 0))
    .reduce((sum, j) => {
      const kasEntry = j.entries.find(e => e.akun_kode === '1-1001' && e.kredit > 0);
      return sum + (kasEntry?.kredit || 0);
    }, 0);
  
  if (bebanOperasional > 0) {
    arusKasOperasi.push({ keterangan: 'Pembayaran Beban Operasional', jumlah: -bebanOperasional });
  }

  const totalArusKasOperasi = arusKasOperasi.reduce((sum, a) => sum + a.jumlah, 0);

  // Arus Kas Investasi
  const arusKasInvestasi: { keterangan: string; jumlah: number }[] = [];
  
  const pembelianAsetTetap = journals
    .filter(j => j.status === 'Posted')
    .filter(j => j.entries.some(e => e.akun_kode.startsWith('1-2') && e.debit > 0))
    .reduce((sum, j) => {
      const kasEntry = j.entries.find(e => e.akun_kode === '1-1001' && e.kredit > 0);
      return sum + (kasEntry?.kredit || 0);
    }, 0);
  
  if (pembelianAsetTetap > 0) {
    arusKasInvestasi.push({ keterangan: 'Pembelian Aset Tetap', jumlah: -pembelianAsetTetap });
  }

  const totalArusKasInvestasi = arusKasInvestasi.reduce((sum, a) => sum + a.jumlah, 0);

  // Arus Kas Pendanaan
  const arusKasPendanaan: { keterangan: string; jumlah: number }[] = [];
  
  const setoranModal = journals
    .filter(j => j.status === 'Posted')
    .filter(j => j.entries.some(e => e.akun_kode === '3-1001' && e.kredit > 0))
    .reduce((sum, j) => {
      const kasEntry = j.entries.find(e => e.akun_kode === '1-1001' && e.debit > 0);
      return sum + (kasEntry?.debit || 0);
    }, 0);
  
  if (setoranModal > 0) {
    arusKasPendanaan.push({ keterangan: 'Setoran Modal', jumlah: setoranModal });
  }

  const totalArusKasPendanaan = arusKasPendanaan.reduce((sum, a) => sum + a.jumlah, 0);

  const kenaikanPenurunanKas = totalArusKasOperasi + totalArusKasInvestasi + totalArusKasPendanaan;

  return {
    periode,
    arus_kas_operasi: arusKasOperasi,
    total_arus_kas_operasi: totalArusKasOperasi,
    arus_kas_investasi: arusKasInvestasi,
    total_arus_kas_investasi: totalArusKasInvestasi,
    arus_kas_pendanaan: arusKasPendanaan,
    total_arus_kas_pendanaan: totalArusKasPendanaan,
    kenaikan_penurunan_kas: kenaikanPenurunanKas,
    kas_awal_periode: kasAwalPeriode,
    kas_akhir_periode: kasAwalPeriode + kenaikanPenurunanKas,
  };
}
