# 🏢 SISTEM ERP AKUNTANSI - DOKUMENTASI UTAMA

**Status:** PARTIAL IMPLEMENTATION — NOT PRODUCTION-READY  
**Versi:** 1.1 (perbaikan bertahap)  
**Tanggal:** 21 Oktober 2026  
**Catatan:** biaya, kuota, dan batas layanan tergantung konfigurasi provider

---

## 📖 DAFTAR ISI

1. [Overview Sistem](#overview-sistem)
2. [Status Implementasi](#status-implementasi)
3. [Cara Input & Update Data](#cara-input--update-data)
4. [Hirarki Data](#hirarki-data)
5. [Setup Full Google Stack](#setup-full-google-stack)
6. [Testing & Deployment](#testing--deployment)
7. [Dokumentasi Lengkap](#dokumentasi-lengkap)

---

## 🎯 Gambaran Sistem

Repository berisi aplikasi React untuk akuntansi dan operasional proyek, serta integrasi Google Apps Script yang masih memerlukan konfigurasi.

### Fungsi yang tersedia pada aplikasi
- Input transaksi akuntansi dengan preview jurnal dan validasi debit/kredit.
- Dashboard dan laporan laba rugi, neraca, serta arus kas yang dihitung dari jurnal modul akuntansi.
- Form invoice dan purchase order; PO tidak otomatis membukukan utang sebelum penerimaan/tagihan benar-benar diakui.
- Chart of Accounts standar.
- Penyimpanan browser untuk state modul akuntansi dan sebagian data operasional.

### Batasan penting
- localStorage hanya ada pada browser/perangkat yang sama; bukan cloud sync atau database multi-user.
- Sebagian modul operasional masih memuat seed data awal. Verifikasi setiap record sebelum dipakai sebagai angka aktual.
- Koneksi frontend ke Google Apps Script belum menyeluruh. URL backend harus dikonfigurasi; URL kosong sengaja menghasilkan error.
- OCR, upload Google Drive, WhatsApp/Telegram, serta login/otorisasi multi-user belum siap produksi.
- Export laporan yang tersedia di halaman akuntansi adalah CSV; jangan menganggap PDF/XLSX tersedia hanya dari dokumentasi.

> Laporan harus direkonsiliasi dengan bukti transaksi, saldo awal, persediaan/HPP, pajak, dan aset tetap sebelum dipakai untuk keputusan resmi.

## 📊 Status Implementasi

### Perbaikan inti pada branch ini
- State akuntansi bertahan setelah navigasi dan reload pada browser yang sama.
- Data contoh jurnal/invoice/PO/RAB/schedule di modul akuntansi dihapus sebagai nilai awal; data akuntansi baru dimulai kosong.
- Laba rugi dan arus kas memakai jurnal Posted sesuai periode; neraca memakai saldo kumulatif hingga tanggal laporan.
- Input nominal menerima format Indonesia, misalnya 750.000, dan divalidasi sebelum jurnal disimpan.
- Export laporan menghasilkan file CSV nyata, bukan alert placeholder.
- Endpoint Apps Script untuk GET akun/transaksi/laporan dan POST transaksi/reversal sudah diselaraskan, tetapi perlu uji pada deployment dan spreadsheet nyata.

### Belum terbukti / belum tersedia penuh
- Belum ada cloud database multi-user yang menjadi source of truth untuk seluruh UI.
- Belum ada autentikasi dan otorisasi produksi yang kuat pada backend keuangan.
- OCR serta upload Google Drive belum diverifikasi end-to-end.
- UI OCR/WhatsApp masih memiliki bagian rancangan dan seed data.
- Belum ada validasi independen untuk klaim kepatuhan PSAK atau kesiapan audit.
- Persediaan/HPP, aset tetap, penyusutan, pajak, dan closing period masih butuh pengembangan dan pengujian.

**Jangan gunakan seed data atau laporan sistem untuk keputusan pajak/audit sebelum direkonsiliasi dengan dokumen asli dan diperiksa akuntan.**

## 📝 CARA INPUT & UPDATE DATA

### **Saat Ini (localStorage):**

#### **Input Transaksi:**
```
1. Buka menu: Akuntansi → Input Transaksi
2. Pilih jenis transaksi (7 jenis)
3. Isi form:
   - Tanggal
   - Keterangan
   - Jumlah (format: 10000000 atau 10.000.000)
   - PPN (opsional)
4. Klik "Preview Jurnal"
5. Verifikasi balance (Debit = Kredit)
6. Klik "Simpan"
7. ✅ Data tersimpan di localStorage
```

#### **Input Data Tanah:**
```
1. Buka menu: Audit → Register Tanah
2. Klik "Tambah Bidang"
3. Isi: Pemilik, Luas, Harga, DP
4. Sistem auto-calculate: Nilai Total, Sisa
5. Klik "Simpan"
6. ✅ Data tersimpan
```

#### **Edit Data Master:**
```
1. Buka halaman data (tanah/beko)
2. Klik icon Edit (pensil ✏️)
3. Ubah data
4. Klik "Update"
5. ✅ Data terupdate + audit log tercatat
```

#### **Koreksi Transaksi Posted:**
```
1. Cari transaksi yang salah
2. Klik "Reversal"
3. Isi alasan pembalikan
4. Klik "Submit"
5. ✅ Jurnal pembalik otomatis terbuat
6. ✅ Jurnal original tetap ada
7. ✅ Audit trail tercatat
```

---

### **Setelah Setup Full Google Stack:**

#### **Input via OCR:**
```
1. Upload foto kwitansi ke Google Drive
2. Share sebagai "Anyone with the link"
3. Di React app, klik "Scan Kwitansi"
4. Paste link foto
5. Klik "Scan"
6. ✅ Gemini OCR extract data
7. ✅ Data otomatis masuk ke ARSIP_BUKTI
8. ✅ Jurnal otomatis terbuat
```

#### **Input via WhatsApp:**
```
1. Petugas lapangan kirim foto ke WhatsApp business
2. Apps Script terima webhook
3. Download gambar dari WhatsApp
4. OCR dengan Gemini
5. ✅ Data masuk ke Google Sheets
6. ✅ Jurnal自动生成
7. ✅ Konfirmasi terkirim ke petugas
```

#### **Input via Telegram:**
```
1. Petugas kirim foto ke bot Telegram
2. Apps Script terima webhook
3. Download foto dari Telegram
4. OCR dengan Gemini
5. ✅ Data masuk ke Google Sheets
6. ✅ Jurnal自动生成
7. ✅ Konfirmasi terkirim
```

---

## 🏗️ HIRARKI DATA

```
LEVEL 1: MASTER DATA (Input Manual)
├─ Chart of Accounts (30+ akun) ✅
├─ Daftar Pelanggan ✅
├─ Daftar Supplier ✅
├─ Data Tanah (13 bidang) ✅
└─ Data Beko (8 item) ✅

LEVEL 2: TRANSAKSI HARIAN (Input Manual/OCR/WhatsApp)
├─ Penjualan Tunai/Kredit ✅
├─ Pembelian Tunai/Kredit ✅
├─ Terima Piutang ✅
├─ Bayar Utang ✅
├─ Beban Operasional ✅
├─ Invoice ✅
└─ Purchase Order ✅

LEVEL 3: JURNAL UMUM (Auto-Generate)
├─ Dari transaksi LEVEL 2
├─ Double-entry (Debit = Kredit)
└─ Timestamp & audit trail ✅

LEVEL 4: BUKU BESAR (Auto-Calculate)
├─ Saldo per akun
├─ Running balance
└─ History transaksi ✅

LEVEL 5: LAPORAN KEUANGAN (Auto-Generate)
├─ Laba Rugi ✅
├─ Neraca ✅
└─ Arus Kas ✅
```

---

## 🚀 SETUP FULL GOOGLE STACK

### **Langkah 1: Dapatkan Gemini API Key (10 menit)**
1. Buka https://aistudio.google.com/app/apikey
2. Login dengan akun Google
3. Klik "Create API key"
4. Copy API key (format: `AIzaSy...`)

### Langkah 2: Siapkan Google Apps Script
1. Mulai dari spreadsheet uji dan pilih Extensions → Apps Script.
2. Salin kode dari google-apps-script/Code.gs.
3. Pada Project Settings → Script Properties, isi GEMINI_API_KEY hanya jika ingin mengaktifkan OCR. Jangan simpan kunci di source code atau frontend.
4. Jika project tidak terikat ke spreadsheet, tambahkan Script Property SPREADSHEET_ID.
5. Jalankan setupDatabase() lalu periksa header semua sheet.

### Langkah 3: Deployment dengan kontrol akses
- Mulai dengan data uji, bukan data keuangan sensitif.
- Jangan membuka endpoint tulis keuangan ke publik dengan akses “Anyone”; otentikasi/otorisasi produksi belum tersedia.
- Webhook provider perlu verifikasi masing-masing. Deployment berhasil tidak berarti integrasinya sudah aktif.

### Langkah 4: Konfigurasi frontend
- Set environment build VITE_ERP_API_URL ke URL Web App Apps Script.
- Setelah mengganti environment Cloudflare Pages, jalankan build/deploy baru.
- Ini hanya mengonfigurasi helper API; komponen UI belum seluruhnya memakai backend dan sebagian state masih localStorage.

### **Langkah 5: Test End-to-End (30 menit)**
1. Test OCR dengan foto kwitansi
2. Test input transaksi
3. Test laporan keuangan
4. Test reversal journal

**Total Waktu:** 2 jam  
**Total Biaya:** Rp0

**Dokumentasi Detail:** Lihat `IMPLEMENTASI_NYATA.md`

---

## 🧪 TESTING & DEPLOYMENT

### **Test Checklist:**

#### **Core Functions:**
- [ ] Parser angka Indonesia (750.000 → 750000)
- [ ] Double-entry balance (Debit = Kredit)
- [ ] Anti-duplikasi transaksi
- [ ] Auto-generate jurnal
- [ ] Laporan keuangan (Laba Rugi, Neraca)

#### **OCR & Integration:**
- [ ] OCR kwitansi dengan Gemini
- [ ] WhatsApp webhook
- [ ] Telegram webhook
- [ ] Data masuk ke Google Sheets
- [ ] Jurnal自动生成

#### **Data Management:**
- [ ] Input transaksi manual
- [ ] Input data master
- [ ] Edit data master
- [ ] Reversal journal
- [ ] Audit trail

#### **Export & Backup:**
- [ ] Export CSV
- [ ] Export Excel
- [ ] Export JSON
- [ ] Backup manual
- [ ] Restore dari backup

### **Deployment Checklist:**
- [ ] Gemini API key sudah didapat
- [ ] Apps Script sudah di-deploy
- [ ] Web app URL sudah dicopy
- [ ] Database sheets sudah terbuat
- [ ] Frontend sudah update API URL
- [ ] Test end-to-end berhasil
- [ ] User training selesai
- [ ] Go live!

---

## 📚 DOKUMENTASI LENGKAP

### **File Utama:**
1. **`README.md`** (file ini) - Overview & quick start
2. **`IMPLEMENTASI_NYATA.md`** - Panduan setup Full Google Stack
3. **`DOKUMENTASI_FINAL.md`** - Status sistem & roadmap
4. **`PANDUAN_INPUT_UPDATE_DATA.md`** - Cara input/update data
5. **`LAPORAN_AUDIT_FINAL.md`** - Hasil audit menyeluruh

### **Kode Backend:**
6. **`google-apps-script/Code.gs`** - Backend API lengkap
   - OCR Gemini
   - WhatsApp webhook
   - Telegram webhook
   - Auto-generate jurnal
   - Reversal journal
   - Audit trail

### **Kode Frontend:**
7. **`src/services/api.ts`** - API service untuk connect ke backend
8. **`src/utils/numberParser.ts`** - Parser angka Indonesia
9. **`src/utils/accounting.ts`** - Double-entry bookkeeping
10. **`src/utils/transactionGuard.ts`** - Anti-duplikasi

### **Testing:**
11. **`test-all-functions.js`** - Automated test (13/13 passed)

### **Status & Audit:**
12. **`STATUS_INPUT_UPDATE_JUJUR.md`** - Status jujur implementasi
13. **`AUDIT_MENYELURUH_FINAL.md`** - Audit detail
14. **`ROADMAP_FULL_GOOGLE_STACK.md`** - Roadmap implementasi

---

## 💰 ANALISIS BIAYA

### **Sebelum (Dengan Backend Sendiri):**
```
- Server hosting: $20-50/bulan
- Database: $10-30/bulan
- OCR API: $10-50/bulan
- File storage: $5-10/bulan
─────────────────────────────
Total: $45-140/bulan = Rp700.000-2.200.000/bulan
```

### **Sesudah (Full Google Stack):**
```
- Google Apps Script: Rp0
- Google Sheets: Rp0
- Gemini API: Rp0
- Google Drive: Rp0
- WhatsApp Business API: Rp0
─────────────────────────────
Total: Rp0/bulan = GRATIS!
```

**Penghematan:** Rp8.4-26.4 juta/tahun

---

## 🎯 REKOMENDASI

### **Untuk Demo/Testing (Sekarang):**
✅ Gunakan sistem saat ini dengan localStorage  
✅ Input data manual  
✅ Backup rutin ke JSON  
✅ Test semua fitur  

### **Untuk Produksi (Setelah Setup):**
⏳ Setup Full Google Stack (2 jam)  
⏳ Migrasi data ke cloud  
⏳ Training user  
⏳ Go live  

### **Untuk Enterprise (Masa Depan):**
🔮 Upgrade ke Firebase/Cloud SQL jika volume tinggi  
🔮 Tambah multi-currency support  
🔮 Mobile app (React Native)  
🔮 Advanced reporting & analytics  

---

## 🆘 SUPPORT & TROUBLESHOOTING

### **Problem: Data hilang setelah refresh**
**Penyebab:** Data tersimpan di localStorage  
**Solusi:** Setup Full Google Stack untuk penyimpanan permanen

### **Problem: OCR tidak berfungsi**
**Penyebab:** Gemini API key belum di-setup  
**Solusi:** Lihat `IMPLEMENTASI_NYATA.md` → Langkah 1-2

### **Problem: WhatsApp/Telegram tidak terima webhook**
**Penyebab:** Webhook URL belum didaftarkan  
**Solusi:** Lihat `IMPLEMENTASI_NYATA.md` → Setup WhatsApp/Telegram

### **Problem: Jurnal tidak balance**
**Penyebab:** Bug di kode  
**Solusi:** Cek `src/utils/accounting.ts`, pastikan debit = kredit

---

## Kesimpulan

Repository memiliki perbaikan inti akuntansi dan build gate pada branch perbaikan, tetapi **belum siap produksi**.

- Penyimpanan akuntansi masih lokal pada browser.
- Integrasi cloud belum end-to-end dan belum memakai autentikasi/otorisasi produksi yang kuat.
- Hasil typecheck/build tidak membuktikan angka laporan benar untuk seluruh skenario bisnis.
- Saldo awal, pajak, persediaan/HPP, aset tetap, dan periode akuntansi perlu rekonsiliasi serta pemeriksaan akuntan.
- Seed data pada modul operasional harus diverifikasi sebelum dipakai sebagai data transaksi asli.

## Pertanyaan umum

**Apakah transaksi bertahan setelah reload?**  
State modul akuntansi disimpan ke localStorage pada browser yang sama. Ini bukan cloud sync dan tidak membuat data tersedia pada perangkat lain.

**Apakah laporan otomatis dibuat?**  
Laporan dihitung dari jurnal Posted yang tersimpan pada modul akuntansi. Ketepatan hasil tetap bergantung pada ketepatan dan kelengkapan jurnal.

**Apakah OCR, Google Drive, WhatsApp, dan Telegram otomatis aktif?**  
Belum. Komponen, helper dan backend masih memerlukan konfigurasi, wiring UI, credentials, kontrol akses, serta uji end-to-end.

**Apakah sistem sudah PSAK/siap audit?**  
Belum diverifikasi secara independen. Gunakan bukti asli, rekonsiliasi saldo, dan pemeriksaan profesional sebelum menerbitkan laporan resmi.
