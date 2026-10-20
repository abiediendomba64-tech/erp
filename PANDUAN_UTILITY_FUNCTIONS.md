# 📚 Panduan Penggunaan Utility Functions

Dokumentasi lengkap untuk utility functions yang sudah dibuat untuk memperbaiki bug kritis dan menambah fitur penting.

---

## 📋 Daftar Isi

1. [Parser Angka Indonesia](#1-parser-angka-indonesia)
2. [Transaction Guard](#2-transaction-guard)
3. [Conflict Resolver](#3-conflict-resolver)
4. [Export & Backup](#4-export--backup)

---

## 1. Parser Angka Indonesia

**File:** `src/utils/numberParser.ts`

### Masalah yang Diperbaiki

Sebelumnya, fungsi `n_()` di Apps Script salah parse angka:
```javascript
n_('750.000') → 750  // ❌ SALAH
n_('800.000') → 800  // ❌ SALAH
```

### Solusi

Parser baru bisa membedakan:
- **Nominal rupiah**: titik = ribuan (`750.000` → `750000`)
- **Desimal**: koma = desimal (`2,5` → `2.5`)

### Fungsi yang Tersedia

#### `parseRupiah(value: string): number`

Parse nominal rupiah dari string.

```typescript
import { parseRupiah } from './utils/numberParser';

parseRupiah('Rp 1.234.567')     // → 1234567
parseRupiah('750.000')           // → 750000
parseRupiah('1.234.567,50')      // → 1234567.50
parseRupiah('1,5')               // → 1.5 (desimal dengan koma)
parseRupiah('')                  // → 0
parseRupiah('invalid')           // → 0
```

#### `parseDecimal(value: string): number`

Parse angka desimal (untuk luas, volume, dll).

```typescript
import { parseDecimal } from './utils/numberParser';

parseDecimal('2.5')    // → 2.5
parseDecimal('2,5')    // → 2.5
parseDecimal('100')    // → 100
parseDecimal('')       // → 0
```

#### `formatRupiah(value: number): string`

Format angka ke format rupiah Indonesia.

```typescript
import { formatRupiah } from './utils/numberParser';

formatRupiah(1234567)      // → "Rp 1.234.567"
formatRupiah(750000)       // → "Rp 750.000"
formatRupiah(1234567.50)   // → "Rp 1.234.568" (dibulatkan)
```

#### `formatDecimal(value: number, decimals?: number): string`

Format angka desimal.

```typescript
import { formatDecimal } from './utils/numberParser';

formatDecimal(2.5)         // → "2,50"
formatDecimal(2.5, 1)      // → "2,5"
formatDecimal(100)         // → "100,00"
```

#### `isValidRupiah(value: string): boolean`

Validasi apakah string adalah nominal rupiah yang valid.

```typescript
import { isValidRupiah } from './utils/numberParser';

isValidRupiah('Rp 1.234.567')    // → true
isValidRupiah('750.000')          // → true
isValidRupiah('1.234.567,50')     // → true
isValidRupiah('invalid')          // → false
isValidRupiah('')                 // → false
```

#### `isValidDecimal(value: string): boolean`

Validasi apakah string adalah angka desimal yang valid.

```typescript
import { isValidDecimal } from './utils/numberParser';

isValidDecimal('2.5')    // → true
isValidDecimal('2,5')    // → true
isValidDecimal('100')    // → true
isValidDecimal('abc')    // → false
```

### Contoh Penggunaan di Form

```typescript
import { parseRupiah, isValidRupiah } from './utils/numberParser';

function handleHargaChange(inputValue: string) {
  // Validasi dulu
  if (!isValidRupiah(inputValue)) {
    setError('Format nominal tidak valid');
    return;
  }
  
  // Parse ke number
  const harga = parseRupiah(inputValue);
  
  // Simpan ke state/database
  setFormData(prev => ({ ...prev, harga }));
}
```

---

## 2. Transaction Guard

**File:** `src/utils/transactionGuard.ts`

### Masalah yang Diperbaiki

Sebelumnya, sistem hanya cek SHA-256 file untuk cegah upload file identik. Tapi tidak cegah **transaksi ekonomi yang sama** dengan foto berbeda.

**Skenario Bahaya:**
1. Operator input: Pak Dede, 13 Okt, Rp51jt (foto A)
2. Operator input lagi: Pak Dede, 13 Okt, Rp51jt (foto B)
3. Sistem terima kedua transaksi → **double count Rp51jt** ❌

### Solusi

Idempotency key berdasarkan **business key**:
- Tanggal
- Jenis transaksi
- Pihak (nama penjual/pembeli)
- Nominal
- Referensi (nomor kwitansi/invoice)

### Fungsi yang Tersedia

#### `generateIdempotencyKey(tx: TransactionKey): string`

Generate unique key untuk transaksi.

```typescript
import { generateIdempotencyKey, TransactionKey } from './utils/transactionGuard';

const tx: TransactionKey = {
  tanggal: '2026-10-13',
  jenis: 'tanah',
  pihak: 'Pak Dede',
  nominal: 51000000,
  referensi: 'KW-001'
};

const key = generateIdempotencyKey(tx);
// → "a1b2c3d4" (hash unique)
```

#### `checkDuplicate(newTx, existingTxs): { isDuplicate, duplicateWith?, key }`

Cek apakah transaksi duplikat.

```typescript
import { checkDuplicate, TransactionKey } from './utils/transactionGuard';

const newTx: TransactionKey = {
  tanggal: '2026-10-13',
  jenis: 'tanah',
  pihak: 'Pak Dede',
  nominal: 51000000
};

const existingTxs: TransactionKey[] = [
  // ... transaksi yang sudah ada
];

const result = checkDuplicate(newTx, existingTxs);

if (result.isDuplicate) {
  console.error('Transaksi duplikat!', result.duplicateWith);
} else {
  console.log('Transaksi unique, key:', result.key);
}
```

#### `validateTransaction(tx, existingTxs): { isValid, errors, warnings, idempotencyKey }`

Validasi transaksi lengkap sebelum disimpan.

```typescript
import { validateTransaction, TransactionKey } from './utils/transactionGuard';

const newTx: TransactionKey = {
  tanggal: '2026-10-13',
  jenis: 'tanah',
  pihak: 'Pak Dede',
  nominal: 51000000
};

const validation = validateTransaction(newTx, existingTxs);

if (!validation.isValid) {
  // Tampilkan error ke user
  console.error('Validasi gagal:', validation.errors);
  // ['Transaksi duplikat terdeteksi! ...']
  return;
}

if (validation.warnings.length > 0) {
  // Tampilkan warning, tapi izinkan lanjut
  console.warn('Peringatan:', validation.warnings);
  // ['Transaksi nominal besar (>100jt) - pastikan sudah diverifikasi']
}

// Simpan transaksi dengan idempotency key
saveTransaction({
  ...newTx,
  idempotencyKey: validation.idempotencyKey
});
```

### Contoh Penggunaan di Form

```typescript
import { validateTransaction, TransactionKey } from './utils/transactionGuard';

async function handleSubmit(formData: any) {
  const tx: TransactionKey = {
    tanggal: formData.tanggal,
    jenis: formData.jenis,
    pihak: formData.pihak,
    nominal: formData.nominal,
    referensi: formData.referensi
  };
  
  const validation = validateTransaction(tx, existingTransactions);
  
  if (!validation.isValid) {
    alert('Validasi gagal:\n' + validation.errors.join('\n'));
    return;
  }
  
  if (validation.warnings.length > 0) {
    const confirm = window.confirm(
      'Peringatan:\n' + validation.warnings.join('\n') + '\n\nLanjutkan?'
    );
    if (!confirm) return;
  }
  
  // Simpan ke database
  await saveTransaction({
    ...formData,
    idempotencyKey: validation.idempotencyKey
  });
  
  alert('Transaksi berhasil disimpan');
}
```

---

## 3. Conflict Resolver

**File:** `src/utils/conflictResolver.ts`

### Masalah yang Diperbaiki

Banyak angka yang berbeda antar sumber:
- Kas riil: Rp35.220.000 vs Rp20.220.000
- Utang tanah: Rp34.700.000 vs Rp37.200.000
- Pembayaran tanah: Rp309.400.000 vs Rp236.900.000

Sebelumnya, user bisa pilih salah satu diam-diam tanpa audit trail.

### Solusi

Conflict resolver:
1. Deteksi konflik otomatis
2. Track semua versi data
3. Workflow resolve dengan audit trail
4. Tidak boleh pilih diam-diam

### Fungsi yang Tersedia

#### `detectConflict(field, description, source1, value1, source2, value2, tolerance?): ConflictRecord | null`

Deteksi konflik otomatis dari dua sumber.

```typescript
import { detectConflict } from './utils/conflictResolver';

const conflict = detectConflict(
  'kas_riil',
  'Kas riil berbeda antara ringkasan PDF dan catatan klarifikasi',
  'PDF_LAMA',
  35220000,
  'KLARIFIKASI',
  20220000
);

if (conflict) {
  console.log('Konflik terdeteksi:', conflict);
  // Simpan ke database konflik
}
```

#### `resolveConflict(conflict, selectedVersionId, resolvedBy, notes?): ConflictRecord`

Resolve konflik dengan memilih salah satu versi.

```typescript
import { resolveConflict, ConflictRecord } from './utils/conflictResolver';

const resolved = resolveConflict(
  conflict,
  'V1-KAS',  // ID versi yang dipilih
  'Admin',   // Siapa yang resolve
  'Dipilih karena lebih baru dan diverifikasi'
);

console.log('Resolved:', resolved);
// Simpan ke database
```

#### `resolveConflictWithCustomValue(conflict, customValue, resolvedBy, notes): ConflictRecord`

Resolve konflik dengan nilai custom (misal: rata-rata).

```typescript
import { resolveConflictWithCustomValue } from './utils/conflictResolver';

const resolved = resolveConflictWithCustomValue(
  conflict,
  27720000,  // Nilai rata-rata
  'Admin',
  'Diambil rata-rata setelah klarifikasi ke lapangan'
);
```

#### `calculateDifference(version1, version2): { absolute, percentage }`

Hitung selisih antara dua versi.

```typescript
import { calculateDifference } from './utils/conflictResolver';

const diff = calculateDifference(35220000, 20220000);
// → { absolute: 15000000, percentage: 42.55 }
```

#### `formatConflictForUI(conflict): string`

Format konflik untuk ditampilkan di UI.

```typescript
import { formatConflictForUI } from './utils/conflictResolver';

const text = formatConflictForUI(conflict);
console.log(text);
// Output:
// ❌ Kas riil berbeda antara ringkasan PDF dan catatan klarifikasi
// 
// Field: kas_riil
// Status: UNRESOLVED
// 
// Versi yang tersedia:
//   1. PDF_LAMA: 35220000
//      Catatan: Dari ringkasan PDF 13 Oktober
//   2. KLARIFIKASI: 20220000
//      Catatan: Dari catatan klarifikasi
```

### Contoh Penggunaan di UI

```typescript
import { detectConflict, resolveConflict, formatConflictForUI } from './utils/conflictResolver';

function ConflictResolverUI({ field, value1, source1, value2, source2 }) {
  const [conflict, setConflict] = useState(null);
  const [resolved, setResolved] = useState(null);
  
  useEffect(() => {
    const detected = detectConflict(field, '...', source1, value1, source2, value2);
    setConflict(detected);
  }, [field, value1, value2]);
  
  const handleResolve = (versionId: string) => {
    const res = resolveConflict(conflict, versionId, 'Admin', 'Dipilih oleh user');
    setResolved(res);
  };
  
  if (!conflict) return <div>Tidak ada konflik</div>;
  
  return (
    <div>
      <h3>Konflik Terdeteksi</h3>
      <pre>{formatConflictForUI(conflict)}</pre>
      
      <div>
        <button onClick={() => handleResolve(conflict.versions[0].id)}>
          Pilih Versi 1
        </button>
        <button onClick={() => handleResolve(conflict.versions[1].id)}>
          Pilih Versi 2
        </button>
      </div>
      
      {resolved && (
        <div>
          <h4>✅ Resolved</h4>
          <p>Nilai: {resolved.resolvedValue}</p>
          <p>Oleh: {resolved.resolvedBy}</p>
          <p>Catatan: {resolved.resolutionNotes}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Export & Backup

**File:** `src/utils/exportBackup.ts`

### Fitur yang Tersedia

1. Export ke CSV
2. Export ke Excel (HTML table)
3. Export ke JSON (backup)
4. Print receipt/kwitansi
5. Generate receipt HTML
6. Number to words (terbilang)

### Fungsi yang Tersedia

#### `exportToCSV(data, filename, columns?)`

Export data ke format CSV.

```typescript
import { exportToCSV } from './utils/exportBackup';

const data = [
  { nama: 'Pak Dede', luas: 68, harga: 750000, total: 51000000 },
  { nama: 'Sanaris', luas: 17, harga: 800000, total: 13600000 }
];

exportToCSV(data, 'register_tanah', ['nama', 'luas', 'harga', 'total']);
// Download: register_tanah.csv
```

#### `exportToExcel(data, filename, columns?, title?)`

Export data ke format Excel (HTML table).

```typescript
import { exportToExcel } from './utils/exportBackup';

exportToExcel(
  data,
  'register_tanah',
  ['nama', 'luas', 'harga', 'total'],
  'Register Tanah'
);
// Download: register_tanah.xls
```

#### `exportToJSON(data, filename, metadata?)`

Export data ke format JSON (untuk backup).

```typescript
import { exportToJSON } from './utils/exportBackup';

const backupData = {
  tanah: [...],
  beko: [...],
  kas: [...]
};

exportToJSON(
  backupData,
  'backup_2026-10-21',
  { version: '1.0', exportedBy: 'Admin' }
);
// Download: backup_2026-10-21.json
```

#### `printReceipt(content, title?)`

Print receipt/kwitansi.

```typescript
import { printReceipt, generateReceiptHTML, numberToWords } from './utils/exportBackup';

const receiptHTML = generateReceiptHTML({
  company: 'PT Setia Surya Nugraha',
  address: 'Jl. Contoh No. 123',
  phone: '0812-3456-7890',
  receiptNumber: 'KW-2026-001',
  date: '21 Oktober 2026',
  receivedFrom: 'Pak Dede',
  amount: 51000000,
  amountInWords: numberToWords(51000000) + ' Rupiah',
  purpose: 'Pembayaran tanah 68 BT',
  paymentMethod: 'Transfer Bank',
  notes: 'Lunas'
});

printReceipt(receiptHTML, 'Kwitansi KW-2026-001');
// Buka window baru untuk print
```

#### `generateReceiptHTML(params): string`

Generate HTML untuk receipt/kwitansi.

```typescript
import { generateReceiptHTML } from './utils/exportBackup';

const html = generateReceiptHTML({
  company: 'PT Setia Surya Nugraha',
  address: 'Jl. Contoh No. 123',
  phone: '0812-3456-7890',
  receiptNumber: 'KW-2026-001',
  date: '21 Oktober 2026',
  receivedFrom: 'Pak Dede',
  amount: 51000000,
  amountInWords: 'Lima Puluh Satu Juta Rupiah',
  purpose: 'Pembayaran tanah 68 BT',
  paymentMethod: 'Transfer Bank',
  notes: 'Lunas'
});
```

#### `numberToWords(num: number): string`

Convert number to Indonesian words (terbilang).

```typescript
import { numberToWords } from './utils/exportBackup';

numberToWords(51000000);
// → "Lima Puluh Satu Juta"

numberToWords(1234567);
// → "Satu Juta Dua Ratus Tiga Puluh Empat Ribu Lima Ratus Enam Puluh Tujuh"
```

### Contoh Penggunaan Lengkap

```typescript
import {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  printReceipt,
  generateReceiptHTML,
  numberToWords
} from './utils/exportBackup';

// Export register tanah ke CSV
function handleExportCSV() {
  const data = getTanahData();
  exportToCSV(data, 'register_tanah', ['nama', 'luas', 'harga', 'total']);
}

// Export ke Excel
function handleExportExcel() {
  const data = getTanahData();
  exportToExcel(data, 'register_tanah', ['nama', 'luas', 'harga', 'total'], 'Register Tanah');
}

// Backup semua data
function handleBackup() {
  const backupData = {
    tanah: getTanahData(),
    beko: getBekoData(),
    kas: getKasData(),
    timestamp: new Date().toISOString()
  };
  
  exportToJSON(
    backupData,
    `backup_${new Date().toISOString().split('T')[0]}`,
    { version: '1.0', exportedBy: currentUser.name }
  );
}

// Print kwitansi
function handlePrintReceipt(transaction: any) {
  const receiptHTML = generateReceiptHTML({
    company: 'PT Setia Surya Nugraha',
    address: 'Jl. Contoh No. 123',
    phone: '0812-3456-7890',
    receiptNumber: transaction.receiptNumber,
    date: transaction.date,
    receivedFrom: transaction.pihak,
    amount: transaction.nominal,
    amountInWords: numberToWords(transaction.nominal) + ' Rupiah',
    purpose: transaction.keterangan,
    paymentMethod: transaction.metode,
    notes: transaction.catatan
  });
  
  printReceipt(receiptHTML, `Kwitansi ${transaction.receiptNumber}`);
}
```

---

## 🎯 Best Practices

### 1. Selalu Gunakan Parser Angka

```typescript
// ❌ SALAH
const harga = parseFloat(inputValue);

// ✅ BENAR
import { parseRupiah } from './utils/numberParser';
const harga = parseRupiah(inputValue);
```

### 2. Selalu Validasi Transaksi

```typescript
// ❌ SALAH
await saveTransaction(formData);

// ✅ BENAR
import { validateTransaction } from './utils/transactionGuard';

const validation = validateTransaction(formData, existingTransactions);
if (!validation.isValid) {
  alert('Validasi gagal: ' + validation.errors.join(', '));
  return;
}
await saveTransaction({ ...formData, idempotencyKey: validation.idempotencyKey });
```

### 3. Selalu Handle Konflik

```typescript
// ❌ SALAH
const kasRiil = sourceA || sourceB;  // Pilih diam-diam

// ✅ BENAR
import { detectConflict, resolveConflict } from './utils/conflictResolver';

const conflict = detectConflict('kas_riil', '...', sourceA, valueA, sourceB, valueB);
if (conflict) {
  // Tampilkan UI untuk resolve
  const resolved = await showConflictResolverUI(conflict);
  // Simpan dengan audit trail
}
```

### 4. Selalu Backup Sebelum Perubahan Besar

```typescript
// ✅ BENAR
import { exportToJSON } from './utils/exportBackup';

// Backup dulu
exportToJSON(getAllData(), `backup_before_migration_${Date.now()}`);

// Baru lakukan perubahan
await migrateData();
```

---

## 📞 Support

Jika ada pertanyaan atau masalah dengan utility functions ini, silakan:
1. Cek dokumentasi di file ini
2. Lihat contoh penggunaan di masing-masing file
3. Baca laporan audit: `LAPORAN_AUDIT_KOMPREHENSIF.md`

---

**Dibuat oleh:** AI Assistant  
**Tanggal:** 21 Oktober 2026  
**Versi:** 1.0
