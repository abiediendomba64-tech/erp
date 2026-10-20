import { Tanah, Beko, PosKewajiban, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas } from './types';

// ============ COMPUTED VALUES (ANTI-DRIFT) ============
// Semua perhitungan dilakukan di sini, TIDAK disimpan di database

export const computeTanah = (t: Tanah) => ({
  nilai_total: t.luas_bt * t.harga_per_bt,
  sisa: (t.luas_bt * t.harga_per_bt) - t.dp,
});

export const computeBeko = (b: Beko) => ({
  nilai: b.panjang * b.lebar * b.tinggi * b.tarif,
});

export const computePosKewajiban = (p: PosKewajiban) => ({
  selisih: p.nilai_menurut_workbook - p.nilai_menurut_dokumen,
});

export const computeStok = (s: StokBarang) => ({
  stok_akhir: s.stok_awal + s.masuk - s.keluar,
  nilai_inventori: (s.stok_awal + s.masuk - s.keluar) * s.harga_pokok,
});

export const computeProduksi = (p: Produksi) => ({
  total_biaya: p.biaya_tenaga_kerja + p.biaya_overhead,
  hpp_per_unit: (p.biaya_tenaga_kerja + p.biaya_overhead) / (p.jumlah || 1),
});

export const computePenjualan = (p: Penjualan) => ({
  subtotal_items: p.items.reduce((sum, item) => sum + item.subtotal, 0),
  grand_total: p.items.reduce((sum, item) => sum + item.subtotal, 0) - p.diskon + p.ppn,
});

export const computePembelian = (p: Pembelian) => ({
  subtotal_items: p.items.reduce((sum, item) => sum + item.subtotal, 0),
  grand_total: p.items.reduce((sum, item) => sum + item.subtotal, 0) + p.ppn,
});

export const computePenggajian = (g: Penggajian) => ({
  gaji_bersih: g.gaji_pokok + g.tunjangan + g.lembur - g.potongan - g.pph21,
});

export const computeAnggaran = (a: Anggaran) => ({
  sisa: a.anggaran - a.realisasi,
  persentase: a.anggaran > 0 ? (a.realisasi / a.anggaran) * 100 : 0,
});

export const computeArusKas = (allKas: ArusKas[], currentIndex: number) => {
  let saldo = 0;
  for (let i = 0; i <= currentIndex; i++) {
    saldo += allKas[i].masuk - allKas[i].keluar;
  }
  return { saldo };
};

// ============ VALIDATION ============
export const validateRupiah = (value: number): boolean => {
  return !isNaN(value) && isFinite(value) && value >= 0;
};

export const validateRequired = (value: string | number): boolean => {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
};
