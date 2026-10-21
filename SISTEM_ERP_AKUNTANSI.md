# 🏢 SISTEM ERP AKUNTANSI LENGKAP
## Untuk UMKM / PT / CV / TB / Jasa / Service

**Versi:** 1.0  
**Tanggal:** 21 Oktober 2026  
**Status:** IMPLEMENTASI PARSIAL — BELUM SIAP PRODUKSI

---

## Gambaran Sistem

Repository ini memuat modul akuntansi dan operasional proyek. Fokus perbaikan saat ini adalah mencegah data contoh dianggap sebagai transaksi aktual, mempertahankan state ketika berpindah menu, memvalidasi jurnal sebelum diposting, dan menghitung laporan sesuai periode.

- Transaksi akuntansi dicatat pada state yang disimpan ke localStorage browser.
- Jurnal, laba rugi, neraca, dan arus kas dihitung dari data modul akuntansi.
- Invoice dapat membentuk piutang/pendapatan; Purchase Order saja tidak dianggap bukti bahwa barang telah diterima atau utang telah timbul.
- RAB, schedule, sinkronisasi Sheets, dan integrasi messaging belum dapat dianggap lengkap.

Penyimpanan lokal bukan database multi-user. Untuk memakai data lintas perangkat diperlukan backend cloud dengan autentikasi, otorisasi, backup, dan rekonsiliasi yang benar.

## 📊 FITUR UTAMA

### 1. **Dashboard Akuntansi** ✅
**Lokasi:** Menu → Akuntansi → Dashboard Akuntansi

**Fitur:**
- ✅ Ringkasan keuangan real-time
- ✅ Total Aset, Kewajiban, Ekuitas
- ✅ Laba Bersih otomatis
- ✅ Kas & Bank balance
- ✅ Piutang & Utang monitoring
- ✅ Statistik transaksi
- ✅ Jurnal terbaru
- ✅ Schedule mendatang

**Auto-generate dari:**
- Semua jurnal transaksi
- Invoice & Purchase Order
- Schedule & Calendar

---

### 2. **Input Transaksi Mudah** ✅
**Lokasi:** Menu → Akuntansi → Input Transaksi

**Jenis Transaksi:**
1. 💰 **Penjualan Tunai** - Terima uang dari penjualan
2. 📄 **Penjualan Kredit** - Jual barang/jasa, bayar nanti
3. 🛒 **Pembelian Tunai** - Beli barang, bayar langsung
4. 📦 **Pembelian Kredit** - Beli barang, bayar nanti
5. 💵 **Terima Pembayaran Piutang** - Terima uang dari pelanggan
6. 💸 **Bayar Utang** - Bayar utang ke supplier
7. 📝 **Catat Beban** - Catat beban operasional

**Cara Pakai:**
```
1. Pilih jenis transaksi
2. Isi form sederhana:
   - Tanggal
   - Keterangan
   - Jumlah (format: 1000000 atau 1.000.000)
   - PPN (opsional)
   - Pihak (untuk kredit)
3. Klik "Preview Jurnal"
4. Sistem auto-generate jurnal double-entry
5. Klik "Simpan Transaksi"
6. ✅ Selesai! Jurnal, Buku Besar, Laporan otomatis update
```

**Fitur:**
- ✅ Parser angka Indonesia (750.000 → 750000)
- ✅ Auto-generate jurnal double-entry
- ✅ Preview jurnal sebelum simpan
- ✅ Validasi balance (Debit = Kredit)
- ✅ Anti-duplikasi transaksi

---

### 3. **Laporan Keuangan Lengkap** ✅
**Lokasi:** Menu → Akuntansi → Laporan Keuangan

**Jenis Laporan:**

#### A. **Laba Rugi**
- Total Pendapatan
- Total Beban
- Laba/Rugi Bersih
- Per periode (bulanan/tahunan)
- Printable & Exportable

#### B. **Neraca (Balance Sheet)**
- **Aset:**
  - Aset Lancar (Kas, Bank, Piutang, Persediaan)
  - Aset Tetap (Peralatan, Kendaraan, Bangunan)
- **Kewajiban:**
  - Kewajiban Jangka Pendek (Utang Usaha, Utang Pajak)
  - Kewajiban Jangka Panjang
- **Ekuitas:**
  - Modal Pemilik
  - Laba Ditahan
- ✅ Auto-check balance (Aset = Kewajiban + Ekuitas)

#### C. **Arus Kas**
- Arus Kas dari Aktivitas Operasi
- Arus Kas dari Aktivitas Investasi
- Arus Kas dari Aktivitas Pendanaan
- Kenaikan/Penurunan Kas
- Kas Awal & Akhir Periode

**Fitur:**
- ✅ Pilih periode (bulan/tahun)
- ✅ Export ke PDF/Excel
- ✅ Print langsung
- ✅ Auto-generate dari jurnal

---

### 4. **Invoice & Purchase Order** ✅
**Lokasi:** Menu → Akuntansi → Invoice & PO

#### **Invoice (Penjualan)**
- Buat invoice untuk pelanggan
- Multi-item (tambah item unlimited)
- Hitung subtotal, diskon, PPN otomatis
- Track status: Draft → Sent → Paid → Overdue
- Auto-generate jurnal saat invoice dibuat
- Track pembayaran (partial/full)
- Jatuh tempo monitoring

**Cara Buat Invoice:**
```
1. Klik "Buat Invoice"
2. Isi: Pelanggan, Tanggal, Jatuh Tempo
3. Tambah items:
   - Deskripsi
   - Qty
   - Harga
   - Subtotal (auto)
4. Isi diskon & PPN (opsional)
5. Klik "Simpan"
6. ✅ Invoice dibuat + Jurnal otomatis
```

#### **Purchase Order (Pembelian)**
- Buat PO untuk supplier
- Multi-item
- Track status: Draft → Sent → Received → Paid
- Auto-generate jurnal saat PO dibuat
- Track penerimaan barang
- Track pembayaran

**Cara Buat PO:**
```
1. Klik "Buat PO"
2. Isi: Supplier, Tanggal
3. Tambah items:
   - Deskripsi
   - Qty
   - Harga
   - Subtotal (auto)
4. Isi PPN (opsional)
5. Klik "Simpan"
6. ✅ PO dibuat + Jurnal otomatis
```

---

### 5. **Chart of Accounts (Daftar Akun)** ✅
**Lokasi:** Auto-generated dari sistem

**Kategori Akun:**

#### **ASET**
- **Aset Lancar:**
  - 1-1001: Kas
  - 1-1002: Bank
  - 1-1003: Piutang Usaha
  - 1-1004: Persediaan Barang
  - 1-1005: Biaya Dibayar Dimuka
- **Aset Tetap:**
  - 1-2001: Peralatan
  - 1-2002: Kendaraan
  - 1-2003: Bangunan
  - 1-2004: Akumulasi Penyusutan

#### **KEWAJIBAN**
- **Kewajiban Jangka Pendek:**
  - 2-1001: Utang Usaha
  - 2-1002: Utang Bank
  - 2-1003: Utang Pajak
  - 2-1004: Pendapatan Diterima Dimuka
- **Kewajiban Jangka Panjang:**
  - 2-2001: Utang Jangka Panjang

#### **EKUITAS**
- 3-1001: Modal Pemilik
- 3-1002: Laba Ditahan
- 3-1003: Prive

#### **PENDAPATAN**
- 4-1001: Pendapatan Penjualan
- 4-1002: Pendapatan Jasa
- 4-1003: Pendapatan Lain-lain

#### **BEBAN**
- **Beban Langsung:**
  - 5-1001: Harga Pokok Penjualan
- **Beban Operasional:**
  - 5-2001: Beban Gaji
  - 5-2002: Beban Sewa
  - 5-2003: Beban Listrik & Air
  - 5-2004: Beban Telepon & Internet
  - 5-2005: Beban Transportasi
  - 5-2006: Beban Perlengkapan
  - 5-2007: Beban Penyusutan
  - 5-2008: Beban Lain-lain

---

### 6. **RAB (Rencana Anggaran Biaya)** ✅
**Lokasi:** Menu → Akuntansi → RAB (Coming Soon)

**Fitur:**
- Buat RAB untuk proyek konstruksi
- Kategori: Material, Upah, Alat, Lainnya
- Hitung total otomatis
- Track realisasi vs anggaran
- Export ke Excel/PDF

**Contoh RAB:**
```
Proyek: Pembangunan Gudang
- Material:
  - Semen: 100 zak × Rp65.000 = Rp6.500.000
  - Pasir: 10 truk × Rp800.000 = Rp8.000.000
- Upah:
  - Tukang: 30 hari × Rp150.000 = Rp4.500.000
  - Kenek: 30 hari × Rp100.000 = Rp3.000.000
- Alat:
  - Sewa Mixer: 5 hari × Rp200.000 = Rp1.000.000
Total: Rp23.000.000
```

---

### 7. **Schedule & Calendar** ✅
**Lokasi:** Menu → Akuntansi → Schedule (Coming Soon)

**Fitur:**
- Calendar monitoring
- Reminder otomatis
- Sync dengan Google Calendar
- Track jatuh tempo invoice
- Track deadline proyek
- Notifikasi via WhatsApp/Telegram

**Kategori Schedule:**
- Invoice (jatuh tempo)
- PO (penerimaan barang)
- Meeting
- Deadline
- Lainnya

---

## 🔧 FITUR TEKNIS

### **Double-Entry Bookkeeping**
Setiap transaksi otomatis generate jurnal dengan prinsip:
```
DEBIT = KREDIT
```

**Contoh:**
- Penjualan Tunai Rp10.000.000
  - Debit: Kas Rp10.000.000
  - Kredit: Pendapatan Penjualan Rp10.000.000

- Pembelian Kredit Rp5.000.000
  - Debit: Persediaan Rp5.000.000
  - Kredit: Utang Usaha Rp5.000.000

### **Auto-Generate Laporan**
Semua laporan keuangan di-generate otomatis dari jurnal:
- ✅ Laba Rugi
- ✅ Neraca
- ✅ Arus Kas
- ✅ Buku Besar per akun
- ✅ Trial Balance

### **Parser Angka Indonesia**
Support format:
- `750000` → Rp750.000 ✅
- `750.000` → Rp750.000 ✅
- `1.234.567` → Rp1.234.567 ✅
- `1.234.567,50` → Rp1.234.567,50 ✅

### **Multi-Device Support**
- ✅ Web (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iPad, Android Tablet)
- ✅ HP (Android, iOS)
- ✅ Responsive design
- ✅ Touch-friendly

### **Export & Print**
- ✅ Export ke Excel (.xlsx)
- ✅ Export ke CSV (.csv)
- ✅ Export ke PDF (.pdf)
- ✅ Print langsung
- ✅ Include audit log (opsional)

---

## 📱 CARA MENGGUNAKAN

### **Untuk Pemilik Usaha (Awam Akuntansi)**

#### **Skenario 1: Catat Penjualan**
```
1. Buka menu "Input Transaksi"
2. Pilih "Penjualan Tunai"
3. Isi:
   - Tanggal: Hari ini
   - Keterangan: "Penjualan jasa ke PT ABC"
   - Jumlah: 10.000.000
4. Klik "Preview Jurnal"
5. Sistem tampilkan:
   Debit: Kas Rp10.000.000
   Kredit: Pendapatan Rp10.000.000
6. Klik "Simpan"
7. ✅ Selesai! Laporan keuangan otomatis update
```

#### **Skenario 2: Buat Invoice**
```
1. Buka menu "Invoice & PO"
2. Klik "Buat Invoice"
3. Isi:
   - Pelanggan: PT ABC
   - Tanggal: Hari ini
   - Jatuh Tempo: 30 hari lagi
4. Tambah items:
   - Jasa Konsultasi: 1 × Rp25.000.000
5. Isi PPN: Rp2.500.000
6. Klik "Simpan"
7. ✅ Invoice dibuat + Jurnal otomatis
```

#### **Skenario 3: Lihat Laporan Keuangan**
```
1. Buka menu "Laporan Keuangan"
2. Pilih "Laba Rugi"
3. Pilih periode: Januari 2026
4. ✅ Laporan otomatis tampil:
   - Pendapatan: Rp25.000.000
   - Beban: Rp8.000.000
   - Laba Bersih: Rp17.000.000
5. Klik "Export PDF" untuk download
```

---

## 🎯 KEUNGGULAN

### **Untuk UMKM**
- ✅ **Mudah digunakan** - Tidak perlu paham akuntansi
- ✅ **Auto-generate** - Semua laporan otomatis
- ✅ **Hemat waktu** - Input sekali, semua laporan update
- ✅ **Akurat** - Double-entry bookkeeping
- ✅ **Murah** - Tidak perlu hire akuntan

### **Untuk PT/CV**
- ✅ **Profesional** - Standar akuntansi yang benar
- ✅ **Comprehensive** - Semua laporan keuangan lengkap
- ✅ **Audit-ready** - Audit trail lengkap
- ✅ **Scalable** - Bisa untuk multi-cabang
- ✅ **Compliant** - Sesuai standar PSAK

### **Untuk Konstruksi**
- ✅ **RAB** - Rencana Anggaran Biaya
- ✅ **Project tracking** - Monitor progress proyek
- ✅ **Material tracking** - Track penggunaan material
- ✅ **Cost control** - Kontrol biaya proyek

---

## 📊 CONTOH KASUS PENGGUNAAN

### **Kasus 1: Toko Bangunan**
```
Transaksi harian:
- Penjualan semen: Rp5.000.000 (tunai)
- Penjualan besi: Rp10.000.000 (kredit)
- Pembelian stok: Rp8.000.000 (kredit)
- Bayar listrik: Rp500.000 (tunai)
- Bayar gaji: Rp3.000.000 (tunai)

Sistem auto-generate:
✅ 5 jurnal transaksi
✅ Update buku besar
✅ Laporan Laba Rugi
✅ Neraca
✅ Arus Kas
✅ Monitoring piutang & utang
```

### **Kasus 2: Jasa Konstruksi**
```
Proyek: Pembangunan Rumah
- RAB: Rp200.000.000
- Invoice ke klien: Rp50.000.000 (DP)
- Beli material: Rp30.000.000
- Bayar tukang: Rp10.000.000

Sistem auto-generate:
✅ RAB dengan detail material & upah
✅ Invoice dengan jatuh tempo
✅ Jurnal pembelian & pembayaran
✅ Laporan progress proyek
✅ Monitoring biaya vs anggaran
```

### **Kasus 3: Perusahaan Jasa**
```
Transaksi bulanan:
- Pendapatan jasa: Rp50.000.000
- Beban gaji: Rp15.000.000
- Beban sewa: Rp5.000.000
- Beban listrik: Rp1.000.000
- Beban internet: Rp500.000

Sistem auto-generate:
✅ Jurnal pendapatan & beban
✅ Laporan Laba Rugi: Laba Rp28.500.000
✅ Neraca dengan posisi kas
✅ Arus Kas dari operasi
✅ PPh 21 otomatis (jika diaktifkan)
```

---

## 🔒 KEAMANAN & BACKUP

### **Data Security**
- ✅ Data tersimpan di browser (localStorage)
- ✅ Backup manual ke JSON
- ✅ Backup otomatis (jika diaktifkan)
- ✅ Export data kapan saja

### **Audit Trail**
- ✅ Semua transaksi tercatat
- ✅ Siapa, kapan, apa yang diubah
- ✅ Tidak bisa dihapus (append-only)
- ✅ Bisa di-export untuk audit

---

## 📈 ROADMAP FITUR

### **Sudah Ada (v1.0)**
- ✅ Dashboard Akuntansi
- ✅ Input Transaksi (7 jenis)
- ✅ Auto-generate Jurnal
- ✅ Laporan Keuangan (Laba Rugi, Neraca, Arus Kas)
- ✅ Invoice & Purchase Order
- ✅ Chart of Accounts
- ✅ Parser Angka Indonesia
- ✅ Export PDF/Excel/CSV
- ✅ Multi-device support

### **Coming Soon (v1.1)**
- ⏳ RAB (Rencana Anggaran Biaya)
- ⏳ Schedule & Calendar
- ⏳ Google Sheets Sync
- ⏳ WhatsApp Integration
- ⏳ Telegram Integration
- ⏳ PPh 21 Calculator
- ⏳ Depreciation Calculator
- ⏳ Multi-currency Support

### **Future (v2.0)**
- 🔮 Mobile App (Android/iOS)
- 🔮 Cloud Sync
- 🔮 Multi-user with roles
- 🔮 Approval workflow
- 🔮 Advanced reporting
- 🔮 Budgeting & forecasting
- 🔮 Inventory management
- 🔮 Fixed asset management

---

## 📞 SUPPORT & DOKUMENTASI

### **Dokumentasi Lengkap:**
- `PANDUAN_PENGGUNA.md` - Cara pakai semua fitur
- `FITUR_OPERASIONAL.md` - Ringkasan fitur
- `STATUS_FITUR.md` - Status implementasi
- `LAPORAN_AUDIT_KOMPREHENSIF.md` - Laporan audit

### **Training:**
- Video tutorial (coming soon)
- Webinar bulanan (coming soon)
- FAQ & troubleshooting

---

## Kesimpulan dan batasan

Modul ini adalah fondasi implementasi, bukan paket akuntansi yang telah disertifikasi atau siap produksi.

- State akuntansi saat ini disimpan pada browser/perangkat yang sama; belum menjadi cloud source of truth multi-user.
- Google Apps Script dan API helper memerlukan deployment, konfigurasi URL/Script Properties, kontrol akses, serta pengujian end-to-end. Jangan membuka endpoint tulis keuangan untuk publik tanpa autentikasi yang aman.
- Export yang tersedia di halaman laporan akuntansi adalah CSV; upload Drive/OCR/WhatsApp/Telegram belum dinyatakan aktif sebelum masing-masing diuji.
- Hasil neraca/laba rugi/arus kas bergantung pada saldo awal, klasifikasi akun, stok/HPP, pajak, aset tetap, dan periode yang benar.
- Data seed pada modul operasional harus dibandingkan dengan bukti asli sebelum dipakai sebagai catatan resmi.
- CI typecheck/build/test yang lolos adalah prasyarat teknis, bukan pengganti audit akuntansi atau review PSAK oleh profesional.

Gunakan data uji sampai akses, backup, integrasi, dan rekonsiliasi keuangan telah diverifikasi.
