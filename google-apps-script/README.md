# Backend cloud ERP — Google Apps Script + Sheets

Dokumen ini menjelaskan setup fondasi autentikasi dan sumber data tunggal. Jangan menyatakan integrasi sebagai aktif sampai uji dua akun/perangkat dan uji negatif berhasil.

## Arsitektur sekarang

- **React**: antarmuka web/panel dan form transaksi.
- **Google Apps Script**: server dan gerbang API. Akses data lewat fungsi `api*`, dengan token Google diverifikasi ulang di server.
- **Google Sheets privat**: penyimpanan workspace, pengguna, membership, snapshot berversi, serta audit peristiwa backend.
- **Google Identity Services**: login akun Google. Email harus verified, audience harus cocok dengan OAuth client ID, dan akun mesti ada di allowlist pengguna.
- **Snapshot cloud**: satu dokumen JSON untuk store operasional dan akuntansi, dipecah ke beberapa baris/sel agar tidak melampaui batas ukuran sel. Maksimum snapshot saat ini 2 MB; histori snapshot lama dipangkas menjadi beberapa versi.
- **Konflik perangkat**: backend memakai ScriptLock dan expected version. Versi yang kedaluwarsa ditolak, bukan menimpa perubahan perangkat lain diam-diam.
- **Lampiran**: berkas IndexedDB yang sudah ada masih lokal ke browser dan tidak dipindahkan oleh snapshot.

Google Apps Script/Sheets memiliki kuota; ini bukan penyimpanan tanpa batas dan bukan database relasional. Jika volume, user serentak atau kompleksitas transaksi membesar, skema row-based/DB khusus bisa dievaluasi kemudian tanpa mengubah cara pengguna bekerja.

## Setup produksi pertama kali

### 1. Buat spreadsheet database privat
1. Buat Google Sheet baru dari akun pemilik sistem.
2. Salin Spreadsheet ID dari URL (`/spreadsheets/d/ID/edit`).
3. Jangan membagikan spreadsheet database ini kepada operator biasa. Mereka harus mengakses data melalui aplikasi.

Sheet backend `ERP_USERS`, `ERP_WORKSPACES`, `ERP_WORKSPACE_MEMBERS`, `ERP_STATE_CHUNKS`, dan `ERP_AUDIT_LOG` dibuat otomatis saat API pertama kali digunakan.

### 2. Buat proyek Apps Script
1. Buka [script.google.com](https://script.google.com) dan buat project.
2. Tambahkan file `Code.gs`, `CloudWorkspace.gs`, `Index.html` dari folder ini. Salin isi file dengan nama yang tepat.
3. Pasang isi `appsscript.json` dari folder ini lewat Project Settings → “Show appsscript.json manifest file”.
4. Pada Project Settings → Script Properties, tambahkan:

| Property | Nilai |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet database privat |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth 2.0 Client ID tipe Web application |
| `ADMIN_EMAILS` | Email admin pertama, dapat dipisah koma |
| `ERP_FRONTEND_URL` | URL HTTPS frontend React yang akan dimuat di dalam web app |

`GOOGLE_OAUTH_CLIENT_ID` adalah identifier publik OAuth client, bukan secret. Jangan menaruh OAuth client secret, token bot, atau API key di frontend. Jangan set `ERP_WEBHOOKS_ENABLED` untuk mengaktifkan handler legacy; WhatsApp/Telegram tetap tertutup.

### 3. Siapkan Google OAuth
1. Buka Google Cloud Console project yang sesuai.
2. Konfigurasi OAuth consent screen/Google Auth platform sesuai penggunaan internal atau eksternal.
3. Buat OAuth Client ID dengan tipe **Web application**.
4. Masukkan origin frontend React (tanpa path) di “Authorized JavaScript origins”; contohnya `https://contoh.pages.dev`. Set build variable `VITE_GOOGLE_APPS_SCRIPT_WEBAPP_URL` ke URL deployment Apps Script `/exec` yang tepat. Bridge menolak deployment Apps Script lain agar parent yang tidak dipercaya tidak dapat menangkap token login.
5. Salin Client ID ke Script Property `GOOGLE_OAUTH_CLIENT_ID`.
6. Gunakan Google Identity Services pada frontend; ID token dikirim ke Apps Script dan diverifikasi server. Jangan gunakan email dari input user sebagai bukti identitas.

Jika project Google belum terverifikasi untuk audiens publik, hanya pengguna yang diizinkan sesuai status OAuth consent screen yang dapat login.

### 4. Deploy Apps Script web app
1. Deploy → New deployment → **Web app**.
2. **Execute as:** akun pemilik/deployer (Me).
3. Access: setelan yang memungkinkan halaman wrapper diakses, karena otorisasi data dilakukan pada fungsi API dengan verifikasi Google ID token dan allowlist server. Jangan memberi akses edit ke spreadsheet database.
4. Simpan URL deployment `/exec` dan buka URL itu untuk pemakaian.
5. Jangan gunakan URL frontend React langsung sebagai rute produksi; aplikasi menolaknya untuk mencegah akses tanpa backend.

Endpoint REST lama `/transaksi`, `/akun`, dan laporan ditolak. Fungsi `doPost` menolak perubahan dan webhook lama. Itu disengaja: data tidak boleh masuk ke penyimpanan lama yang belum mengikat transaksi ke workspace cloud.

### 5. Inisialisasi dan tambah user
1. Login memakai Google account yang emailnya ada di `ADMIN_EMAILS`.
2. Admin pertama otomatis ditambahkan ke `ERP_USERS` saat login berhasil pertama kali.
3. Buat workspace kosong (disarankan untuk smoke test) atau pilih impor data browser setelah mengunduh backup dan memeriksa record historis. File lampiran IndexedDB tidak termasuk backup JSON.
4. Dari Manajemen User, tambahkan email Google pengguna dan role: `ADMIN`, `KEUANGAN`, `PROYEK`, atau `VIEWER`.
5. Pengguna tersebut harus login dengan akun Google yang sama. Role dan membership diperiksa server, tidak bisa diubah dari tombol di browser.

## Uji wajib sebelum menyimpan data produksi
- Login email yang tidak ada di `ERP_USERS` ditolak.
- Token dengan audience/client ID berbeda, kedaluwarsa, atau email yang belum verified ditolak.
- User `VIEWER` tidak bisa menyimpan.
- User `KEUANGAN` ditolak saat mencoba mengubah modul proyek yang tidak diizinkan; user `PROYEK` ditolak untuk modul keuangan.
- Pengguna workspace lain tidak bisa memuat atau menulis workspace tanpa membership.
- Dua tab/perangkat dengan versi sama: simpan pertama menaikkan versi; penyimpanan kedua ditolak sebagai conflict.
- Snapshot korup/incomplete/checksum tidak cocok ditolak tanpa mengubah versi aktif.
- Data lokal yang belum sinkron/korup diminta backup sebelum cache diganti.
- Jalankan `npm ci`, `npm run typecheck`, `npm test`, dan `npm run build`.

## Batas fungsional yang masih berlaku
Tahap ini **tidak** mengaktifkan Google Drive attachment upload, Sheets row-per-transaction reporting, Gemini Vision OCR live, WhatsApp Cloud API, Telegram webhook, DOCX atau native XLSX. Endpoint chat sengaja menolak request sampai autentikasi pengirim, idempotency, attachment download, pemetaan workspace, dan pencatatan ke snapshot kanonis diimplementasikan. Jangan menggunakan tombol integrasi seolah sudah terkoneksi.

Snapshot JSON adalah tahap migrasi untuk menyatukan dua store browser agar tidak memakai dua sumber cloud. Untuk laporan besar, audit row-per-event, dan transaksi bersamaan yang tinggi, data akan perlu dipindahkan bertahap ke tabel terstruktur dengan ID/foreign key serta RPC server yang menjaga debit-kredit, bukti, status, dan reversal secara atomik.

Untuk kegagalan/konflik, simpan backup JSON sebelum reload. Jangan memaksa overwrite versi cloud. Cadangan biasa tidak mencakup lampiran IndexedDB.


## Quality gate CI
Workflow `.github/workflows/google-cloud-ssot.yml` memeriksa Apps Script syntax, TypeScript, tes regression accounting + cloud backend, dan production build menggunakan Node.js 22. Status workflow tetap harus dilihat di GitHub Actions; menambahkan file workflow tidak berarti tes sudah lulus.
