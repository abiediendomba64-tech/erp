# Status Fitur KAS-GAN ERP - Audit Jujur

**Tanggal Audit:** 21 Oktober 2026  
**Status:** ⚠️ BELUM SIAP PRODUKSI

---

## 📊 Ringkasan Eksekutif

Berdasarkan audit menyeluruh terhadap source code yang tersedia (Android Kotlin + Apps Script), **TIDAK ADA** React ERP yang diklaim sebelumnya. Fitur-fitur yang diklaim "lengkap" ternyata:

- **OCR Gemini**: ❌ HANYA UI MOCKUP (tidak ada API call)
- **WhatsApp Otomatis**: ❌ HANYA SHARE INTENT (bukan Business API)
- **ERP 17 Modul**: ❌ HANYA 7 MODUL DASAR (tidak ada stok/produksi/penjualan/pembelian/penggajian)
- **Admin/Client Terpisah**: ❌ HANYA ROLE SWITCH UI (bukan aplikasi terpisah)
- **Real-time Dashboard**: ❌ HANYA SYNC ON-DEMAND (bukan websocket/polling)
- **Bebas Duplikasi**: ❌ HANYA SHA-256 FILE (bukan idempotency transaksi)

---

## ✅ Fitur yang BENAR-BENAR ADA

### 1. Register Tanah (Android)
- **Status**: ✅ Ada di source Android
- **File**: `LandScreen.kt`, `LandParcel` entity
- **Fungsi**: Input data tanah, hitung nilai, tracking pembayaran
- **Batas**: Belum ada atomic transaction lintas ledger

### 2. Beko/Cut-Fill (Android)
- **Status**: ✅ Ada di source Android
- **File**: `BekoScreen.kt`, `BekoLog` entity
- **Fungsi**: Input pekerjaan beko, hitung volume, tracking pembayaran
- **Batas**: Scope/kontrak/revisi perlu audit lanjutan

### 3. Anggaran (Android)
- **Status**: ✅ Ada di source Android
- **File**: `BudgetScreen.kt`, `BudgetProposal` entity
- **Fungsi**: Input proposal anggaran, tracking realisasi
- **Batas**: Belum ERP budgeting penuh/commitments

### 4. Kas & Audit (Android)
- **Status**: ✅ Ada di source Android
- **File**: `CashAuditScreen.kt`, transaksi/kas DAO
- **Fungsi**: Input transaksi kas, audit trail
- **Batas**: Jalur DAO/repository ganda ditemukan

### 5. Arsip Bukti (Android)
- **Status**: ✅ Ada di source Android
- **File**: `ReceiptStoreScreen.kt`, `ReceiptProofStore`
- **Fungsi**: Upload foto kwitansi, metadata
- **Batas**: Belum auto-cocok 69 foto ke transaksi

### 6. Dashboard Lokal (Android)
- **Status**: ✅ Ada di source Android
- **File**: `DashboardScreen.kt` + Room flows
- **Fungsi**: Tampilkan ringkasan dari database lokal
- **Batas**: Tidak realtime lintas perangkat

---

## ❌ Fitur yang TIDAK ADA (Klaim Palsu)

### 1. OCR Gemini Vision
- **Klaim**: "Scan foto kwitansi otomatis dengan Gemini AI"
- **Realita**: 
  - File `GeminiOcrService.kt` ada tapi **FAIL-CLOSED**
  - Tidak ada API key, tidak ada endpoint
  - Hanya return error: "Backend OCR tidak dikonfigurasi"
- **Status**: ❌ TIDAK BERFUNGSI

### 2. WhatsApp Business API
- **Klaim**: "Auto-pencatatan transaksi via WhatsApp"
- **Realita**:
  - Hanya Android `Intent.ACTION_SEND`
  - Buka WhatsApp dengan teks pre-filled
  - User harus kirim manual
  - Tidak ada webhook, tidak ada n8n
- **Status**: ❌ BUKAN OTOMATIS

### 3. Google Sheets Sync
- **Klaim**: "Sinkronisasi realtime ke Google Sheets"
- **Realita**:
  - Tidak ada connector Sheets di source
  - Tidak ada OAuth/Service Account
  - Tidak ada sync cursor/conflict handling
- **Status**: ❌ TIDAK ADA

### 4. Modul ERP Lengkap
- **Klaim**: "17 modul ERP: Stok, Produksi, Penjualan, Pembelian, Penggajian, dll"
- **Realita**:
  - Tidak ada screen/entity untuk stok
  - Tidak ada BOM/production/work-order
  - Tidak ada invoice/sales-order
  - Tidak ada PO/goods receipt/AP
  - Tidak ada payroll/slip gaji
- **Status**: ❌ TIDAK ADA

### 5. Admin/Client Terpisah
- **Klaim**: "Aplikasi Admin dan Client terpisah"
- **Realita**:
  - Single Android app dengan tabs
  - Role switch di UI saja
  - Tidak ada backend auth
  - Tidak ada permission enforcement
- **Status**: ❌ BUKAN TERPISAH

### 6. Real-time Dashboard
- **Klaim**: "Dashboard realtime dengan auto-update"
- **Realita**:
  - Apps Script: `getBootstrapData()` saat load/refresh
  - Tidak ada polling, websocket, subscription
  - User lain edit → tidak muncul otomatis
- **Status**: ❌ BUKAN REALTIME

---

## ⚠️ Masalah Kritis yang Ditemukan

### 1. Parser Angka Salah
**File**: `Code.gs` fungsi `n_()`

```javascript
// SALAH:
n_('750.000') → 750  // Seharusnya 750000
n_('800.000') → 800  // Seharusnya 800000
```

**Penyebab**: Tidak bisa bedakan titik ribuan vs titik desimal

**Solusi**: Gunakan parser khusus rupiah (sudah dibuat di `src/utils/numberParser.ts`)

### 2. Formula Workbook Salah
**File**: `Dashboard` sheet

| Sel | Label | Formula | Masalah |
|-----|-------|---------|---------|
| B7 | Tanah dibayar | `='Beko_CutFill'!H10` | Mengambil total Beko, bukan tanah |
| B8 | Biaya Beko 1-6 | `='Beko_CutFill'!I10` | Kolom I = dibayar, seharusnya H |
| B9 | Dibayar Beko 1-6 | `='Beko_CutFill'!I9` | Baris 9 = item 8, bukan total |
| C9 | Keterangan | `=SUMIF scope 'IN'...` | Formula tidak valid, #NAME? |
| B11:B12 | Saldo/Kas riil | `17154000`, `35220000` | Angka statis, bukan formula |

**Solusi**: Perbaiki formula atau tandai sebagai "snapshot manual"

### 3. Data Konflik Tidak Ditandai
**Contoh**:

| Ukuran | Versi A | Versi B | Selisih |
|--------|---------|---------|---------|
| Kas riil | Rp35.220.000 | Rp20.220.000 | Rp15.000.000 |
| Utang tanah | Rp34.700.000 | Rp37.200.000 | Rp2.500.000 |
| Pembayaran tanah | Rp309.400.000 | Rp236.900.000 | Rp72.500.000 |
| Dana Beko | Rp55.450.000 | Rp61.350.000 | Rp5.900.000 |

**Masalah**: Sistem tidak tandai konflik, user bisa pilih salah satu diam-diam

**Solusi**: Tambah field `sumber_data` dan `status_konflik` di setiap record

### 4. Duplikasi Transaksi Bisnis
**Klaim**: "Bebas duplikasi dengan SHA-256"

**Realita**:
- SHA-256 hanya cegah upload file identik
- Tidak cegah transaksi ekonomi yang sama dengan foto berbeda
- Tidak ada idempotency key (tanggal + pihak + nominal + referensi)

**Solusi**: Tambah unique constraint pada business key

### 5. Risiko Hitung Ganda
**Skenario**:
1. Operator input transaksi APP: Rp10jt
2. Operator koreksi "Dibayar menurut Catatan" dari Rp100jt → Rp110jt (sudah termasuk APP)
3. Sistem hitung: Rp110jt - Rp10jt (APP) = Rp100jt ✓
4. Tapi sebenarnya Rp110jt sudah termasuk Rp10jt APP → double count

**Solusi**: 
- Pisahkan "saldo pembukaan historis" dan "mutasi pasca-cutoff"
- Validasi bahwa koreksi tidak termasuk transaksi APP

---

## 🔧 Perbaikan yang SUDAH Dilakukan

### 1. Parser Angka Indonesia ✅
**File**: `src/utils/numberParser.ts`

```typescript
parseRupiah('750.000') → 750000 ✓
parseRupiah('1.234.567,50') → 1234567.50 ✓
parseDecimal('2,5') → 2.5 ✓
```

### 2. Dokumentasi Jujur ✅
**File**: `STATUS_FITUR.md` (file ini)

### 3. Proteksi Duplikasi (Rencana)
**File**: `src/utils/transactionGuard.ts` (belum implementasi)

---

## 🚧 Perbaikan yang BELUM Dilakukan

### 1. Fix Formula Workbook
**Status**: ⏳ Perlu akses ke workbook asli  
**Action**: Perbaiki referensi sel atau tandai sebagai snapshot

### 2. Handle Data Konflik
**Status**: ⏳ Perlu desain schema  
**Action**: Tambah field `sumber_data`, `status_konflik`, `resolved_by`

### 3. Idempotency Transaksi
**Status**: ⏳ Perlu implementasi  
**Action**: Tambah unique constraint pada business key

### 4. Backup/Export/Print
**Status**: ⏳ Belum ada  
**Action**: 
- Export ke PDF (laporan lengkap)
- Export ke Excel (semua data)
- Print receipt/kwitansi
- Backup database otomatis

### 5. Modul Pendukung Lengkap
**Status**: ⏳ Belum ada  
**Action**: 
- Development (RAB, siteplan, progress)
- Konstruksi (material, tenaga, alat)
- Marketing (prospek, follow-up, closing)
- Notaris (dokumen, proses, biaya)
- Legal (perjanjian, sengketa, penyelesaian)

---

## 📋 Checklist Produksi

### Minimum untuk Deploy

- [ ] Fix semua formula workbook
- [ ] Implementasi parser rupiah di semua input
- [ ] Tambah idempotency transaksi
- [ ] Handle data konflik dengan eksplisit
- [ ] Validasi koreksi saldo dasar
- [ ] Unit test untuk semua parser
- [ ] Integration test untuk semua alur
- [ ] Audit trail untuk semua perubahan
- [ ] Backup/restore yang teruji
- [ ] Export PDF/Excel yang lengkap
- [ ] Print receipt/kwitansi
- [ ] Dokumentasi user manual
- [ ] Training untuk operator
- [ ] SOP untuk rekonsiliasi
- [ ] Disaster recovery plan

### Rekomendasi Tambahan

- [ ] Implementasi OCR Gemini yang nyata
- [ ] Implementasi WhatsApp Business API
- [ ] Implementasi Google Sheets sync
- [ ] Tambah modul ERP yang hilang
- [ ] Pisah aplikasi Admin/Client
- [ ] Tambah realtime dashboard
- [ ] Mobile app untuk field user
- [ ] Multi-currency support
- [ ] Multi-entity/multi-company
- [ ] Advanced reporting & analytics

---

## 🎯 Kesimpulan

**JANGAN DEPLOY KE PRODUKSI** sebelum semua checklist "Minimum untuk Deploy" selesai.

Sistem saat ini:
- ✅ Punya dasar yang baik (Android + Room)
- ⚠️ Banyak klaim yang tidak terbukti
- ❌ Ada bug kritis (parser angka, formula workbook)
- ❌ Belum ada proteksi duplikasi transaksi
- ❌ Belum handle data konflik
- ❌ Belum ada backup/export/print
- ❌ Belum ada modul pendukung lengkap

**Next Steps**:
1. Fix bug kritis (parser, formula)
2. Tambah proteksi duplikasi
3. Handle data konflik
4. Implementasi backup/export
5. Test end-to-end
6. Training user
7. Deploy ke staging
8. UAT (User Acceptance Test)
9. Deploy ke produksi

---

**Dibuat oleh**: AI Assistant  
**Tanggal**: 21 Oktober 2026  
**Versi**: 1.0  
**Status**: ⚠️ BELUM SIAP PRODUKSI
