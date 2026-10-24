# Setup Google Cloud Backend — ERP Properti & Konstruksi

Status dokumen: implementasi awal pada branch `feat/erp-google-cloud-ssot-20261024`. Belum berarti deployment production sudah dilakukan.

## Pilihan teknologi

Implementasi ini memakai Google Apps Script, Google Sheets, Google Identity Services, React, dan Google Apps Script HTML Service. **Tidak membutuhkan Supabase.** Google Sheets menjadi penyimpanan cloud yang digunakan backend; data browser hanya cache sementara, bukan sumber data utama.

Model simpan awal adalah snapshot JSON per bagian modul dalam tab `ERP_STATE`, dilengkapi versi, lock server, pembatasan role, serta audit log server. Ini sengaja membuat migrasi banyak modul React lebih sederhana. Ini belum database relasional dengan satu tab per modul; untuk transaksi volume tinggi atau kebutuhan query SQL, model ini harus dievaluasi ulang. Setiap snapshot per bagian dibatasi 3 MB.

## 1. Siapkan Google Sheet

1. Buat satu Google Spreadsheet khusus ERP.
2. Jangan bagikan spreadsheet database kepada pengguna aplikasi. Berikan akses hanya kepada pemilik/administrator backend.
3. Salin ID spreadsheet dari URL (bagian antara `/d/` dan `/edit`); simpan untuk langkah berikutnya.

Tab berikut dibuat backend ketika diperlukan: `ERP_USERS`, `ERP_WORKSPACES`, `ERP_STATE`, dan `AUDIT_LOG`. Tab akuntansi lama seperti `BUKU_KAS` dan `JURNAL` tidak menjadi sumber data bagi fitur cloud baru ini.

## 2. Buat Google Apps Script

Dari spreadsheet, pilih **Extensions → Apps Script**. Di editor Apps Script, buat tiga file dengan nama persis:

- `Code.gs`: salin seluruh isi `google-apps-script/Code.gs` dari repo.
- `Security.gs`: salin seluruh isi `google-apps-script/Security.gs` dari repo.
- `Wrapper.html`: salin seluruh isi `google-apps-script/Wrapper.html` dari repo sebagai file HTML (bukan file script).

Jangan hanya menyalin `Code.gs`; endpoint login dan gateway berada di `Security.gs`, sedangkan panel embed memerlukan `Wrapper.html`.

## 3. Konfigurasi Google OAuth

Di Google Cloud Console:

1. Buat/pilih project Google Cloud dan konfigurasikan OAuth consent screen sesuai akun/organisasi.
2. Buat OAuth Client ID tipe **Web application**.
3. Tambahkan origin frontend yang akan dipakai pengguna pada **Authorized JavaScript origins**. Misalnya `https://erp-contoh.pages.dev`. Isi origin saja, tanpa path.
4. Simpan Client ID. Jangan menaruh client secret di frontend; implementasi ini memakai ID token Google dan memverifikasinya di server.

## 4. Isi Script Properties

Di Apps Script pilih **Project Settings → Script Properties**, isi:

| Property | Nilai |
|---|---|
| `SPREADSHEET_ID` | ID Google Spreadsheet pada langkah 1 |
| `GOOGLE_CLIENT_ID` | OAuth Client ID dari langkah 3 |
| `ERP_FRONTEND_URL` | Origin HTTPS frontend, misalnya `https://erp-contoh.pages.dev` tanpa path/query |
| `ERP_ADMIN_EMAILS` | Email Google administrator pertama; boleh beberapa email dipisah koma |
| `GEMINI_API_KEY` | Opsional untuk tahap berikutnya; OCR belum diaktifkan oleh gateway ini |

Email administrator pada `ERP_ADMIN_EMAILS` harus cocok dengan akun Google yang digunakan untuk login pertama kali. Backend tidak menerima role yang dikirim oleh browser sebagai bukti otorisasi.

## 5. Build dan deployment frontend

Pada environment build frontend (misalnya Cloudflare Pages) tambahkan:

| Environment variable | Nilai |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID yang sama persis dengan `GOOGLE_CLIENT_ID` di Apps Script |

Lakukan build/deploy ulang setelah environment diisi. `VITE_ERP_API_URL` tidak lagi digunakan untuk akses langsung: request ERP melewati bridge `postMessage` yang dibatasi origin dan `google.script.run`. Buka panel ERP lewat URL Web App Apps Script `/exec`, bukan URL hosting React secara langsung.

Di Apps Script, pilih **Deploy → New deployment → Web app**:
- **Execute as:** akun pemilik/administrator backend.
- Pilih tingkat akses yang sesuai pada kebijakan akun/organisasi. Jika URL Web App dapat dijangkau publik, tindakan data tetap wajib melewati token Google yang diverifikasi oleh `apiDispatch`; jangan pernah membagikan spreadsheet-nya.
- Deploy dan gunakan URL `/exec` yang dihasilkan.

Jika organisasi tidak mengizinkan web app publik, sesuaikan deployment dan kebijakan identitas organisasi sebelum uji coba. Jangan mengubah gateway menjadi endpoint tulis publik tanpa verifikasi token.

## 6. Login dan workspace pertama

1. Buka URL Apps Script `/exec`.
2. Masuk dengan akun Google yang terdaftar di `ERP_ADMIN_EMAILS`.
3. Admin pertama membuat workspace cloud.
4. Pilih salah satu:
   - **Workspace kosong** — disarankan untuk data produksi baru.
   - **Salin data dari browser** — hanya setelah memeriksa data lokal/demo dan membuat backup JSON. Data audit lama dari browser tidak dianggap sebagai audit identitas server.
5. Admin menambahkan pengguna pada menu **Manajemen User** menggunakan email Google masing-masing dan menetapkan role `ADMIN`, `KEUANGAN`, `PROYEK`, atau `VIEWER`.

Perubahan yang disimpan harus menampilkan status cloud `tersimpan`. Jika terjadi konflik antarperangkat, backend menolak snapshot lama alih-alih menimpa data terbaru diam-diam. Buat backup bila diperlukan, lalu muat ulang dari cloud untuk melanjutkan.

## Batas tahap ini — tidak boleh dianggap sudah aktif

- Data operasional dan akuntansi sekarang dimuat/disimpan sebagai snapshot cloud dengan versi per bagian. Transaksi yang melibatkan dua bagian berbeda belum dijamin sebagai satu transaksi database atomik.
- Endpoint OCR, WhatsApp, dan Telegram sengaja dinonaktifkan pada gateway baru sampai upload Drive, validasi provider, deduplikasi webhook, dan alur approval diuji end-to-end.
- Upload lampiran Google Drive belum disambungkan; lampiran lokal lama tidak otomatis dipindahkan.
- API transaksi lama dan endpoint laporan yang membaca tab legacy dinonaktifkan untuk browser. Laporan cloud dihitung dari snapshot workspace.
- Tidak ada migrasi otomatis dari `localStorage` tanpa tindakan eksplisit administrator.
- Build/CI hijau tidak sama dengan deployment Google berhasil. Login, origin, izin akses spreadsheet, limit akun Google, serta uji dua perangkat harus diuji pada project Google milik pemilik ERP.

## Pemeriksaan sebelum dipakai untuk data nyata

- [ ] OAuth Client ID sama pada Apps Script dan frontend.
- [ ] Email administrator benar dan dapat login.
- [ ] Backend hanya membuka data ke role yang sesuai.
- [ ] Uji create, update, reload, serta gagal jaringan.
- [ ] Uji konflik dua perangkat pada workspace uji.
- [ ] Uji bahwa VIEWER tidak dapat menyimpan perubahan.
- [ ] Buat backup JSON dan verifikasi restore pada lingkungan uji.
- [ ] Rekonsiliasi data awal dengan buku kas, bukti transaksi, dan jurnal asli sebelum migrasi data keuangan produksi.
