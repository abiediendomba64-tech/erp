# Setup backend Google Apps Script ERP

Dokumen ini adalah panduan setup untuk branch `feat/erp-google-apps-script-backend-20261024`. Kode belum dideploy ke akun Google dan belum diuji end-to-end pada proyek nyata. Jangan menaruh data finansial asli sebelum checklist di bagian akhir lulus.

## Arsitektur dan batas fase ini

- **Google Sign-In** memberikan identitas awal. Backend memeriksa ID token terhadap OAuth Client ID, issuer, masa berlaku, dan email terverifikasi.
- **USERS** pada Google Sheets menyimpan akun yang boleh masuk serta role `ADMIN`, `KEUANGAN`, `PROYEK`, atau `VIEWER`. Role selalu dicek lagi di server.
- **ERP_STATE** adalah penyimpanan kanonis berversi untuk array modul. Setiap record disimpan sebagai JSON pada kolom `payload_json`; ini bukan proyeksi tabular per-field. Tab rinci `BUKU_KAS`, `TANAH`, `BEKO`, jurnal, dan laporan belum seluruhnya dijadikan proyeksi tersinkron dari `ERP_STATE`.
- **AUDIT_LOG** merekam bootstrap dan simpan modul melalui server. Audit per-field/per-transaksi dan API posting atomik belum selesai.
- **INBOX_OCR** menerima metadata event dari n8n/provider dengan secret. Event berstatus `RECEIVED` belum otomatis menjadi transaksi, bukti terverifikasi, atau jurnal.
- **OCR dan upload Drive** tersedia sebagai operasi backend draf, tetapi wiring ke semua UI belum selesai.

Jangan menganggap fase ini sebagai ERP keuangan production-ready, jurnal per transaksi belum semua berjalan di server, dan backup file IndexedDB belum otomatis disalin ke Drive.

## 1. Buat project Apps Script

1. Buka https://script.google.com lalu buat project baru. Bisa pula membuka Extensions → Apps Script pada spreadsheet uji yang memang akan dipakai.
2. Buat/isi file:
   - `Code.gs` — salin dari file dalam folder ini.
   - `Bridge.html` — salin file bridge.
   - `appsscript.json` — aktifkan **Show appsscript.json manifest file** di Project Settings, lalu salin manifest.
3. Pastikan zona waktu `Asia/Jakarta`.
4. Jalankan fungsi `setupErpBackend` dari Apps Script editor. Berikan izin yang diminta.
5. Periksa hasilnya pada Execution log. Fungsi mengembalikan spreadsheet URL/ID dan menyiapkan tab `USERS`, `ERP_STATE`, `INBOX_OCR`, serta `AUDIT_LOG`. Bila tidak ada spreadsheet yang dikonfigurasi atau terikat, fungsi membuat spreadsheet baru.
6. **Periksa ID sebelum melanjutkan.** Backend mengenali Script Property lama `SPREADSHEET_ID` sebagai fallback. Bila property tersebut mengarah ke database lama, pastikan itu memang target yang dikehendaki. Jangan menghapus sheet lama.

## 2. Set Script Properties

Buka **Project Settings → Script Properties**. Isi:

| Property | Wajib? | Isi |
|---|---|---|
| `ERP_GOOGLE_CLIENT_ID` | Ya | OAuth Web Client ID yang sama dengan environment frontend |
| `ERP_BOOTSTRAP_ADMIN_EMAIL` | Ya untuk admin pertama | Email Google admin yang Anda kendalikan, huruf kecil |
| `ERP_ALLOWED_ORIGINS` | Ya | Origin persis panel web, dipisah koma; tanpa path atau slash akhir |
| `ERP_SPREADSHEET_ID` | Opsional | ID spreadsheet yang sudah Anda pilih sebagai target |
| `ERP_SESSION_SECRET` | Dibuat otomatis | Jangan dibagikan; `setupErpBackend()` menyiapkannya |
| `ERP_INGEST_SECRET` | Dibuat otomatis | Rahasia untuk ingress dari n8n; jangan pernah kirim ke browser |
| `GEMINI_API_KEY` | Opsional | Diperlukan untuk fungsi OCR Gemini |
| `ERP_GEMINI_MODEL` | Opsional | Model ID yang tersedia untuk akun Anda, misalnya `gemini-3.8-flash` |
| `ERP_DRIVE_FOLDER_ID` | Opsional | Folder ID khusus bukti. Jika kosong, fungsi upload dapat membuat folder |
| `ERP_WHATSAPP_VERIFY_TOKEN` | Opsional | Token verifikasi GET dari provider bila memakai handshake WhatsApp |

`setupErpBackend()` membuat `ERP_SESSION_SECRET` dan `ERP_INGEST_SECRET` bila belum ada. Nilai rahasia tersimpan di Script Properties; jangan meletakkannya dalam `src/`, file `.env` frontend, issue publik, atau repo.

## 3. Siapkan Google Identity Services

1. Pada Google Cloud Console, pilih/buat project dan buat OAuth Client ID bertipe **Web application**.
2. Tambahkan origin panel web pada **Authorized JavaScript origins**, misalnya `https://NAMA-APP.pages.dev`. Untuk development bisa tambahkan `http://localhost:5173`.
3. Set Script Property `ERP_GOOGLE_CLIENT_ID` sama persis dengan Web Client ID, termasuk akhiran `.apps.googleusercontent.com`.
4. Setelah environment frontend diset, deploy ulang build React.

Google merekomendasikan validasi ID token di server dan menggunakan claim `sub` sebagai pengenal akun stabil. Kode saat ini memvalidasi token lewat endpoint tokeninfo serta mengecek audience/issuer/expiry; lakukan security review sebelum produksi skala besar.

## 4. Deploy Web App Apps Script

1. Pilih **Deploy → New deployment → Web app**.
2. Set **Execute as** ke pemilik/deployer script agar backend menulis ke spreadsheet milik proyek.
3. Pilih akses yang memungkinkan bridge pada frontend memuat Web App (sering kali opsi akses luas diperlukan untuk iframe). Karena Web App dapat dijangkau publik, semua operasi bisnis tetap harus lolos validasi sesi server dan role. Jangan menganggap URL deployment sebagai rahasia.
4. Deploy dan salin URL yang berakhiran `/exec`. Gunakan URL deployment aktif—bukan URL editor atau `/dev`.
5. Isi `ERP_ALLOWED_ORIGINS` dengan origin yang benar-benar digunakan. Origin harus cocok persis dengan `event.origin`, termasuk protokol dan subdomain. Bila berbeda, bridge akan menolak permintaan atau time out.

Jangan aktifkan akses publik dan menggunakan data keuangan riil sebelum tes negative-permission (tanpa sesi, role salah, sesi kedaluwarsa dan konflik) lulus.

## 5. Konfigurasi frontend React

Tambahkan environment variable pada platform deployment dan lokal (file `.env.local` jangan di-commit):

```dotenv
VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/ID_DEPLOYMENT/exec
VITE_GOOGLE_CLIENT_ID=CLIENT_ID_WEB.apps.googleusercontent.com
```

`VITE_GOOGLE_CLIENT_ID` bukan secret, tetapi jangan pernah memberi prefix `VITE_` pada Gemini API key, webhook secret, bot token, refresh token atau credential server lainnya.

Setelah mengubah environment, jalankan build/deploy ulang. Jika kedua environment belum terisi, aplikasi sengaja menampilkan layar konfigurasi dan tidak fallback diam-diam ke data lokal.

## 6. Login pertama, user, dan workspace

1. Login dengan akun Google yang persis sama dengan `ERP_BOOTSTRAP_ADMIN_EMAIL`. Admin pertama hanya dapat dibuat ketika belum ada admin aktif dan akun itu cocok.
2. Jika workspace cloud belum ada, panel menawarkan:
   - **Mulai database cloud kosong** — pilihan paling aman untuk uji coba baru.
   - **Migrasikan data browser ini** — hanya bila memang perlu. Unduh backup JSON terlebih dahulu dan konfirmasi migrasi.
3. Data lokal tidak dihapus. Backup file JSON tidak menyertakan file biner IndexedDB; foto yang hanya disimpan lokal tetap lokal, dan URL Drive tidak otomatis dibuat.
4. Admin menambahkan pengguna lain di menu Manajemen Pengguna. Pengguna harus login dengan akun Google yang diundang. Nonaktifkan akun yang tidak lagi berwenang.

## 7. Webhook n8n / Telegram / WhatsApp

Webhook provider **belum otomatis berjalan end-to-end**. Untuk setiap provider, gunakan n8n sebagai ingress:
1. Validasi webhook/signature/secret provider di n8n.
2. Ambil metadata pesan/media sesuai API provider.
3. Kirim event ke URL Web App:
   `https://script.google.com/macros/s/ID_DEPLOYMENT/exec?path=/webhook/inbox`
4. Isi JSON body seperti contoh berikut. Ganti placeholder dengan nilai asli pada secret store n8n; jangan menaruh secret di frontend.

```json
{
  "ingest_secret": "AMBIL_DARI_SCRIPT_PROPERTIES",
  "source": "telegram",
  "provider_message_id": "ID_PESAN_PROVIDER",
  "sender_id": "ID_PENGIRIM",
  "sender_name": "NAMA_PENGIRIM",
  "text": "Pembelian semen untuk proyek A",
  "media_id": "ID_MEDIA_PROVIDER",
  "media_mime_type": "image/jpeg",
  "raw": {}
}
```

Hasilnya baru masuk `INBOX_OCR` dengan status `RECEIVED`. Kode ingress belum mengunduh gambar, menjalankan OCR otomatis, meminta persetujuan, atau memposting buku kas/jurnal. Jangan menyatakan bahwa WhatsApp/Telegram sudah aktif sebelum semua tahapan itu diuji. Untuk WhatsApp Business Platform resmi, perhitungkan tarif pesan sesuai pasar dan kategori.

## 8. Tes wajib sebelum produksi

- [ ] URL deployment dan daftar origin benar, halaman login Google tampil dan error konfigurasi tidak disembunyikan.
- [ ] Akun yang belum terdaftar ditolak; admin bootstrap hanya sekali; pengguna nonaktif ditolak.
- [ ] `VIEWER` tidak dapat menyimpan modul; `PROYEK` dan `KEUANGAN` tidak dapat menulis modul di luar allowlist.
- [ ] Edit yang dikirim tanpa sesi atau dengan token manipulasi ditolak.
- [ ] Dua browser menyimpan versi sama; perangkat kedua menerima konflik dan tidak diam-diam menimpa perubahan pertama.
- [ ] Audit feed menampilkan event server, bukan event buatan browser.
- [ ] Migrasi diuji menggunakan salinan/backup; pastikan angka dan bukti asli direkonsiliasi.
- [ ] OCR diuji dengan foto buram, nota thermal, tulisan tangan dan PDF; semua hasil tetap draf sampai diperiksa manusia.
- [ ] Uji webhook dengan ID pesan yang sama memastikan tidak terjadi pencatatan event ganda.
- [ ] Uji batas kuota Apps Script/Gemini dan alur error sebelum menambahkan data riil.

CI typecheck/unit/build tidak membuktikan deployment Google, OAuth, OCR, Drive atau webhook sudah bekerja. Jalankan uji live sebelum go-live.

## Biaya dan privasi

Apps Script, Sheets dan Google Sign-In dapat menjadi pilihan berbiaya rendah tanpa server/database berbayar terpisah selama masih dalam kuota. Apps Script tetap mempunyai kuota harian dan timeout; kuota dapat berubah: https://developers.google.com/apps-script/guides/services/quotas

Gemini API memiliki free tier yang dibatasi. Halaman pricing saat ini menyebut data pada free tier dapat digunakan untuk peningkatan produk Google; pertimbangkan risiko ini sebelum mengirim kwitansi, informasi bank atau data pribadi. https://ai.google.dev/gemini-api/docs/pricing

WhatsApp Business Platform tidak boleh diasumsikan gratis: tarif dikenakan per pesan yang tersampaikan menurut pasar dan kategori. https://whatsappbusiness.com/id/products/platform-pricing/
