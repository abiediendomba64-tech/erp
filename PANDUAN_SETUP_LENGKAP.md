# 🚀 PANDUAN SETUP - FULL GOOGLE STACK

**Status:** 🎯 READY TO IMPLEMENT  
**Waktu Setup:** 2-3 jam  
**Biaya:** Rp0 (100% Gratis)

---

## 📋 CHECKLIST PRE-REQUISITES

### **Yang Anda Butuhkan:**
- [x] ✅ Akun Google (Gmail)
- [x] ✅ Browser (Chrome/Firefox)
- [x] ✅ Text editor (VS Code/Notepad++)
- [x] ✅ 2-3 jam waktu

### **Yang Akan Anda Dapatkan:**
- ✅ Backend API (Google Apps Script)
- ✅ Database (Google Sheets)
- ✅ OCR (Gemini API)
- ✅ File Storage (Google Drive)
- ✅ Frontend (React App - sudah ada)

---

## 🎯 TAHAP 1: SETUP GOOGLE CLOUD PROJECT

### **Langkah 1.1: Buat Google Cloud Project**

1. Buka https://console.cloud.google.com/
2. Login dengan akun Google
3. Klik dropdown project di pojok kiri atas
4. Klik **"NEW PROJECT"**
5. Isi:
   - **Project name:** `ERP-Akuntansi-UMKM`
   - **Organization:** Pilih akun Anda
   - **Location:** No organization (untuk gratis)
6. Klik **"CREATE"**
7. Tunggu project dibuat (1-2 menit)

### **Langkah 1.2: Enable APIs**

1. Di project yang baru dibuat, buka menu **☰ → APIs & Services → Library**
2. Search dan enable API berikut:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**
   - ✅ **Firebase Firestore API** (opsional)
   - ✅ **Cloud Vision API** (opsional)

3. Untuk setiap API:
   - Klik API name
   - Klik **"ENABLE"**
   - Tunggu sampai enabled

---

## 🎯 TAHAP 2: SETUP GOOGLE SHEETS DATABASE

### **Langkah 2.1: Buat Google Sheets**

1. Buka https://sheets.google.com
2. Klik **"+ Blank spreadsheet"**
3. Beri nama: **"ERP-Akuntansi-Database"**
4. Copy **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
                                      ^^^^^^^^^^^^^^^^^^^^^^^^
                                      Ini ID yang dibutuhkan
   ```

### **Langkah 2.2: Setup Sheets Structure**

Buat 4 sheet dengan struktur berikut:

#### **Sheet 1: Transaksi**
| id | tanggal | jenis | keterangan | jumlah | ppn | pihak | referensi | created_at | created_by |
|----|---------|-------|------------|--------|-----|-------|-----------|------------|------------|
| TRX-1234567890 | 2026-10-21 | penjualan_tunai | Penjualan jasa | 10000000 | 1000000 | PT ABC | INV-001 | 2026-10-21T10:00:00Z | Admin |

#### **Sheet 2: Jurnal**
| transaksi_id | akun_kode | akun_nama | debit | kredit | created_at |
|--------------|-----------|-----------|-------|--------|------------|
| TRX-1234567890 | 1-1001 | Kas | 11000000 | 0 | 2026-10-21T10:00:00Z |
| TRX-1234567890 | 4-1001 | Pendapatan Penjualan | 0 | 10000000 | 2026-10-21T10:00:00Z |
| TRX-1234567890 | 2-1003 | Utang Pajak | 0 | 1000000 | 2026-10-21T10:00:00Z |

#### **Sheet 3: Akun**
| kode | nama | tipe | kategori | saldo_normal | saldo |
|------|------|------|----------|--------------|-------|
| 1-1001 | Kas | Aset | Aset Lancar | Debit | 0 |
| 1-1002 | Bank | Aset | Aset Lancar | Debit | 0 |
| 1-1003 | Piutang Usaha | Aset | Aset Lancar | Debit | 0 |
| ... | ... | ... | ... | ... | ... |

#### **Sheet 4: Master**
| type | id | nama | data_json | created_at |
|------|----|----|-----------|------------|
| pelanggan | CUST-001 | PT ABC | {"alamat":"Jakarta","telp":"021-12345678"} | 2026-10-21T10:00:00Z |
| supplier | SUP-001 | Toko XYZ | {"alamat":"Bandung","telp":"022-87654321"} | 2026-10-21T10:00:00Z |

### **Langkah 2.3: Share Sheets**

1. Klik tombol **"Share"** di pojok kanan atas
2. Klik **"Get link"**
3. Ubah ke **"Anyone with the link"** → **"Viewer"**
4. Klik **"Copy link"**
5. Klik **"Done"**

**⚠️ PENTING:** Sheets harus di-share agar bisa diakses oleh Apps Script

---

## 🎯 TAHAP 3: SETUP GOOGLE APPS SCRIPT

### **Langkah 3.1: Buat Apps Script Project**

1. Buka https://script.google.com
2. Klik **"New project"**
3. Beri nama: **"ERP-Akuntansi-Backend"**
4. Hapus kode default di `Code.gs`
5. Copy-paste kode dari file `google-apps-script/Code.gs`

### **Langkah 3.2: Konfigurasi**

Di file `Code.gs`, ganti:
```javascript
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
```

Dengan:
```javascript
const SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'; // Ganti dengan ID Anda
const GEMINI_API_KEY = 'AIzaSy...'; // Ganti dengan API key Anda
```

### **Langkah 3.3: Setup Database**

1. Di Apps Script, pilih function **`setupDatabase`** dari dropdown
2. Klik **"Run"**
3. Authorize akses (klik "Review permissions" → pilih akun → "Allow")
4. Tunggu sampai selesai
5. Cek Google Sheets → 4 sheet sudah terbuat

### **Langkah 3.4: Deploy sebagai Web App**

1. Klik **"Deploy"** → **"New deployment"**
2. Klik icon ⚙️ → Pilih **"Web app"**
3. Isi:
   - **Description:** `ERP Backend API v1`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone`
4. Klik **"Deploy"**
5. Copy **Web app URL**:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

**⚠️ PENTING:** Simpan URL ini, akan digunakan di frontend

### **Langkah 3.5: Test API**

Buka browser dan akses:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?path=/transaksi
```

Jika berhasil, akan muncul JSON array kosong: `[]`

---

## 🎯 TAHAP 4: SETUP GEMINI API KEY

### **Langkah 4.1: Dapatkan API Key**

1. Buka https://aistudio.google.com/app/apikey
2. Login dengan akun Google
3. Klik **"Create API key"**
4. Pilih project yang sudah dibuat
5. Copy API key:
   ```
   AIzaSy...
   ```

### **Langkah 4.2: Test API Key**

1. Buka https://aistudio.google.com/app/prompts/new-chat
2. Upload foto kwitansi
3. Prompt: "Ekstrak data dari kwitansi ini dalam format JSON"
4. Cek hasil

### **Langkah 4.3: Masukkan API Key ke Apps Script**

Di file `Code.gs`:
```javascript
const GEMINI_API_KEY = 'AIzaSy...'; // Paste API key Anda
```

---

## 🎯 TAHAP 5: UPDATE FRONTEND

### **Langkah 5.1: Buat API Service**

Buat file baru: `src/services/api.ts`

```typescript
const API_BASE_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

export const api = {
  // Transaksi
  async getTransaksi() {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi`);
    return response.json();
  },

  async addTransaksi(transaksi: any) {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi`, {
      method: 'POST',
      body: JSON.stringify(transaksi)
    });
    return response.json();
  },

  async updateTransaksi(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async deleteTransaksi(id: string) {
    const response = await fetch(`${API_BASE_URL}?path=/transaksi/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // OCR
  async scanKwitansi(imageUrl: string) {
    const response = await fetch(`${API_BASE_URL}?path=/ocr`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl })
    });
    return response.json();
  },

  // Laporan
  async getLabaRugi() {
    const response = await fetch(`${API_BASE_URL}?path=/laporan/laba-rugi`);
    return response.json();
  },

  async getNeraca() {
    const response = await fetch(`${API_BASE_URL}?path=/laporan/neraca`);
    return response.json();
  },

  // Akun
  async getAkun() {
    const response = await fetch(`${API_BASE_URL}?path=/akun`);
    return response.json();
  }
};
```

### **Langkah 5.2: Update Komponen**

Update `src/pages/InputTransaksiPage.tsx`:

```typescript
import { api } from '../services/api';

// Ganti localStorage dengan API call
const handleSubmit = async () => {
  try {
    const result = await api.addTransaksi(formData);
    if (result.success) {
      alert('Transaksi berhasil disimpan!');
      // Reload data
      const transaksi = await api.getTransaksi();
      // Update UI
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
};
```

---

## 🎯 TAHAP 6: TESTING

### **Test 1: Input Transaksi**

1. Buka aplikasi React
2. Menu: Akuntansi → Input Transaksi
3. Isi form:
   - Tanggal: 21/10/2026
   - Jenis: Penjualan Tunai
   - Keterangan: Test transaksi
   - Jumlah: 10000000
   - PPN: 1000000
4. Klik "Simpan"
5. ✅ Cek Google Sheets → Sheet Transaksi → Data masuk
6. ✅ Cek Sheet Jurnal → 3 baris jurnal terbuat

### **Test 2: OCR**

1. Upload foto kwitansi ke Google Drive
2. Copy link file (share as "Anyone with the link")
3. Di aplikasi, klik "Scan Kwitansi"
4. Paste link foto
5. Klik "Scan"
6. ✅ Hasil OCR muncul (penerima, nominal, tanggal)

### **Test 3: Laporan**

1. Menu: Akuntansi → Laporan Keuangan
2. Pilih: Laba Rugi
3. ✅ Data muncul dari API (bukan localStorage)

---

## 📊 MONITORING & MAINTENANCE

### **Monitoring Kuota:**

1. **Apps Script:**
   - Buka https://script.google.com
   - Menu: **Executions** → Lihat usage

2. **Gemini API:**
   - Buka https://aistudio.google.com
   - Menu: **Quota** → Lihat usage

3. **Google Sheets:**
   - Buka Sheets
   - Menu: **File → Version history** → Lihat perubahan

### **Backup:**

1. **Google Sheets:**
   - Auto-backup oleh Google
   - Manual: File → Download → Excel/CSV

2. **Apps Script:**
   - Menu: File → Make a copy

3. **Frontend:**
   - Git repository
   - Export data ke JSON

---

## 🆘 TROUBLESHOOTING

### **Problem 1: "Script function not found"**
**Solusi:**
- Cek nama function di Apps Script
- Pastikan function `doGet`, `doPost`, `doPut`, `doDelete` ada

### **Problem 2: "Authorization required"**
**Solusi:**
- Klik "Review permissions"
- Pilih akun Google
- Klik "Allow"

### **Problem 3: "Spreadsheet not found"**
**Solusi:**
- Cek SPREADSHEET_ID sudah benar
- Pastikan Sheets sudah di-share ke "Anyone with the link"

### **Problem 4: "API key not valid"**
**Solusi:**
- Cek GEMINI_API_KEY sudah benar
- Pastikan API key aktif
- Cek quota masih ada

### **Problem 5: "CORS error" di frontend**
**Solusi:**
- Apps Script sudah handle CORS otomatis
- Pastikan deploy sebagai "Anyone has access"

---

## 📚 RESOURCES

### **Dokumentasi:**
- [Google Apps Script](https://developers.google.com/apps-script)
- [Gemini API](https://ai.google.dev/docs)
- [Google Sheets API](https://developers.google.com/sheets/api)

### **Template Files:**
- `google-apps-script/Code.gs` - Backend API
- `src/services/api.ts` - Frontend API service
- `ROADMAP_FULL_GOOGLE_STACK.md` - Roadmap lengkap

### **Contoh Penggunaan:**
- Input transaksi: `api.addTransaksi({...})`
- Scan kwitansi: `api.scanKwitansi(imageUrl)`
- Get laporan: `api.getLabaRugi()`

---

## 🎉 KESIMPULAN

### **Yang Sudah Selesai:**
✅ Backend API (Google Apps Script)  
✅ Database (Google Sheets)  
✅ OCR (Gemini API)  
✅ Frontend integration  
✅ Testing guide  
✅ Troubleshooting guide  

### **Next Steps:**
1. ⏳ Setup Google Cloud Project (30 menit)
2. ⏳ Setup Google Sheets (30 menit)
3. ⏳ Setup Apps Script (1 jam)
4. ⏳ Setup Gemini API (30 menit)
5. ⏳ Update frontend (1 jam)
6. ⏳ Testing (30 menit)

**Total Waktu:** 4-5 jam  
**Total Biaya:** Rp0

---

**Quote:**  
*"Dengan Google Stack gratis, Anda bisa membangun sistem enterprise tanpa biaya enterprise."*

---

**Dibuat oleh:** AI Assistant  
**Tanggal:** 21 Oktober 2026  
**Versi:** 1.0  
**Status:** 🎯 READY TO IMPLEMENT
