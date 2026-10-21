import { Tanah, Beko, PosKewajiban, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas } from './types';

// ============ COMPUTED VALUES ============
// Semua perhitungan dilakukan di sini — TIDAK disimpan di database — ANTI DRIFT

// Nilai kontrak tidak boleh disimpulkan otomatis dari jumlah yang sudah dibayar.
// Untuk bidang tanpa luas/harga, simpan nilai kesepakatan pada nilai_total_manual.
export const getTanahNilaiTotal = (t: Tanah): number => {
  if (Number.isFinite(t.nilai_total_manual) && Number(t.nilai_total_manual) > 0) {
    return Number(t.nilai_total_manual);
  }
  return Math.max(0, Number(t.luas_bt) || 0) * Math.max(0, Number(t.harga_per_bt) || 0);
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

export const hasDocumentEvidence = (document: { link_drive?: string; local_file_key?: string }): boolean =>
  Boolean(document.local_file_key || (document.link_drive && /^https?:\/\//i.test(document.link_drive)));

export const getRelatedDocuments = <T extends { modul_terkait?: string; id_terkait?: string; kode_bukti?: string }>(
  documents: T[],
  module: string,
  recordId: string,
  proofCode?: string
): T[] => documents.filter(document =>
  (document.modul_terkait === module && document.id_terkait === recordId) ||
  (Boolean(proofCode) && document.kode_bukti === proofCode)
);

export const hasVerifiedRelatedDocument = <T extends { terverifikasi?: string; link_drive?: string; local_file_key?: string; modul_terkait?: string; id_terkait?: string; kode_bukti?: string }>(
  documents: T[],
  module: string,
  recordId: string,
  proofCode?: string
): boolean => getRelatedDocuments(documents, module, recordId, proofCode).some(document =>
  document.terverifikasi === 'Ya' && hasDocumentEvidence(document)
);

export const getBukuKasVerificationStatus = <T extends { terverifikasi?: string; link_drive?: string; local_file_key?: string; modul_terkait?: string; id_terkait?: string; kode_bukti?: string }>(
  record: { id: string; kode_bukti: string },
  documents: T[]
): 'LENGKAP' | 'TANPA_BUKTI' | 'PERLU_KONFIRMASI' => {
  const linked = getRelatedDocuments(documents, 'Buku Kas', record.id, record.kode_bukti);
  if (linked.some(document => document.terverifikasi === 'Ya' && hasDocumentEvidence(document))) return 'LENGKAP';
  if (linked.length > 0 || record.kode_bukti.trim()) return 'PERLU_KONFIRMASI';
  return 'TANPA_BUKTI';
};

export const getArusKasSaldo = (allKas: ArusKas[], upToIndex: number): number => {
  let saldo = 0;
  for (let i = 0; i <= upToIndex; i++) {
    saldo += allKas[i].masuk - allKas[i].keluar;
  }
  return saldo;
};
