# Checklist Validasi Deployment CI/CD Production

## 1. Struktur & Tata Letak Dasar

Dokumen ini berfungsi sebagai gate validasi formal sebelum deployment production Google Apps Script ERP Properti Konstruksi dilakukan dari GitHub Actions.

Tujuan utama:
- memastikan satu jalur deployment yang sah dan terdokumentasi
- mencegah salah target Apps Script
- mencegah overwrite source atau deployment yang tidak diizinkan
- memastikan approval reviewer aktif dan tercatat
- memastikan deployment ID sesuai dengan Script ID yang benar
- memastikan live endpoint Web App dan fungsi utama benar-benar diverifikasi

Dokumen ini mencakup 5 gate validasi produksi yang harus dipenuhi secara berurutan sebelum deployment production dianggap layak.

## 2. Ringkasan Eksekutif & Status Kesiapan Rilis

### Status saat ini

Status umum: BELUM SIAP UNTUK PRODUCTION

Alasan utama:
- CI dan build berhasil, tetapi bukan bukti produksi siap
- environment `production` belum diverifikasi memiliki required reviewers aktif
- variabel dan secrets belum dibuktikan valid untuk project yang benar
- deployment ID belum dibuktikan cocok dengan Script ID live
- run manual produksi dengan approval valid belum dijalankan
- live smoke test endpoint belum dilakukan

### Ringkasan keputusan

Kode yang masuk ke PR #13 memperbaiki beberapa masalah keamanan utama:
- menghapus jalur deployment duplikat
- tidak lagi menggunakan `clasp push --force`
- memisahkan sinkronisasi source dan deployment
- menambahkan validasi Script ID vs approved target
- menambahkan validasi deployment ID sebelumnya pada project yang tepat
- membersihkan kredensial sementara setelah job selesai

Namun, perbaikan arsitektur tidak sama dengan validasi operasi live. Checklist ini harus dipenuhi sebelum deployment production dianggap aman untuk dieksekusi.

### Status gate kesiapan

| Gate | Status | Catatan |
| --- | --- | --- |
| 1. Required reviewers environment production | Belum terverifikasi | Harus dicek di GitHub Settings > Environments > production |
| 2. Secrets dan variables valid | Belum terverifikasi | Nilai rahasia tidak boleh dicetak di log |
| 3. Deployment ID cocok Script ID target | Belum terverifikasi | Validasi harus dilakukan terhadap project live |
| 4. Manual approval melalui workflow | Belum dijalankan | Harus terjadi secara manual dan dicatat |
| 5. Smoke test endpoint & hasil live | Belum dijalankan | Wajib verifikasi akses Web App dan fungsi utama |

### Keputusan penerimaan release

Release production hanya boleh diterima jika semua 5 gate pada matriks checklist di bawah ini dinyatakan lulus, dengan bukti yang terdokumentasi.

## 3. Matriks Checklist Validasi 5 Gate

### Gate 1 — Required Reviewers Aktif pada GitHub Environment `production`

| Item | Kriteria | Status | Bukti yang dibutuhkan |
| --- | --- | --- | --- |
| Environment ada | `production` tersedia di repository | [ ] | Screenshot / link settings environment |
| Required reviewers aktif | Minimal satu reviewer wajib diaktifkan | [ ] | Link settings environment dan daftar reviewer |
| Approval wajib | Workflow manual tidak bisa di-run tanpa approval | [ ] | Bukti run menunggu approval |
| Reviewer berwenang | Reviewer adalah orang yang berotoritas pada prod | [ ] | Daftar reviewer dan pemilik akses |

Langkah validasi:
1. Buka GitHub repository > Settings > Environments > production.
2. Pastikan environment ada dan berstatus aktif.
3. Konfirmasi `Required reviewers` aktif dan daftar reviewer sudah benar.
4. Verifikasi bahwa workflow manual terikat ke environment yang sama.
5. Catat bukti dan tanggal validasi.

Kriteria lulus:
- reviewer wajib aktif
- approval diperlukan sebelum run manual bisa lanjut
- reviewer yang ditunjuk adalah orang yang berwenang

---

### Gate 2 — Secrets dan Variables Tersedia, Valid, dan Mengarah ke Project yang Benar

Variabel dan secret yang harus tersedia:
- `vars.GAS_SCRIPT_ID`
- `secrets.CLASPRC_JSON`
- `secrets.CLASP_JSON`
- `secrets.GAS_DEPLOYMENT_ID`

| Item | Kriteria | Status | Bukti yang dibutuhkan |
| --- | --- | --- | --- |
| `GAS_SCRIPT_ID` ada | Variabel environment tersedia | [ ] | Tautan environment variables |
| `CLASPRC_JSON` ada | Secret tersedia dan tidak kosong | [ ] | Validasi waktu run, bukan nilai secret |
| `CLASP_JSON` ada | Secret tersedia dan tidak kosong | [ ] | Validasi waktu run, bukan nilai secret |
| `GAS_DEPLOYMENT_ID` ada | Secret tersedia dan tidak kosong | [ ] | Validasi waktu run, bukan nilai secret |
| Validasi JSON aman | `.clasp.json` dapat di-parse tanpa kebocoran data | [ ] | Log sukses tanpa data rahasia |
| Script ID cocok target | Script ID pada `.clasp.json` sama dengan approved `GAS_SCRIPT_ID` | [ ] | Log validasi mismatch failure/success |
| `rootDir` valid | `rootDir` = `google-apps-script` | [ ] | Log linting validasi |
| File target valid | File Apps Script yang diperlukan ada | [ ] | Log validasi file |

Aturan keamanan penting:
- tidak boleh `echo` atau mencetak isi secret di log
- tidak boleh menyimpan secret di artifact atau summary
- hanya menampilkan nama variabel dan status keberadaan
- log hanya boleh menunjukan `missing` atau `present`, bukan nilai rahasia

Kriteria lulus:
- semua variable dan secret tersedia
- `scriptId` cocok dengan approved production target
- `rootDir` benar
- file target valid
- tidak ada kebocoran rahasia ke log atau artifact

---

### Gate 3 — Deployment ID Cocok dengan Script ID yang Dituju

| Item | Kriteria | Status | Bukti yang dibutuhkan |
| --- | --- | --- | --- |
| Autentikasi `clasp` sah | Akun `clasp` memiliki akses ke project live | [ ] | Hasil run `clasp deployments` |
| `GAS_DEPLOYMENT_ID` ada pada project | Deployment ID muncul di daftar deployment Script target | [ ] | Hasil run `clasp deployments` |
| Deployment ID unik | ID mengarah ke deployment yang benar, bukan project lain | [ ] | Perbandingan Script ID dan deployment list |
| Target valid sebelum update | Workflow gagal bila deployment ID tidak ada | [ ] | Log job failure / success |

Validasi yang harus dilakukan sebelum update deployment:
1. Konfigurasi autentikasi dan target Script ID.
2. Jalankan `npx --yes @google/clasp deployments` untuk Script ID target.
3. Periksa apakah `GAS_DEPLOYMENT_ID` hadir dalam daftar.
4. Jika tidak hadir, workflow harus gagal dengan error jelas.
5. Catat output hasil validasi.

Kriteria lulus:
- deployment ID terbukti ada pada project yang benar
- deployment ID bukan milik project yang salah
- update deployment hanya dilakukan pada target yang valid

---

### Gate 4 — Run Manual Melewati Approval yang Diwajibkan

| Item | Kriteria | Status | Bukti yang dibutuhkan |
| --- | --- | --- | --- |
| Workflow manual dipicu | Trigger `workflow_dispatch` digunakan | [ ] | Tautan run GitHub Actions |
| Konfirmasi eksplisit | Input `confirm_target` / `confirm_deploy` diisi sesuai aturan | [ ] | Tautan log input |
| Approval reviewer diperlukan | Environment required reviewer aktif | [ ] | Tautan approval di run |
| Run tidak bisa tanpa persetujuan | Approval wajib dan tervalidasi | [ ] | Bukti run menunggu approval |
| Audit run terdokumentasi | Commit, waktu, reviewer, dan hasil tercatat | [ ] | Link run dan summary job |

Langkah validasi:
1. Jalankan workflow manual dari GitHub Actions.
2. Pastikan input konfirmasi benar dan disetujui.
3. Pastikan environment meminta approval reviewer.
4. Verifikasi approval diberikan sebelum job lanjut.
5. Catat link run dan status final.

Kriteria lulus:
- run manual hanya bisa dilakukan dengan persetujuan yang valid
- approval tercatat
- hasil deployment tidak diinisiasi tanpa persetujuan

---

### Gate 5 — Hasil Deployment dan Smoke Test Endpoint Web App Diverifikasi

| Item | Kriteria | Status | Bukti yang dibutuhkan |
| --- | --- | --- | --- |
| Deployment dibuat/diupdate | Workflow update deployment berhasil | [ ] | Link job run dan deployment output |
| Web App URL aktif | URL deployment merespons | [ ] | `curl -I` atau response status |
| Endpoint utama valid | Health atau halaman utama merespons benar | [ ] | Output HTTP / body response |
| Fitur kritis bekerja | Endpoint utama dan fungsi utama tidak error | [ ] | Smoke test hasil nyata |
| Error tidak ada pada log | Tidak ada error fatal pasca deploy | [ ] | Job log dan endpoint hasil |

Langkah validasi:
1. Ambil URL deployment Web App aktif dari Apps Script / GitHub output.
2. Jalankan `curl -I` untuk mengecek HTTP status.
3. Jalankan smoke test endpoint utama.
4. Verifikasi payload/HTML yang diharapkan muncul.
5. Uji fungsi kritis yang paling relevan untuk ERP, misalnya endpoint formulir, upload, read/write data, atau pencarian/akses data.
6. Simpan output hasil sebagai bukti produksi.

Kriteria lulus:
- deployment sukses
- URL dapat diakses
- endpoint utama merespons sesuai ekspektasi
- tidak ada kesalahan fatal pada fitur utama

## Catatan Kunci Operasional

### Prinsip anti-bocor rahasia
- Tidak menampilkan nilai `CLASPRC_JSON`, `CLASP_JSON`, atau `GAS_DEPLOYMENT_ID` di log atau summary.
- Hanya tampilkan nama variabel, status kehadiran, dan hasil validasi non-rahasia.
- Gunakan `set -euo pipefail` dan validasi sebelum menulis file kredensial.

### Batas keamanan
- CI lulus bukan jaminan production-ready.
- Workflow manual bukan bukti deployment aman.
- Validasi kode harus diikuti oleh validasi live target dan endpoint production.

### Persyaratan sebelum merge atau run produksi
Sebelum PR #13 siap digabung atau sebelum deployment production dijalankan:
1. environment production memiliki required reviewers aktif
2. semua secret dan variables diverifikasi di GitHub
3. Script ID dan deployment ID dibuktikan sesuai project live
4. run manual dengan approval valid sudah dijalankan
5. smoke test Web App dan endpoint utama sudah berhasil

## Status Final Rekomendasi

Direkomendasikan status: TIDAK SIAP UNTUK PRODUCTION HINGGA 5 GATE DIATAS LULUS DENGAN BUKTI LIVE.

PR #13 memperbaiki masalah keamanan yang nyata dan mengurangi risiko overwrite dan salah target. Namun, validasi production yang lengkap masih harus dijalankan di lingkungan GitHub dan project Apps Script yang berwenang sebelum deployment benar-benar diizinkan.

## Template Tanda Tangan / Approval

| Gate | Status | Diverifikasi oleh | Tanggal | Bukti |
| --- | --- | --- | --- | --- |
| 1. Reviewers production | [ ] |  |  |  |
| 2. Secrets & variables | [ ] |  |  |  |
| 3. Deployment ID vs Script ID | [ ] |  |  |  |
| 4. Manual approval | [ ] |  |  |  |
| 5. Smoke test endpoint | [ ] |  |  |  |

Jika semua kolom diisi dengan tanda lulus dan bukti yang valid, maka deployment production bisa dipertimbangkan untuk ditindaklanjuti.

---

Dokumen ini dimaksudkan untuk digunakan sebagai checklist audit dan gate produksi, bukan sebagai pengganti verifikasi manual yang dilakukan oleh administrator GitHub dan pemilik project Apps Script yang berwenang.
