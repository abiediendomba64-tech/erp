/**
 * Transaction Guard - Mencegah duplikasi transaksi bisnis
 * 
 * Masalah: SHA-256 file hanya cegah upload file identik,
 * tapi tidak cegah transaksi ekonomi yang sama dengan foto berbeda
 * 
 * Solusi: Idempotency key berdasarkan business key
 */

export interface TransactionKey {
  tanggal: string;        // YYYY-MM-DD
  jenis: string;          // 'tanah' | 'beko' | 'biaya_lain' | 'kas_masuk' | 'kas_keluar'
  pihak: string;          // Nama penjual/pembeli/supplier
  nominal: number;        // Nominal transaksi (sudah dibulatkan)
  referensi?: string;     // Nomor kwitansi/invoice/PO (optional)
}

/**
 * Generate idempotency key dari business key
 * Key ini unik untuk setiap transaksi ekonomi
 */
export function generateIdempotencyKey(tx: TransactionKey): string {
  // Normalize data
  const tanggal = tx.tanggal.trim();
  const jenis = tx.jenis.toLowerCase().trim();
  const pihak = tx.pihak.toLowerCase().trim().replace(/\s+/g, ' ');
  const nominal = Math.round(tx.nominal); // Bulatkan untuk hindari floating point
  const referensi = tx.referensi?.trim() || '';
  
  // Format: JENIS|TANGGAL|PIHAK|NOMINAL|REFERENSI
  const raw = `${jenis}|${tanggal}|${pihak}|${nominal}|${referensi}`;
  
  // Hash dengan simple algorithm (bukan crypto, tapi cukup untuk idempotency)
  return simpleHash(raw);
}

/**
 * Simple hash function (non-crypto)
 * Cukup untuk idempotency, bukan untuk security
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Cek apakah transaksi duplikat
 * 
 * @param newTx - Transaksi baru yang akan disimpan
 * @param existingTxs - Array transaksi yang sudah ada
 * @returns Object dengan status dan detail
 */
export function checkDuplicate(
  newTx: TransactionKey,
  existingTxs: TransactionKey[]
): { isDuplicate: boolean; duplicateWith?: TransactionKey; key: string } {
  const newKey = generateIdempotencyKey(newTx);
  
  for (const existing of existingTxs) {
    const existingKey = generateIdempotencyKey(existing);
    if (newKey === existingKey) {
      return {
        isDuplicate: true,
        duplicateWith: existing,
        key: newKey
      };
    }
  }
  
  return {
    isDuplicate: false,
    key: newKey
  };
}

/**
 * Validasi transaksi sebelum disimpan
 * 
 * @param tx - Transaksi yang akan divalidasi
 * @param existingTxs - Array transaksi yang sudah ada
 * @returns Object dengan status validasi
 */
export function validateTransaction(
  tx: TransactionKey,
  existingTxs: TransactionKey[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  idempotencyKey: string;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validasi field required
  if (!tx.tanggal) errors.push('Tanggal wajib diisi');
  if (!tx.jenis) errors.push('Jenis transaksi wajib diisi');
  if (!tx.pihak) errors.push('Pihak wajib diisi');
  if (tx.nominal === undefined || tx.nominal === null) {
    errors.push('Nominal wajib diisi');
  } else if (tx.nominal <= 0) {
    errors.push('Nominal harus lebih dari 0');
  }
  
  // Validasi format tanggal
  if (tx.tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tx.tanggal)) {
    errors.push('Format tanggal harus YYYY-MM-DD');
  }
  
  // Cek duplikasi
  const duplicateCheck = checkDuplicate(tx, existingTxs);
  if (duplicateCheck.isDuplicate) {
    errors.push(
      `Transaksi duplikat terdeteksi! Sudah ada transaksi dengan ` +
      `tanggal ${duplicateCheck.duplicateWith?.tanggal}, ` +
      `pihak ${duplicateCheck.duplicateWith?.pihak}, ` +
      `nominal ${duplicateCheck.duplicateWith?.nominal}`
    );
  }
  
  // Warning untuk nominal besar
  if (tx.nominal > 100000000) { // > 100 juta
    warnings.push('Transaksi nominal besar (>100jt) - pastikan sudah diverifikasi');
  }
  
  // Warning untuk tanggal masa depan
  if (tx.tanggal) {
    const txDate = new Date(tx.tanggal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (txDate > today) {
      warnings.push('Tanggal transaksi di masa depan - pastikan bukan typo');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    idempotencyKey: duplicateCheck.key
  };
}

/**
 * Contoh penggunaan:
 * 
 * const newTx: TransactionKey = {
 *   tanggal: '2026-10-13',
 *   jenis: 'tanah',
 *   pihak: 'Pak Dede',
 *   nominal: 51000000,
 *   referensi: 'KW-001'
 * };
 * 
 * const existingTxs: TransactionKey[] = [
 *   // ... transaksi yang sudah ada
 * ];
 * 
 * const validation = validateTransaction(newTx, existingTxs);
 * 
 * if (!validation.isValid) {
 *   console.error('Validasi gagal:', validation.errors);
 *   return;
 * }
 * 
 * if (validation.warnings.length > 0) {
 *   console.warn('Peringatan:', validation.warnings);
 *   // Tampilkan warning ke user, tapi izinkan lanjut
 * }
 * 
 * // Simpan transaksi dengan idempotency key
 * saveTransaction({
 *   ...newTx,
 *   idempotencyKey: validation.idempotencyKey
 * });
 */
