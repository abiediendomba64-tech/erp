import { Tanah, Beko, PosKewajiban, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas } from './types';

// ============ COMPUTED VALUES ============
// Semua perhitungan dilakukan di sini — TIDAK disimpan di database — ANTI DRIFT

// Handle edge case: tanah tanpa luas tapi ada nominal langsung (T-10, T-12)
export const getTanahNilaiTotal = (t: Tanah): number => {
  // Jika luas_bt = 0 tapi dp > 0, gunakan dp sebagai nilai total (kasus nominal langsung)
  if (t.luas_bt === 0 && t.dp > 0) {
    return t.dp;
  }
  return t.luas_bt * t.harga_per_bt;
};

export const getTanahSisa = (t: Tanah): number => {
  const nilaiTotal = getTanahNilaiTotal(t);
  return nilaiTotal - t.dp;
};

// Handle edge case: BK-01 mobilisasi tanpa dimensi tapi ada nilai tetap
export const getBekoNilai = (b: Beko): number => {
  // Jika semua dimensi 0 tapi ada catatan "mobilisasi", gunakan nilai tetap
  if (b.panjang === 0 && b.lebar === 0 && b.tinggi === 0 && b.tarif === 0) {
    // Cek berdasarkan ID atau catatan untuk mobilisasi
    if (b.id === 'BK-01' || b.catatan.toLowerCase().includes('mobilisasi')) {
      return 4500000; // Nilai tetap mobilisasi
    }
    return 0;
  }
  return b.panjang * b.lebar * b.tinggi * b.tarif;
};

// Hitung sisa utang yang belum dibayar
export const getPosKewajibanSisaUtang = (p: PosKewajiban): number => {
  return p.nilai_menurut_dokumen - p.dp_dibayar;
};

// Hitung selisih rekonsiliasi antara dokumen dan workbook
export const getPosKewajibanSelisihRekonsiliasi = (p: PosKewajiban): number => {
  return p.nilai_menurut_workbook - p.nilai_menurut_dokumen;
};

// Backward compatibility - alias untuk sisa utang
export const getPosKewajibanSelisih = (p: PosKewajiban): number => {
  return getPosKewajibanSisaUtang(p);
};

export const getStokAkhir = (s: StokBarang): number => s.stok_awal + s.masuk - s.keluar;
export const getStokNilaiInventori = (s: StokBarang): number => (s.stok_awal + s.masuk - s.keluar) * s.harga_pokok;

export const getProduksiTotalBiaya = (p: Produksi): number => p.biaya_tenaga_kerja + p.biaya_overhead;

export const getPenjualanTotal = (p: Penjualan): number => p.items.reduce((sum, item) => sum + item.subtotal, 0);
export const getPenjualanGrandTotal = (p: Penjualan): number => getPenjualanTotal(p) - p.diskon + p.ppn;

export const getPembelianTotal = (p: Pembelian): number => p.items.reduce((sum, item) => sum + item.subtotal, 0);
export const getPembelianGrandTotal = (p: Pembelian): number => getPembelianTotal(p) + p.ppn;

export const getPenggajianGajiBersih = (g: Penggajian): number => g.gaji_pokok + g.tunjangan + g.lembur - g.potongan - g.pph21;

export const getAnggaranSisa = (a: Anggaran): number => a.anggaran - a.realisasi;
export const getAnggaranPersentase = (a: Anggaran): number => a.anggaran > 0 ? (a.realisasi / a.anggaran) * 100 : 0;

export const getArusKasSaldo = (allKas: ArusKas[], upToIndex: number): number => {
  let saldo = 0;
  for (let i = 0; i <= upToIndex; i++) {
    saldo += allKas[i].masuk - allKas[i].keluar;
  }
  return saldo;
};
