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

export const getTanahSisa = (t: Tanah): number => Math.max(0, getTanahNilaiTotal(t) - Math.max(0, t.dp));
export const getTanahKelebihanBayar = (t: Tanah): number => Math.max(0, Math.max(0, t.dp) - getTanahNilaiTotal(t));

// Handle edge case: BK-01 mobilisasi tanpa dimensi tapi ada nilai tetap
export const getBekoVolume = (b: Beko): number => {
  if (b.satuan_volume === 'ls' || b.satuan_volume === 'unit') return 1;
  if (b.panjang === 0 && b.lebar === 0 && b.tinggi === 0) return 1;
  return Math.max(0, b.panjang) * Math.max(0, b.lebar) * Math.max(0, b.tinggi);
};

// Tidak ada nilai rupiah yang disisipkan berdasarkan ID/catatan.
// Untuk pekerjaan volume: P × L × T × tarif. Untuk LS/unit: 1 × tarif.
export const getBekoNilai = (b: Beko): number => {
  const dimensionsAreEmpty = b.panjang === 0 && b.lebar === 0 && b.tinggi === 0;
  if (b.satuan_volume === 'ls' || b.satuan_volume === 'unit' || dimensionsAreEmpty) {
    return Math.max(0, Number(b.tarif) || 0);
  }
  return getBekoVolume(b) * Math.max(0, Number(b.tarif) || 0);
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
