# Backend Google Apps Script + Google Sheets

Dokumen ini menjelaskan fondasi autentikasi dan sumber data utama pada branch `feat/erp-google-appsscript-ssot-20261024`.

## Komponen

- `google-apps-script/Code.gs`: login, sesi, role, pembacaan snapshot cloud, penyimpanan dengan pemeriksaan versi, dan audit aktivitas backend.
- `google-apps-script/Bridge.html`: bridge `google.script.run` yang hanya menerima daftar metode yang diizinkan dan origin induk dari allowlist.
- `ERP_STATE`: snapshot canonical aplikasi yang disimpan dalam potongan 40.000 karakter per baris agar tidak bergantung pada satu sel Google Sheets.
- `ERP_META`: versi snapshot yang saat ini aktif.
- `USERS` dan `SESSIONS`: akun, hash kata sandi, sesi yang kedaluwarsa/dicabut.
- `BACKEND_AUDIT`: log aktivitas server yang ditulis oleh backend; tidak menjadi bagian dari data yang boleh diubah browser.

Browser `localStorage` hanya cache. Setelah login, cache dibersihkan lalu diisi dari snapshot cloud. Jika penyimpanan gagal atau versi berubah karena perangkat lain, UI menghentikan input sampai pengguna memuat ulang data cloud.

## Setup sekali untuk administrator

1. Buat atau pilih Google Spreadsheet khusus ERP. Jangan gunakan spreadsheet umum yang dibagikan ke publik.
2. Buka **Extensions → Apps Script**. Salin isi `google-apps-script/Code.gs` ke file `Code.gs`, lalu buat file HTML bernama **Bridge** dan salin `google-apps-script/Bridge.html`. Salin juga manifest `google-apps-script/appsscript.json` ke Project Settings jika editor memerlukan scope eksplisit.
3. Buka **Project Settings → Script Properties** dan isi:
   - `SPREADSHEET_ID`: ID spreadsheet ERP.
   - `ERP_BOOTSTRAP_CODE`: kode aktivasi satu kali yang panjang dan acak, minimal 32 karakter. Jangan taruh kode ini di source code atau file environment frontend.
   - `ALLOWED_APP_ORIGINS`: origin persis frontend, misalnya `https://nama-aplikasi.pages.dev`. Untuk development tambahkan `http://localhost:5173` dipisah koma. Jangan gunakan `*`.
4. Jalankan fungsi `setupDatabase()` dari Apps Script editor satu kali jika workbook perlu tabel akuntansi lama seperti AKUN. Berikan izin saat Google meminta otorisasi. Tabel `USERS`, `SESSIONS`, `ERP_META`, `ERP_STATE`, dan `BACKEND_AUDIT` dibuat backend saat bootstrap.
5. Klik **Deploy → New deployment → Web app**. Pilih execute as pemilik/deployer agar server bisa menulis ke spreadsheet. Untuk frontend eksternal, akses web app harus memungkinkan iframe bridge dimuat; data tidak diberikan oleh endpoint GET publik dan seluruh metode aplikasi memerlukan sesi ERP. Origin parent juga diperiksa against `ALLOWED_APP_ORIGINS`. Simpan URL berakhiran `/exec`.
6. Pada hosting frontend, set environment build `VITE_GAS_WEBAPP_URL` ke URL deployment tersebut, lalu build/deploy web.
7. Buka aplikasi. Pilih **Setup Admin Pertama**, masukkan kode aktivasi, email, nama, dan kata sandi minimal 12 karakter. Server menghapus `ERP_BOOTSTRAP_CODE` setelah berhasil agar bootstrap tidak bisa digunakan ulang.
8. Buat akun lain dari menu **Manajemen User**. Status nonaktif mencabut sesi aktif user tersebut. Gunakan role sesuai tugas, bukan dengan mengganti mode tampilan di browser.

## Impor data browser lama

Setup admin menyediakan opsi **Impor data lama dari browser ini** bila data lokal ditemukan. Opsi ini tidak dipilih otomatis. Aktifkan hanya setelah memastikan browser tersebut memuat data proyek yang benar. Setelah bootstrap, cloud menjadi sumber utama. Data dari browser/perangkat lain tidak otomatis digabungkan.

## Kebijakan konflik dan akses

- Role server: `ADMIN`, `KEUANGAN`, `PROYEK`, `VIEWER`.
- `VIEWER` bersifat read-only dan hanya menerima subset data progress tanah/beko yang sudah direduksi.
- `KEUANGAN` dapat mengubah bagian keuangan dan akuntansi yang diizinkan server.
- `PROYEK` dapat mengubah subset operasional proyek yang diizinkan server.
- Setiap penyimpanan mengirim `expectedVersion`. Jika versi cloud telah berubah, backend menolak simpan; tidak melakukan last-write-wins.
- Kata sandi tidak disimpan sebagai teks biasa. Server menyimpan salt dan hash berulang; sesi menyimpan hash token, bukan token mentah.
- `BACKEND_AUDIT` mencatat login/logout, bootstrap, perubahan user, dan penulisan snapshot.
- Endpoint GET yang dulu mengembalikan transaksi/neraca tanpa login sudah dinonaktifkan.

## Status integrasi yang belum boleh dianggap aktif

**OCR, webhook WhatsApp/Telegram, dan route transaksi/reversal lama sengaja fail-closed pada tahap ini.** Kode lamanya menulis ke `BUKU_KAS`, `JURNAL`, atau `ARSIP_BUKTI` secara terpisah dari snapshot canonical `ERP_STATE`. Mengaktifkannya sebelum membuat adapter penulisan ke sumber data utama berisiko menciptakan dua ledger. Jangan mendaftarkan webhook atau mengisi secret webhook sampai adapter itu dibuat dan diuji.

Google Drive sebagai penyimpanan lampiran, OCR ke antrean persetujuan, dan sinkronisasi data antar-modul masih perlu dihubungkan melalui API canonical. File ini tidak menyatakan integrasi tersebut sudah aktif.

## Uji sebelum rilis

Jalankan CI pada pull request: `npm ci`, pemeriksaan TypeScript, pemeriksaan sintaks Apps Script, `npm test`, dan `npm run build`. Setelah deploy Apps Script, lakukan smoke test melalui aplikasi: bootstrap admin, logout/login, buat/nonaktifkan user uji, ubah transaksi dengan dua sesi, pastikan versi konflik menolak simpan, dan pastikan viewer tidak memperoleh data akuntansi.

## Kuota

Apps Script dan Google Sheets tersedia tanpa biaya lisensi tambahan untuk penggunaan standar, tetapi tetap memiliki batas harian dan batas waktu eksekusi. Periksa kuota aktual akun Google sebelum mengandalkan sistem untuk penggunaan produksi berintensitas tinggi.
