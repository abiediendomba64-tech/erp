import { Tanah, Beko, PosKewajiban, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas } from './types';

// ============ COMPUTED VALUES ============
// Semua perhitungan dilakukan di sini — TIDAK disimpan di database — ANTI DRIFT

export const getTanahNilaiTotal = (t: Tanah): number => t.luas_bt * t.harga_per_bt;
export const getTanahSisa = (t: Tanah): number => (t.luas_bt * t.harga_per_bt) - t.dp;

export const getBekoNilai = (b: Beko): number => b.panjang * b.lebar * b.tinggi * b.tarif;

export const getPosKewajibanSelisih = (p: PosKewajiban): number => p.nilai_menurut_workbook - p.nilai_menurut_dokumen;

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
