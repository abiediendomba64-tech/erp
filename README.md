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

Repository berisi panel React untuk akuntansi dan operasional proyek serta backend Google Apps Script. Branch ini menambahkan Google Sign-In, otorisasi role di server, penyimpanan cloud berversi di Google Sheets, dan log audit server.

### Yang sudah ada pada branch Google
- Panel masuk melalui Google Sign-In; role dibaca dari sheet `USERS`, bukan toggle role di browser.
- Snapshot modul operasional dan akuntansi dimuat dari Google Sheets melalui Apps Script.
- Simpanan menggunakan nomor versi dan pemeriksaan konflik; bila cloud gagal atau berubah dari perangkat lain, UI memblokir pencatatan berikutnya dan meminta reload.
- Workspace baru dimulai kosong secara default. Data browser lama hanya dapat dipindahkan setelah pengguna memilih, mengunduh backup, dan mengonfirmasi migrasi.
- Endpoint OCR Gemini menghasilkan **draf** untuk ditinjau; OCR tidak otomatis membukukan transaksi.

### Batasan penting — baca sebelum produksi
- Branch belum dikonfigurasi atau dideploy ke akun Google, dan belum diuji end-to-end terhadap Spreadsheet/OAuth nyata.
- `ERP_STATE` adalah penyimpanan kanonis internal: satu baris per record dengan payload JSON. Tab laporan yang mudah dibaca per modul (`BUKU_KAS`, `TANAH`, `BEKO`, jurnal dan seterusnya) belum seluruhnya dijadikan proyeksi sinkron otomatis dari state kanonis.
- Banyak form masih menghitung perubahan di React lalu menyimpan snapshot melalui API; jurnal per transaksi dan reversal belum dijalankan sebagai operasi transaksi atomik khusus di backend. Jangan menganggap seluruh alur akuntansi sudah dipindahkan ke server.
- OCR dan upload Drive ada sebagai fungsi backend, tetapi belum seluruhnya tersambung ke form UI.
- Webhook hanya memasukkan event ke `INBOX_OCR`; n8n/provider verification, pengambilan media, OCR otomatis, persetujuan pengguna dan posting buku kas/jurnal belum diaktifkan end-to-end.
- Lampiran yang hanya tersimpan di IndexedDB browser tidak ikut berpindah ke cloud/Drive ketika migrasi data.
- Audit Log UI menampilkan aktivitas yang dicatat server (bootstrap dan penyimpanan modul). Jejak perubahan per-field/transaksi yang lengkap masih perlu dibangun pada API khusus tiap modul.
- Modul tambahan seperti aset, pajak dan register unit tidak berarti jurnal penyusutan, integrasi Coretax/DJP, atau validasi eksternal sudah tersedia.

> Angka resmi tetap harus direkonsiliasi dengan dokumen asli, saldo awal, bukti, persediaan/HPP, pajak, dan aset tetap sebelum dipakai untuk keputusan usaha/pajak/audit.

## 📊 Status Implementasi

### Implementasi cloud pada branch ini
- Backend memakai Google Apps Script dan Google Sheets; klien Supabase tidak lagi menjadi dependensi.
- Google ID token diperiksa pada server terhadap client ID, issuer, masa berlaku dan email terverifikasi; sesi backend ditandatangani server, dan status/role dicek ulang pada setiap permintaan.
- Endpoint tulis transaksi lama yang tidak memeriksa autentikasi dinonaktifkan; API cloud memakai sesi dan izin role.
- Role `ADMIN`, `KEUANGAN`, `PROYEK`, dan `VIEWER` memiliki batas tulis yang diperiksa di backend, bukan hanya menyembunyikan menu.
- Snapshot cloud menggunakan lock dan versi agar dua perangkat tidak diam-diam menimpa versi yang sama.
- Log audit cloud dibaca dari sheet server dan tidak bisa ditulis langsung oleh frontend.
- Test otomatis ditambahkan untuk batas autentikasi, role, dan snapshot.

### Belum terbukti / belum tersedia penuh
- Setup Script Properties, OAuth Web Client, deployment Apps Script, dan deployment frontend masih harus dilakukan di akun pemilik.
- Deployment/credential Google nyata dan test end-to-end belum dijalankan pada branch ini.
- Struktur proyeksi tab per modul, API transaksi atomik, sinkronisasi real-time, serta integrasi OCR/Drive/Telegram/WhatsApp penuh belum selesai.
- Belum ada validasi independen untuk klaim kepatuhan PSAK atau kesiapan audit.
- Persediaan/HPP, aset tetap/penyusutan, pajak, dan closing period tetap memerlukan pengembangan serta pengujian.

**Jangan gunakan data contoh/lama sebagai angka aktual tanpa memeriksa sumbernya. Jangan lakukan migrasi sebelum mengunduh backup dan memeriksa data serta bukti asli.**

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

### Alur integrasi yang masih perlu diaktifkan

- **OCR/Drive:** backend menerima gambar/PDF dan menghasilkan draf OCR atau menyimpan berkas lewat API. Form UI belum tersambung penuh; hasil OCR tetap memerlukan pemeriksaan manusia dan belum membuat transaksi/jurnal otomatis.
- **Telegram/WhatsApp:** siapkan n8n untuk menerima webhook provider, verifikasi identitas/signature/secret provider, lalu relay metadata ke `?path=/webhook/inbox` dengan `ERP_INGEST_SECRET`. Backend hanya menulis event ke `INBOX_OCR` berstatus `RECEIVED`; belum mengunduh media atau memposting kas/jurnal.
- **Pembukuan:** posting, approval, reversal, validasi bukti dan audit per transaksi harus dikerjakan melalui operasi backend khusus sebelum modul ini dipakai sebagai sistem keuangan produksi.

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

## 🚀 Setup Google Apps Script Cloud Backend

Ikuti instruksi rinci pada [`google-apps-script/README.md`](google-apps-script/README.md). Urutan ringkasnya:

1. Buat project Apps Script lalu tambahkan `Code.gs`, `Bridge.html`, dan `appsscript.json` dari folder `google-apps-script/`.
2. Jalankan `setupErpBackend()` satu kali. Periksa spreadsheet ID sebelum memakai sheet lama; fungsi akan membuat spreadsheet baru bila belum ada yang dikonfigurasi.
3. Buat OAuth Client ID jenis Web dan daftarkan origin panel web yang sebenarnya.
4. Isi Script Properties: `ERP_GOOGLE_CLIENT_ID`, `ERP_BOOTSTRAP_ADMIN_EMAIL`, `ERP_ALLOWED_ORIGINS`, dan konfigurasi opsional Gemini/webhook sesuai kebutuhan.
5. Deploy Web App Apps Script; masukkan URL deployment dan OAuth Client ID sebagai environment frontend `VITE_GAS_WEB_APP_URL` dan `VITE_GOOGLE_CLIENT_ID`.
6. Login menggunakan akun bootstrap admin, lalu pilih database kosong atau migrasi data browser dengan backup yang sudah diunduh.
7. Uji auth/role, penyimpanan, konflik dua perangkat dan audit server sebelum memasukkan data keuangan asli.

**Status:** sumber kode backend sudah ada di branch ini; setup akun Google, konfigurasi rahasia, deployment dan uji end-to-end nyata belum dilakukan. Jangan mengartikan langkah-langkah ini sebagai backend yang sudah aktif di URL publik.

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

## 💰 Biaya dan batas layanan

**Target biaya rendah:** Apps Script, Google Sheets dan Google Sign-In bisa dipakai tanpa biaya server terpisah selama penggunaan sesuai ketentuan dan kuota akun. Ini bukan jaminan semua komponen ERP selalu Rp0.

- **Google Apps Script:** memiliki kuota harian dan batas eksekusi; layanan dapat berhenti ketika kuota terlampaui. Dokumentasi resmi: https://developers.google.com/apps-script/guides/services/quotas
- **Gemini API:** memiliki free tier, tetapi batas model/kuota berubah. Halaman pricing saat ini menandai data pada free tier dapat digunakan untuk meningkatkan produk Google; evaluasi sebelum mengirim struk, data bank, identitas atau dokumen finansial sensitif. Dokumentasi: https://ai.google.dev/gemini-api/docs/pricing
- **Google Drive:** mengikuti kapasitas akun/Workspace dan kebijakan penyimpanan.
- **Telegram Bot API:** tidak membutuhkan paket layanan bot berbayar, tetapi hosting n8n atau sistem yang selalu aktif tetap menggunakan perangkat/server.
- **n8n:** Community Edition dapat di-self-host; hosting, domain, listrik, atau VPS tetap dapat menimbulkan biaya.
- **WhatsApp Business Platform:** tidak tepat dipatok Rp0. Tarif resmi bergantung pada pasar dan kategori pesan, serta dikenakan untuk pesan yang tersampaikan; lihat https://whatsappbusiness.com/id/products/platform-pricing/

Sistem bisa mendekati Rp0 untuk uji coba dengan input manual/Telegram dan penggunaan Gemini yang masih dalam free tier. Integrasi WhatsApp resmi dan volume produksi perlu dihitung berdasarkan tarif serta kuota aktual.

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
