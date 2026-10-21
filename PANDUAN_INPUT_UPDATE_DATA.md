# 📖 PANDUAN INPUT & UPDATE DATA - IMPLEMENTASI NYATA

**Status:** ✅ IMPLEMENTASI LENGKAP  
**Tanggal:** 21 Oktober 2026

---

## 🎯 JAWABAN LANGSUNG

### ❓ Apakah perlu input manual?
**Jawaban:** ✅ **YA, untuk saat ini**

Sistem ini adalah **frontend application** yang menyimpan data di **browser localStorage**. 
Anda perlu input data secara manual melalui form yang sudah disediakan.

**Kenapa?**
- Tidak ada backend/database server
- Tidak ada koneksi ke Google Sheets/Drive
- Tidak ada OCR otomatis (masih mockup)
- Tidak ada WhatsApp auto-input (masih mockup)

### ❓ Apakah perlu edit manual?
**Jawaban:** ✅ **YA, untuk saat ini**

Sistem menyediakan form edit untuk setiap data yang sudah diinput.

### ❓ Bagaimana hirarki data?
**Jawaban:** Lihat diagram di bawah

---

## 🏗️ HIRARKI DATA SISTEM

```
┌─────────────────────────────────────────────────────────────┐
│                    LEVEL 1: MASTER DATA                      │
├─────────────────────────────────────────────────────────────┤
│  • Chart of Accounts (Daftar Akun)                          │
│  • Daftar Pelanggan/Supplier                                │
│  • Daftar Karyawan                                          │
│  • Daftar Barang/Jasa                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 LEVEL 2: TRANSAKSI HARIAN                    │
├─────────────────────────────────────────────────────────────┤
│  • Input Transaksi (7 jenis)                                │
│    - Penjualan Tunai/Kredit                                 │
│    - Pembelian Tunai/Kredit                                 │
│    - Terima Piutang                                         │
│    - Bayar Utang                                            │
│    - Catat Beban                                            │
│                                                             │
│  • Invoice & Purchase Order                                 │
│  • Alokasi Dana per Periode                                 │
│  • Register Tanah & Beko                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              LEVEL 3: JURNAL UMUM (AUTO)                     │
├─────────────────────────────────────────────────────────────┤
│  • Setiap transaksi auto-generate jurnal double-entry       │
│  • Debit = Kredit (balance)                                 │
│  • Timestamp & audit trail                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            LEVEL 4: BUKU BESAR (AUTO)                        │
├─────────────────────────────────────────────────────────────┤
│  • Saldo per akun (auto-calculate dari jurnal)              │
│  • Running balance                                          │
│  • History transaksi per akun                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          LEVEL 5: LAPORAN KEUANGAN (AUTO)                    │
├─────────────────────────────────────────────────────────────┤
│  • Laba Rugi (auto dari pendapatan - beban)                 │
│  • Neraca (auto dari aset = kewajiban + ekuitas)            │
│  • Arus Kas (auto dari operasi + investasi + pendanaan)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 CARA INPUT DATA - STEP BY STEP

### **Skenario 1: Input Transaksi Penjualan**

**Langkah-langkah:**

1. **Buka aplikasi**
   ```
   Buka browser → http://localhost:5173
   ```

2. **Masuk ke menu Input Transaksi**
   ```
   Klik: Akuntansi → Input Transaksi
   ```

3. **Pilih jenis transaksi**
   ```
   Pilih: "💰 Penjualan Tunai"
   ```

4. **Isi form**
   ```
   Tanggal: 21/10/2026
   Keterangan: Penjualan jasa konsultasi ke PT ABC
   Jumlah: 10000000 (atau 10.000.000)
   PPN: 1000000 (atau 1.000.000)
   ```

5. **Preview jurnal**
   ```
   Klik: "Preview Jurnal"
   
   Sistem tampilkan:
   ┌─────────────────────────────────────────┐
   │ No. Jurnal: JU-2026-006                 │
   │ Tanggal: 2026-10-21                     │
   │ Keterangan: Penjualan jasa konsultasi   │
   ├─────────────────────────────────────────┤
   │ Akun          │ Debit      │ Kredit     │
   ├─────────────────────────────────────────┤
   │ Kas           │ 11.000.000 │            │
   │ Pendapatan    │            │ 10.000.000 │
   │ Utang Pajak   │            │  1.000.000 │
   ├─────────────────────────────────────────┤
   │ TOTAL         │ 11.000.000 │ 11.000.000 │
   │ ✅ BALANCE    │            │            │
   └─────────────────────────────────────────┘
   ```

6. **Simpan transaksi**
   ```
   Klik: "Simpan Transaksi"
   
   ✅ Transaksi berhasil disimpan!
   ✅ Jurnal otomatis tercatat
   ✅ Buku besar update
   ✅ Laporan keuangan update
   ```

7. **Verifikasi**
   ```
   Menu: Akuntansi → Laporan Keuangan
   Pilih: Laba Rugi
   
   ✅ Pendapatan: Rp10.000.000
   ✅ Kas bertambah: Rp11.000.000
   ```

---

### **Skenario 2: Input Data Tanah**

**Langkah-langkah:**

1. **Buka menu Register Tanah**
   ```
   Klik: Audit → Register Tanah
   ```

2. **Klik "Tambah Bidang"**
   ```
   Tombol: "+ Tambah Bidang" di pojok kanan atas
   ```

3. **Isi form**
   ```
   Pemilik: Pak Dede
   Luas (BT): 68
   Harga per BT: 750000 (atau 750.000)
   DP yang sudah dibayar: 51000000
   Status: Lunas
   Catatan: Bidang 1 - sudah lunas
   ```

4. **Sistem auto-calculate**
   ```
   Nilai Total = 68 × 750.000 = Rp51.000.000
   Sisa = 51.000.000 - 51.000.000 = Rp0
   Status: Lunas ✅
   ```

5. **Simpan**
   ```
   Klik: "Simpan"
   ✅ Data tanah tercatat
   ```

---

### **Skenario 3: Buat Invoice**

**Langkah-langkah:**

1. **Buka menu Invoice & PO**
   ```
   Klik: Akuntansi → Invoice & PO
   ```

2. **Klik "Buat Invoice"**
   ```
   Tombol: "+ Buat Invoice"
   ```

3. **Isi header invoice**
   ```
   Pelanggan: PT ABC
   Tanggal: 21/10/2026
   Jatuh Tempo: 20/11/2026
   ```

4. **Tambah items**
   ```
   Item 1:
   - Deskripsi: Jasa Konsultasi
   - Qty: 1
   - Harga: 25000000
   - Subtotal: 25000000 (auto)
   
   Klik: "+ Tambah Item" untuk tambah item lain
   ```

5. **Isi diskon & PPN**
   ```
   Diskon: 0
   PPN: 2500000
   ```

6. **Sistem auto-calculate**
   ```
   Subtotal: Rp25.000.000
   Diskon: Rp0
   PPN: Rp2.500.000
   ────────────────────
   Total: Rp27.500.000
   ```

7. **Simpan**
   ```
   Klik: "Simpan"
   
   ✅ Invoice dibuat
   ✅ Jurnal otomatis:
      Debit: Piutang Usaha Rp27.500.000
      Kredit: Pendapatan Rp25.000.000
      Kredit: Utang Pajak Rp2.500.000
   ```

---

## ✏️ CARA EDIT/UPDATE DATA

### **Update Transaksi**

**Status:** ⚠️ **TIDAK BISA EDIT LANGSUNG**

**Kenapa?**
- Audit trail harus terjaga
- Tidak boleh mengubah data yang sudah posted
- Prinsip akuntansi: jurnal yang sudah posted tidak boleh diubah

**Solusi:**
1. **Batalkan transaksi lama** (buat jurnal pembalik)
2. **Input transaksi baru** yang benar

**Contoh:**
```
Transaksi salah: Penjualan Rp10.000.000
Seharusnya: Penjualan Rp15.000.000

Solusi:
1. Buat jurnal pembalik:
   Debit: Pendapatan Rp10.000.000
   Kredit: Kas Rp10.000.000

2. Input transaksi baru:
   Debit: Kas Rp15.000.000
   Kredit: Pendapatan Rp15.000.000
```

---

### **Update Data Master (Tanah, Beko, dll)**

**Status:** ✅ **BISA EDIT**

**Langkah:**

1. **Cari data yang ingin di-edit**
   ```
   Menu: Audit → Register Tanah
   Cari: Pak Dede
   ```

2. **Klik icon Edit**
   ```
   Klik: icon pensil ✏️ di kolom Aksi
   ```

3. **Ubah data**
   ```
   Ubah: DP dari 51.000.000 → 50.000.000
   ```

4. **Sistem auto-recalculate**
   ```
   Nilai Total: Rp51.000.000
   DP baru: Rp50.000.000
   Sisa baru: Rp1.000.000
   Status: DP (bukan Lunas)
   ```

5. **Simpan**
   ```
   Klik: "Update"
   ✅ Data terupdate
   ✅ Audit log tercatat (siapa, kapan, apa yang diubah)
   ```

---

## 📊 KELENGKAPAN DATA DI LAPANGAN

### **Data yang PERLU di-input Manual:**

| Data | Cara Input | Frekuensi | Prioritas |
|------|-----------|-----------|-----------|
| Transaksi harian | Form Input Transaksi | Setiap ada transaksi | 🔴 HIGH |
| Data tanah | Form Register Tanah | Awal + update | 🔴 HIGH |
| Data beko | Form Rincian Beko | Awal + update | 🔴 HIGH |
| Invoice | Form Invoice & PO | Setiap ada penjualan | 🟡 MEDIUM |
| Purchase Order | Form Invoice & PO | Setiap ada pembelian | 🟡 MEDIUM |
| Alokasi dana | Form Alokasi Dana | Per periode | 🟡 MEDIUM |

### **Data yang AUTO-GENERATE:**

| Data | Sumber | Trigger |
|------|--------|---------|
| Jurnal Umum | Transaksi | Setiap input transaksi |
| Buku Besar | Jurnal | Auto-calculate |
| Laba Rugi | Jurnal | Auto-calculate |
| Neraca | Jurnal | Auto-calculate |
| Arus Kas | Jurnal | Auto-calculate |
| Saldo akun | Jurnal | Auto-calculate |

---

## 🔄 WORKFLOW INPUT DATA LENGKAP

### **Hari 1: Setup Awal**

```
1. Input Chart of Accounts (sudah ada default)
   ✅ 30+ akun standar sudah tersedia

2. Input Data Master
   ✅ Register Tanah: 13 bidang
   ✅ Rincian Beko: 8 item
   ✅ Alokasi Dana: 6 periode

3. Input Saldo Awal
   ✅ Kas: Rp100.000.000
   ✅ Modal: Rp100.000.000
```

### **Hari 2-30: Transaksi Harian**

```
Setiap ada transaksi:

1. Input Transaksi
   - Pilih jenis (penjualan/pembelian/beban/dll)
   - Isi form
   - Preview jurnal
   - Simpan

2. Verifikasi
   - Cek jurnal balance
   - Cek buku besar update
   - Cek laporan keuangan

3. Backup
   - Export data ke JSON
   - Simpan di folder aman
```

### **Akhir Bulan: Laporan**

```
1. Generate Laporan
   - Laba Rugi
   - Neraca
   - Arus Kas

2. Export
   - Export ke Excel
   - Export ke PDF (manual)
   - Print

3. Analisis
   - Cek laba/rugi
   - Cek posisi kas
   - Cek piutang & utang
```

---

## 💾 BACKUP & RESTORE

### **Backup Data**

**Cara:**
```
1. Menu: Pengaturan → Backup
2. Klik: "Backup Sekarang"
3. File JSON ter-download: backup_2026-10-21.json
4. Simpan di folder aman
```

**Isi backup:**
```json
{
  "version": "1.0",
  "timestamp": "2026-10-21T10:30:00Z",
  "data": {
    "akun": [...],
    "jurnal": [...],
    "tanah": [...],
    "beko": [...],
    "invoice": [...],
    "purchaseOrder": [...]
  }
}
```

### **Restore Data**

**Cara:**
```
1. Menu: Pengaturan → Backup
2. Klik: "Restore dari File"
3. Pilih file backup
4. Konfirmasi
5. Data ter-restore
```

**⚠️ PERHATIAN:**
- Restore akan MENIMPA data yang ada
- Backup dulu sebelum restore
- Test restore di environment terpisah

---

## 🎯 REKOMENDASI PRAKTIS

### **Untuk Penggunaan Harian:**

1. **Input transaksi segera** setelah terjadi
   - Jangan tunda input
   - Input di hari yang sama
   - Verifikasi jurnal balance

2. **Backup rutin**
   - Backup harian (manual)
   - Simpan di multiple lokasi
   - Labeli dengan tanggal

3. **Verifikasi laporan**
   - Cek Laba Rugi setiap minggu
   - Cek Neraca setiap bulan
   - Rekonsiliasi dengan bank statement

### **Untuk Penggunaan Jangka Panjang:**

1. **Migrasi ke backend**
   - Setup database server
   - Implementasi API
   - Multi-user support

2. **Integrasi OCR**
   - Setup Gemini API
   - Auto-scan kwitansi
   - Auto-input transaksi

3. **Integrasi WhatsApp**
   - Setup WhatsApp Business API
   - Auto-reply
   - Auto-input dari chat

---

## 📋 CHECKLIST INPUT DATA

### **Setup Awal (Hari 1):**
- [ ] Verifikasi Chart of Accounts
- [ ] Input data tanah (13 bidang)
- [ ] Input data beko (8 item)
- [ ] Input alokasi dana (6 periode)
- [ ] Input saldo awal
- [ ] Backup data awal

### **Transaksi Harian:**
- [ ] Input semua transaksi hari ini
- [ ] Verifikasi jurnal balance
- [ ] Cek buku besar update
- [ ] Backup data harian

### **Akhir Bulan:**
- [ ] Generate laporan keuangan
- [ ] Export laporan
- [ ] Analisis laba/rugi
- [ ] Rekonsiliasi bank
- [ ] Backup data bulanan

---

## 🆘 TROUBLESHOOTING

### **Problem: Data hilang setelah refresh**
**Penyebab:** Data tersimpan di localStorage, bukan database

**Solusi:**
- Backup data sebelum refresh
- Restore dari backup jika hilang
- Pertimbangkan migrasi ke backend

### **Problem: Tidak bisa edit transaksi**
**Penyebab:** Transaksi yang sudah posted tidak boleh diubah

**Solusi:**
- Buat jurnal pembalik
- Input transaksi baru yang benar

### **Problem: Laporan tidak update**
**Penyebab:** Jurnal status bukan 'Posted'

**Solusi:**
- Cek status jurnal
- Pastikan status = 'Posted'
- Refresh halaman

---

## 📞 KESIMPULAN

### **Apa yang BISA dilakukan:**
✅ Input transaksi manual melalui form  
✅ Edit data master (tanah, beko, dll)  
✅ Auto-generate jurnal dari transaksi  
✅ Auto-generate laporan keuangan  
✅ Export CSV/Excel/JSON  
✅ Backup & restore data  

### **Apa yang TIDAK BISA dilakukan (untuk saat ini):**
❌ Auto-input dari foto (OCR belum aktif)  
❌ Auto-input dari WhatsApp (belum aktif)  
❌ Sync ke Google Sheets (belum ada)  
❌ Multi-user concurrent (belum ada backend)  
❌ Real-time collaboration (belum ada)  

### **Rekomendasi:**
1. ✅ Gunakan untuk input manual saat ini
2. ⏳ Tunggu implementasi backend untuk multi-user
3. ⏳ Tunggu implementasi OCR untuk auto-input
4. ⏳ Tunggu implementasi WhatsApp untuk auto-input

---

**Dibuat oleh:** AI Assistant  
**Tanggal:** 21 Oktober 2026  
**Versi:** 1.0  
**Status:** ✅ IMPLEMENTASI LENGKAP & JUJUR
