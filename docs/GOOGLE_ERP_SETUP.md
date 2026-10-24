# ERP Google Cloud — setup backend

Arsitektur cabang ini: React panel (web/HP) → Cloudflare Pages Function satu-origin → Google Apps Script Web App → Google Sheets + Drive. Browser tidak menghubungi Apps Script langsung, agar tidak bergantung pada CORS/redirect Apps Script. Apps Script adalah otoritas identitas/role dan sumber data; browser storage hanya cache yang dapat dibangun ulang dari cloud.

## 1. Buat Google Sheet database

1. Buat satu spreadsheet khusus ERP (jangan pakai spreadsheet pribadi campuran).
2. Buka Extensions → Apps Script.
3. Tambahkan dua file script dari repo: `google-apps-script/Code.gs` dan `google-apps-script/CloudApi.gs`. Jangan menimpa kode transaksi lama sebelum mengambil backup. File `Code.gs` pada branch ini sengaja menutup endpoint tulis lama yang tidak workspace-scoped.
4. Jalankan fungsi `setupDatabase()` satu kali dari Apps Script editor untuk menyiapkan master akun dan tab dasar.
5. Pada Project Settings → Script Properties, set:
   - `SPREADSHEET_ID`: ID spreadsheet tadi.
   - `GOOGLE_CLIENT_ID`: OAuth Client ID dari langkah 2.
   - `INITIAL_ADMIN_EMAIL`: alamat Google admin pertama yang akan masuk.
   - `DOCUMENTS_FOLDER_ID`: ID folder Google Drive khusus bukti ERP.
   - `GEMINI_API_KEY`: opsional, dari Google AI Studio untuk OCR.
6. Deploy → New deployment → Web app, Execute as: **Me**, Who has access: **Anyone**. Ini membuat endpoint publik secara teknis, tetapi setiap action data privat tetap harus memiliki sesi opaque yang diterbitkan server setelah verifikasi Google Sign-In. Jangan membuka endpoint lama yang tidak memerlukan sesi. Salin URL `/exec`.

**Privasi file Drive:** jangan set folder ke “Anyone with the link”. Bagikan folder bukti hanya ke akun staf/pemilik yang berhak, atau gunakan Shared Drive. File yang diunggah mewarisi akses folder. Link Drive tidak otomatis memberi hak akses kepada semua pengguna ERP.

## 2. Buat Google Sign-In

1. Buka Google Cloud Console → APIs & Services → Credentials.
2. Buat OAuth Client ID berjenis **Web application**.
3. Tambahkan domain panel produksi ke Authorized JavaScript origins (contoh domain `https://erp-anda.pages.dev`, tanpa path).
4. Salin Client ID. Gunakan nilai yang sama pada `VITE_GOOGLE_CLIENT_ID` untuk build React dan Script Property `GOOGLE_CLIENT_ID` di Apps Script.
5. Buat pengguna pertama dengan email yang sama dengan `INITIAL_ADMIN_EMAIL`. Email harus terverifikasi oleh Google.

Token Google diverifikasi server lewat endpoint `tokeninfo` pada implementasi awal ini. Google mendokumentasikannya untuk debugging dan memperingatkan adanya throttling/intermitensi untuk validasi produksi ber-volume tinggi. Uji login dengan akun sungguhan dan rencanakan verifikasi JWT via library/server produksi bila volume atau persyaratan keamanan meningkat.

## 3. Hubungkan frontend dan proxy same-origin

1. Pada Cloudflare Pages Project → Settings → Variables and Secrets, set `GAS_WEB_APP_URL` ke URL `/exec` di atas. Ini adalah secret/config server, **bukan** `VITE_GAS_WEB_APP_URL`.
2. Pada build variables set `VITE_GOOGLE_CLIENT_ID`.
3. Pastikan folder `functions/api/erp.ts` ikut ter-deploy. React memanggil `/api/erp`; Pages Function meneruskan JSON ke Apps Script dan menangani redirect/response server-side.
4. Deploy ulang Pages setelah set variabel. `GAS_WEB_APP_URL` baru dibaca runtime; `VITE_GOOGLE_CLIENT_ID` harus tersedia ketika build React berjalan.

## 4. Sumber data, migrasi, dan pemakaian

- Buka panel dan login dengan Google. Hanya `INITIAL_ADMIN_EMAIL` yang otomatis menjadi Admin pertama. Akun lain harus diaktifkan oleh Admin di menu Manajemen User dan ditambahkan sebagai anggota workspace.
- Buat workspace. Jika browser lama memiliki data, layar akan menawarkan impor eksplisit. Jangan centang sebelum memeriksa data lokal dan membuat backup JSON.
- Setiap modul menggunakan snapshot aplikasi yang dikonversi server ke `ERP_RECORDS` per-record di Google Sheets. Perubahan append-only memiliki versi workspace; `ERP_STATE_HEAD` hanya dinaikkan setelah event data dan audit tercatat. Konflik versi diblokir; muat ulang untuk mengambil versi cloud sebelum lanjut.
- `ERP_RECORDS` menyimpan event per-record append-only. `AUDIT_LOG` menyimpan nilai lama/baru per record. Jangan edit baris ini manual saat aplikasi aktif. Gunakan panel ERP agar versi dan audit konsisten.
- File foto/PDF baru maksimal 4 MB per upload melalui panel (JPEG/PNG/WebP/PDF), disimpan di folder Drive yang sudah disetel. OCR menghasilkan **draft** dan tidak membuat transaksi/Jurnal final. Anggota harus mengecek struk asli dan menyetujui melalui alur transaksi.
- Akun, menu, RAB, buku kas, kewajiban, aset, pajak, stok, penggajian, QC, unit, laporan, serta dokumen tetap menjadi modul panel; modul baru tidak dibuatkan data transaksi fiktif.

## 5. Webhook Telegram/WhatsApp dan OCR

Webhook tidak dipublikasikan tanpa validasi. Gunakan n8n (atau endpoint khusus) sebagai penerima webhook resmi; validasi signature/secret provider, deduplikasi message ID, simpan gambar ke folder Drive ERP, lalu panggil API action OCR dengan akun bot/service yang dibatasi. Fitur OCR saat ini hanya ekstraksi draft dari file yang sudah berada di folder Drive ERP. Belum ada konfigurasi live Telegram/WhatsApp, webhook registration, outbound message delivery, atau otomasi posting ke Buku Kas.

## 6. Kuota dan batas operasional

Google Apps Script memiliki batas waktu **6 menit per eksekusi** dan kuota harian berbeda menurut jenis akun. Hindari refresh/poll berulang, simpan hanya record yang berubah, gunakan file Drive untuk lampiran, dan jangan meng-upload PDF besar lewat JSON. Gemini API/Apps Script/Cloudflare masing-masing memiliki kuota atau batas gratis tersendiri; tidak boleh diasumsikan tak terbatas atau selalu Rp0.

Sebelum produksi: uji dua browser bersamaan; uji konflik versi; uji role Viewer/Keuangan/Proyek; putus koneksi saat menyimpan; pulihkan dari backup Sheets; cek permission folder Drive; uji OCR untuk struk thermal/tulisan tangan/PDF; dan uji daily quota dengan data realistis. Jangan mengaktifkan webhook live sebelum langkah-langkah tersebut diselesaikan.
