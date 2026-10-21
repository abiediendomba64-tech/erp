# 📖 PANDUAN PENGGUNA SISTEM KAS-GAN

**Versi:** 1.0  
**Tanggal:** 21 Oktober 2026

---

## 🎯 DAFTAR ISI

1. [Manajemen User](#1-manajemen-user)
2. [Input & Edit Data](#2-input--edit-data)
3. [Export Data](#3-export-data)
4. [Integrasi WhatsApp](#4-integrasi-whatsapp)
5. [Integrasi Telegram](#5-integrasi-telegram)
6. [Backup & Restore](#6-backup--restore)
7. [Pengaturan Notifikasi](#7-pengaturan-notifikasi)

---

## 1. MANAJEMEN USER

### 📍 Lokasi Menu
**Sistem → Manajemen User**

### 👥 Hak Akses per Role

| Role | Akses |
|------|-------|
| **ADMIN** | Semua akses, kelola user, konfigurasi sistem, approve transaksi |
| **KEUANGAN** | Buku kas, arsip bukti, utang, laporan keuangan, export data |
| **PROYEK** | Register tanah, beko, stok, produksi, laporan proyek |
| **VIEWER** | Dashboard (read-only), progress tanah, progress beko |

### ➕ Tambah User Baru

1. Klik tombol **"Tambah User"** di pojok kanan atas
2. Isi form:
   - **Nama Lengkap** (wajib)
   - **Email** (wajib)
   - **No. WhatsApp** (wajib)
   - **Role** (pilih dari dropdown)
   - **Status** (Active/Inactive)
3. Klik **"Simpan"**

### ✏️ Edit User

1. Cari user di tabel
2. Klik icon **Edit** (pensil) di kolom Aksi
3. Ubah data yang diperlukan
4. Klik **"Simpan"**

### 🗑️ Hapus User

1. Cari user di tabel
2. Klik icon **Hapus** (tempat sampah) di kolom Aksi
3. Konfirmasi penghapusan

⚠️ **Perhatian:** User yang dihapus tidak bisa dikembalikan. Pastikan user tidak sedang menangani transaksi penting.

---

## 2. INPUT & EDIT DATA

### 📍 Lokasi Menu
Setiap modul memiliki tombol **"Tambah"** dan **"Edit"** di pojok kanan atas.

### 📝 Contoh: Input Data Tanah

1. Buka menu **Audit → Register Tanah**
2. Klik tombol **"Tambah Bidang"**
3. Isi form:
   - **Pemilik** (wajib)
   - **Luas (BT)** (wajib, angka)
   - **Harga per BT** (wajib, format: 750000 atau 750.000)
   - **DP yang sudah dibayar** (wajib)
   - **Status** (Lunas/DP/Belum Bayar)
   - **Catatan** (opsional)
4. Sistem akan otomatis menghitung:
   - Nilai Total = Luas × Harga per BT
   - Sisa = Nilai Total - DP
5. Klik **"Simpan"**

### 💡 Format Input Angka

Sistem mendukung format angka Indonesia:
- `750000` → Rp750.000 ✅
- `750.000` → Rp750.000 ✅
- `1.234.567` → Rp1.234.567 ✅
- `1.234.567,50` → Rp1.234.567,50 ✅

### ✏️ Edit Data

1. Cari data di tabel
2. Klik icon **Edit** (pensil)
3. Ubah data yang diperlukan
4. Klik **"Update"**
5. Perubahan akan tercatat di **Audit Log**

### 🔄 Validasi Data

Sistem akan memvalidasi:
- ✅ Field wajib harus diisi
- ✅ Format angka harus benar
- ✅ Tidak boleh ada transaksi duplikat
- ⚠️ Warning untuk transaksi > Rp50.000.000
- ⚠️ Warning untuk tanggal masa depan

---

## 3. EXPORT DATA

### 📍 Lokasi Menu
**Pengaturan → Export** atau tombol **Export** di setiap halaman

### 📊 Format Export

#### Excel (.xlsx)
- Format: Tabel dengan header
- Bisa dibuka di Microsoft Excel, Google Sheets
- Mendukung multiple sheet
- **Cocok untuk:** Analisis data, pivot table, reporting

#### CSV (.csv)
- Format: Plain text dengan pemisah koma
- Universal, bisa dibuka di semua spreadsheet
- **Cocok untuk:** Import ke sistem lain, database

#### PDF (.pdf)
- Format: Dokumen profesional
- Tidak bisa diedit
- **Cocok untuk:** Arsip, laporan ke manajemen, print

### 📥 Cara Export

1. Buka halaman yang ingin di-export (misal: Register Tanah)
2. Klik tombol **"Export"** di pojok kanan atas
3. Pilih format:
   - **Excel** → Download file .xlsx
   - **CSV** → Download file .csv
   - **PDF** → Download file .pdf
4. File akan otomatis ter-download

### ⚙️ Pengaturan Export

Di **Pengaturan → Export**, Anda bisa mengatur:
- ✅ **Format default** (Excel/CSV/PDF)
- ✅ **Sertakan Audit Log** (ya/tidak)
- ✅ **Sertakan Foto** (ya/tidak)

---

## 4. INTEGRASI WHATSAPP

### 📍 Lokasi Menu
**Pengaturan → WhatsApp Business API**

### 🔧 Cara Konfigurasi

#### Step 1: Dapatkan API Credentials

1. Buka [Facebook Developers](https://developers.facebook.com/)
2. Buat app atau gunakan app yang sudah ada
3. Tambahkan produk **WhatsApp**
4. Di menu **API Setup**, catat:
   - **Phone Number ID**
   - **WhatsApp Business Account ID**
5. Di menu **System Users**, buat system user dengan permission:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Generate **Permanent Access Token**

#### Step 2: Input ke Sistem

1. Buka **Pengaturan → WhatsApp Business API**
2. Aktifkan toggle **"Aktifkan WhatsApp"**
3. Isi:
   - **API Token** (token dari Facebook)
   - **Phone Number ID**
   - **Business Account ID**
4. Klik **"Test Koneksi"**
5. Jika berhasil, akan muncul ✅ **Connected**
6. Klik **"Simpan Pengaturan"**

### 📨 Fitur WhatsApp

#### Auto-Reply
- Sistem akan otomatis membalas pesan masuk
- Template balasan bisa dikustomisasi
- Contoh: "Terima kasih. Transaksi Anda telah tercatat."

#### Notifikasi Transaksi
- Kirim notifikasi ke WhatsApp saat ada transaksi baru
- Format: "Transaksi baru: [jenis] - [nominal] - [pihak]"
- Bisa diaktifkan/nonaktifkan

### 📱 Contoh Penggunaan

**User kirim WhatsApp:**
```
Saya sudah transfer DP tanah Pak Dede sebesar 20 juta
```

**Sistem otomatis:**
1. Parse pesan dengan AI
2. Ekstrak: pihak=Pak Dede, nominal=20.000.000, jenis=DP
3. Buat draft transaksi
4. Kirim konfirmasi ke user:
```
✅ Transaksi tercatat:
- Pihak: Pak Dede
- Nominal: Rp20.000.000
- Jenis: DP Tanah
- Status: Menunggu verifikasi

Balas "CONFIRM" untuk konfirmasi
```

---

## 5. INTEGRASI TELEGRAM

### 📍 Lokasi Menu
**Pengaturan → Telegram Bot**

### 🔧 Cara Konfigurasi

#### Step 1: Buat Bot Telegram

1. Buka Telegram, cari **@BotFather**
2. Kirim command: `/newbot`
3. Ikuti instruksi:
   - Nama bot: `KAS-GAN Bot`
   - Username: `kas_gan_bot` (harus unik)
4. Catat **Bot Token** yang diberikan

#### Step 2: Dapatkan Chat ID

**Untuk Grup/Channel:**
1. Tambahkan bot ke grup/channel
2. Kirim pesan di grup
3. Buka: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Cari `"chat":{"id":-100xxxxxxxxxx}`
5. Catat **Chat ID** (dimulai dengan -100)

**Untuk Personal Chat:**
1. Chat dengan bot
2. Buka: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Cari `"chat":{"id":123456789}`
4. Catat **Chat ID**

#### Step 3: Input ke Sistem

1. Buka **Pengaturan → Telegram Bot**
2. Aktifkan toggle **"Aktifkan Telegram"**
3. Isi:
   - **Bot Token**
   - **Chat ID**
4. Klik **"Test Koneksi"**
5. Jika berhasil, bot akan kirim pesan test
6. Klik **"Simpan Pengaturan"**

### 📨 Fitur Telegram

#### Command Bot
- `/saldo` → Tampilkan saldo kas
- `/tanah` → Tampilkan register tanah
- `/beko` → Tampilkan rincian beko
- `/export` → Export data ke Excel
- `/backup` → Backup database

#### Notifikasi
- Notifikasi transaksi baru
- Notifikasi stok menipis
- Notifikasi jatuh tempo
- Notifikasi transaksi besar

### 📱 Contoh Command

**User kirim:**
```
/saldo
```

**Bot balas:**
```
💰 Saldo Kas per 21 Oktober 2026

Total Dana Masuk: Rp411.500.000
Total Pengeluaran: Rp394.346.000
Saldo: Rp17.154.000

Kas Riil: Rp35.220.000
Utang Tanah: Rp34.700.000
Posisi Neto: Rp520.000 ✅
```

---

## 6. BACKUP & RESTORE

### 📍 Lokasi Menu
**Pengaturan → Backup & Restore**

### 💾 Backup Otomatis

1. Aktifkan toggle **"Backup Otomatis"**
2. Pilih **Frekuensi**:
   - **Harian** → Backup setiap hari jam 00:00
   - **Mingguan** → Backup setiap Minggu jam 00:00
   - **Bulanan** → Backup tanggal 1 setiap bulan
3. Pilih **Lokasi**:
   - **Lokal** → Download ke komputer
   - **Cloud** → Upload ke Google Drive
   - **Keduanya** → Lokal + Cloud
4. Klik **"Simpan Pengaturan"**

### 📥 Backup Manual

1. Klik tombol **"Backup Sekarang"**
2. Sistem akan:
   - Export semua data ke JSON
   - Include audit log
   - Include metadata (tanggal, versi)
3. File akan ter-download: `backup_YYYY-MM-DD.json`

### 📤 Restore Data

⚠️ **Perhatian:** Restore akan menimpa data yang ada. Pastikan backup dulu sebelum restore.

1. Buka **Pengaturan → Backup & Restore**
2. Klik **"Restore dari File"**
3. Pilih file backup (.json)
4. Konfirmasi restore
5. Tunggu proses selesai
6. Reload halaman

### 📋 Isi Backup

File backup berisi:
```json
{
  "version": "1.0",
  "timestamp": "2026-10-21T10:30:00Z",
  "metadata": {
    "exportedBy": "Admin",
    "totalRecords": 1234
  },
  "data": {
    "tanah": [...],
    "beko": [...],
    "bukukas": [...],
    "arsipbukti": [...],
    "utang": [...],
    "auditlog": [...]
  }
}
```

---

## 7. PENGATURAN NOTIFIKASI

### 📍 Lokasi Menu
**Pengaturan → Notifikasi**

### 🔔 Jenis Notifikasi

#### Stok Menipis
- **Kapan:** Saat stok barang ≤ minimum stock
- **Via:** WhatsApp, Telegram, Email
- **Format:** "Stok menipis: [nama barang] - [stok saat ini] [satuan]"

#### Jatuh Tempo
- **Kapan:** H-3, H-1, dan hari H jatuh tempo
- **Via:** WhatsApp, Telegram, Email
- **Format:** "Jatuh tempo: [no invoice] - [nominal] - [pihak]"

#### Transaksi Besar
- **Kapan:** Saat ada transaksi > threshold
- **Via:** WhatsApp, Telegram, Email
- **Format:** "Transaksi besar: [jenis] - [nominal] - [pihak]"
- **Threshold:** Bisa diatur (default: Rp50.000.000)

### ⚙️ Cara Setting

1. Buka **Pengaturan → Notifikasi**
2. Aktifkan/nonaktifkan setiap jenis notifikasi
3. Untuk **Transaksi Besar**, atur threshold:
   - Input angka (contoh: 50000000)
   - Sistem akan notifikasi jika transaksi > threshold
4. Pilih **Channel notifikasi**:
   - ✅ WhatsApp
   - ✅ Telegram
   - ✅ Email
5. Klik **"Simpan Pengaturan"**

### 📱 Contoh Notifikasi

**WhatsApp:**
```
🔔 Transaksi Besar

Jenis: Pembayaran Tanah
Pihak: Pak Dede
Nominal: Rp67.500.000
Tanggal: 21 Oktober 2026

Silakan verifikasi di sistem.
```

**Telegram:**
```
⚠️ Stok Menipis

Barang: Semen Portland 50kg
Stok: 15 zak
Minimum: 20 zak

Segera lakukan pembelian!
```

---

## 🎯 BEST PRACTICES

### 1. Input Data
- ✅ Selalu gunakan format angka Indonesia (750.000)
- ✅ Isi semua field wajib
- ✅ Tambahkan catatan untuk transaksi khusus
- ✅ Upload bukti (kwitansi/foto) untuk setiap transaksi

### 2. Export Data
- ✅ Export rutin (mingguan/bulanan) untuk backup
- ✅ Gunakan Excel untuk analisis data
- ✅ Gunakan PDF untuk laporan ke manajemen
- ✅ Simpan export di folder terorganisir

### 3. Backup
- ✅ Aktifkan backup otomatis (minimal mingguan)
- ✅ Simpan backup di multiple lokasi (local + cloud)
- ✅ Test restore secara berkala
- ✅ Labeli backup dengan tanggal

### 4. Notifikasi
- ✅ Aktifkan notifikasi untuk transaksi besar
- ✅ Set threshold yang sesuai dengan bisnis
- ✅ Review notifikasi setiap hari
- ✅ Follow up segera untuk notifikasi penting

### 5. User Management
- ✅ Buat user sesuai role yang dibutuhkan
- ✅ Nonaktifkan user yang sudah tidak bekerja
- ✅ Review hak akses secara berkala
- ✅ Jangan share password

---

## 🆘 TROUBLESHOOTING

### WhatsApp tidak terkirim
- ✅ Cek API Token sudah benar
- ✅ Cek Phone Number ID sudah benar
- ✅ Test koneksi di Pengaturan
- ✅ Pastikan nomor WhatsApp terdaftar di Facebook Business

### Telegram bot tidak merespon
- ✅ Cek Bot Token sudah benar
- ✅ Cek Chat ID sudah benar
- ✅ Pastikan bot sudah ditambahkan ke grup
- ✅ Test koneksi di Pengaturan

### Export gagal
- ✅ Cek browser mengizinkan download
- ✅ Cek ruang penyimpanan cukup
- ✅ Coba browser lain
- ✅ Clear cache browser

### Backup gagal
- ✅ Cek koneksi internet (untuk cloud backup)
- ✅ Cek ruang penyimpanan
- ✅ Coba backup manual dulu
- ✅ Cek log error di console browser

---

## 📞 SUPPORT

Jika ada pertanyaan atau masalah:
1. Cek dokumentasi ini dulu
2. Cek Audit Log untuk melihat error
3. Hubungi administrator sistem
4. Buat issue di repository GitHub

---

## 📝 CHANGELOG

### v1.0 (21 Oktober 2026)
- ✅ Tambah halaman Manajemen User
- ✅ Tambah halaman Pengaturan
- ✅ Integrasi WhatsApp Business API
- ✅ Integrasi Telegram Bot
- ✅ Export Excel/CSV/PDF
- ✅ Backup otomatis & manual
- ✅ Notifikasi real-time
- ✅ Parser angka Indonesia
- ✅ Transaction guard (anti-duplikat)
- ✅ Conflict resolver

---

**Dibuat oleh:** AI Assistant  
**Tanggal:** 21 Oktober 2026  
**Versi:** 1.0
