# GitHub Actions CI/CD untuk Google Apps Script ERP

Dokumen ini menjelaskan workflow `.github/workflows/ci.yml` dan
`.github/workflows/deploy.yml`.

## 1. Apa yang dijalankan

- CI berjalan saat pull request menuju `main` dan saat perubahan masuk ke `main`.
- CI menjalankan `npm ci`, `npm run typecheck`, `npm test`, dan `npm run build`.
- Script deployment **tidak berjalan otomatis secara default**. Push ke `main` baru mengizinkan deploy jika repository variable `ENABLE_GAS_DEPLOY` bernilai `true`.
- Workflow deployment juga bisa dijalankan secara manual dari tab **Actions**. Operator harus mencentang konfirmasi sebelum job dapat berjalan.
- Mode `initial` membuat deployment Web App pertama. Mode `update` memperbarui deployment yang ID-nya sudah dikonfigurasi.

Catatan: workflow memakai tes dan build yang sudah terdefinisi di `package.json`.
Repositori ini belum mendefinisikan script `lint`, jadi workflow tidak memanggil
`npm run lint` yang akan gagal dengan "Missing script: lint".

## 2. Secrets wajib di GitHub

Buka repository GitHub → **Settings → Secrets and variables → Actions → New repository secret**.
Tambahkan:

### `CLASPRC_JSON`

Isi dengan seluruh isi file autentikasi lokal `~/.clasprc.json`, yang dibuat
setelah Anda login memakai `clasp`. File ini mengandung refresh token sensitif.
Jangan pernah commit file atau menempelkan isinya di issue/chat.

### `CLASP_JSON`

Isi sebagai JSON satu baris. Gunakan Script ID milik Apps Script target dan rootDir
yang khusus ke folder backend ini:

```json
{"scriptId":"GANTI_DENGAN_SCRIPT_ID_APPS_SCRIPT","rootDir":"google-apps-script"}
```

Pastikan Script ID cocok dengan proyek yang hendak diperbarui. `rootDir` wajib
`google-apps-script`, agar `clasp push` tidak mengunggah file frontend React.

### `GAS_DEPLOYMENT_ID`

Tambahkan ID deployment Web App yang sudah ada setelah deploy pertama berhasil.
Ini adalah **Deployment ID** dari Deploy → Manage deployments, bukan Script ID
dan bukan URL yang berakhiran `/exec`.

## 3. Aktifkan Apps Script API

Login ke akun Google yang berwenang atas proyek Apps Script tersebut, lalu pastikan
Apps Script API aktif melalui:
https://script.google.com/home/usersettings

OAuth refresh token di `CLASPRC_JSON` harus dibuat oleh akun yang mempunyai akses
editor ke proyek Apps Script target.

## 4. Deploy pertama

1. Pastikan secret `CLASPRC_JSON` dan `CLASP_JSON` sudah benar. Pastikan
   `CLASP_JSON.rootDir` berisi `google-apps-script`.
2. Buka GitHub → **Actions** → **Deploy Google Apps Script** → **Run workflow**.
3. Pilih `initial` di `deployment_mode`, centang `confirm_deploy`, lalu jalankan.
4. Setelah workflow berhasil, buka log langkah **Push source and deploy** dan
   ambil Deployment ID hasil perintah `clasp create-deployment`.
5. Simpan ID itu sebagai repository secret `GAS_DEPLOYMENT_ID`.
6. Untuk deploy selanjutnya, jalankan workflow dengan `deployment_mode=update`
   dan tetap centang konfirmasi.

Setelah URL Web App tersedia, pastikan Script Properties backend
(`SPREADSHEET_ID`, `GOOGLE_CLIENT_ID`, `ERP_FRONTEND_URL`, dan `ERP_ADMIN_EMAILS`)
telah disetel di proyek Apps Script yang sama.

## 5. Deploy otomatis setelah siap

Hanya setelah deploy manual dan uji end-to-end berhasil, tambahkan repository variable
`ENABLE_GAS_DEPLOY` dengan nilai `true` melalui **Settings → Secrets and variables → Actions → Variables**.
Dengan begitu, push ke `main` akan mengunggah source dan memperbarui deployment
yang ditentukan dalam `GAS_DEPLOYMENT_ID`.

## 6. Peringatan keselamatan

- `clasp push --force` menimpa source Apps Script target. Jangan gunakan Script ID
  proyek lain atau hapus/pindahkan folder `google-apps-script` tanpa meninjau workflow.
- Workflow hanya memperbarui source dan deployment Apps Script. Ia tidak memasang
  Script Properties, mengonfigurasi OAuth, memigrasi data, atau menguji akun Google
  secara otomatis.
- CI hijau tidak sama dengan aplikasi siap produksi. Sebelum dipakai untuk pencatatan
  keuangan nyata, lakukan uji login, akses peran, simpan/muat workspace, konflik versi,
  audit log, dan rekonsiliasi di spreadsheet target.
