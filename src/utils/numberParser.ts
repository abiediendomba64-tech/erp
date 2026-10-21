/**
 * Parser angka khusus untuk format Indonesia
 * Membedakan nominal rupiah (titik = ribuan) dari desimal (koma = desimal)
 */

/**
 * Parse nominal rupiah dari string
 * Contoh:
 * - "Rp 1.234.567" → 1234567
 * - "750.000" → 750000
 * - "1.234.567,50" → 1234567.50
 * - "1,5" → 1.5 (desimal dengan koma)
 */
export function parseRupiah(value: string): number {
  if (!value || typeof value !== 'string') return 0;
  
  // Hapus prefix "Rp" dan spasi
  let cleaned = value.replace(/Rp\s?/gi, '').trim();
  
  // Cek apakah ada koma (desimal Indonesia)
  const hasComma = cleaned.includes(',');
  
  if (hasComma) {
    // Format: 1.234.567,50 atau 1,5
    // Hapus titik ribuan
    cleaned = cleaned.replace(/\./g, '');
    // Ganti koma dengan titik untuk parse
    cleaned = cleaned.replace(',', '.');
  } else {
    // Format: 1.234.567 atau 750.000
    // Hapus titik ribuan
    cleaned = cleaned.replace(/\./g, '');
  }
  
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

/**
 * Parse angka desimal (untuk luas, volume, dll)
 * Contoh:
 * - "2.5" → 2.5
 * - "2,5" → 2.5
 * - "100" → 100
 */
export function parseDecimal(value: string): number {
  if (!value || typeof value !== 'string') return 0;
  
  // Ganti koma dengan titik
  const cleaned = value.replace(',', '.');
  const result = parseFloat(cleaned);
  
  return isNaN(result) ? 0 : result;
}

/**
 * Format angka ke format rupiah Indonesia
 * Contoh: 1234567 → "Rp 1.234.567"
 */
export function formatRupiah(value: number): string {
  if (isNaN(value) || !isFinite(value)) return 'Rp 0';
  
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

/**
 * Format angka desimal
 * Contoh: 2.5 → "2,5"
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Validasi apakah string adalah nominal rupiah yang valid
 */
export function isValidRupiah(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // Pattern: optional "Rp", optional spasi, angka dengan titik ribuan, optional koma desimal
  const pattern = /^(Rp\s?)?(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/;
  return pattern.test(value.trim());
}

/**
 * Validasi apakah string adalah angka desimal yang valid
 */
export function isValidDecimal(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const cleaned = value.replace(',', '.');
  const num = parseFloat(cleaned);
  return !isNaN(num) && isFinite(num);
}
