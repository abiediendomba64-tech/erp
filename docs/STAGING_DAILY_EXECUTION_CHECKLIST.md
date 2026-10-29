# Checklist Eksekusi Harian — Uji Staging ERP

Status awal setiap sesi: **BLOCKED** sampai target, akun uji, dan bukti siap. Dokumen ini tidak memberi izin deploy produksi.

## Identitas sesi

- Tanggal/waktu mulai UTC:
- Tester utama:
- Reviewer kedua:
- Commit SHA yang diuji:
- Branch: \`deployment-ready/staging-gates\`
- GitHub Actions staging run URL:
- Apps Script staging URL (boleh disamarkan; jangan tempel token):
- Label workspace dan spreadsheet uji:
- Hasil akhir sesi: \`PASS / FAIL / BLOCKED\`

## A. Sebelum menjalankan uji

- [ ] Pastikan CI pada SHA yang diuji selesai dan hijau.
- [ ] Pastikan PR perubahan konfigurasi masih terpisah dari \`main\`; jangan bypass review.
- [ ] Konfirmasi Script ID, Deployment ID, dan Spreadsheet ID semuanya menunjuk staging.
- [ ] Pastikan spreadsheet staging kosong/bersih atau memiliki dataset fixture yang disetujui.
- [ ] Pastikan tidak ada data produksi, token, email pribadi yang tidak diperlukan, atau dokumen pemilik tanah/vendor asli di fixture.
- [ ] Pastikan environment \`staging\` memakai hanya \`STAGING_*\` secrets/variables.
- [ ] Pastikan ada dua sesi browser/profil independen dan akun uji untuk empat role.
- [ ] Siapkan backup fixture staging sebelum tes write; verifikasi file backup dapat dibaca.
- [ ] Simpan daftar hasil yang diharapkan untuk transaksi fixture; nilai aktual tidak boleh berasal dari data produksi.
- [ ] Reviewer kedua mengesahkan target staging sebelum workflow dijalankan.

**STOP** jika Script ID, Deployment ID, atau spreadsheet tidak dapat diverifikasi. Jangan menjalankan workflow.

## B. Jalankan pipeline staging

- [ ] Buka GitHub Actions workflow **Sync, deploy, and smoke-test Apps Script staging**.
- [ ] Pilih branch \`deployment-ready/staging-gates\`.
- [ ] Masukkan \`STAGING\` hanya setelah target di atas diverifikasi oleh dua orang.
- [ ] Pastikan run menunjukkan target verifikasi berhasil sebelum proses sync/deploy.
- [ ] Pastikan post-deployment health smoke test berhasil.
- [ ] Catat run URL, commit SHA, hasil job, Web App version, dan timestamp UTC.
- [ ] Pastikan workflow menggunakan staging environment dan tidak menjalankan workflow produksi.

Pipeline hijau hanya lulus build, target check, sync/deploy staging, dan health smoke test yang tercakup di workflow. Pipeline tidak menggantikan uji bisnis di bagian C.

## C. Jalankan uji fungsi

Gunakan matriks bukti di \`docs/STAGING_EVIDENCE_MATRIX.md\`. Setiap pengujian harus mencatat expected result, actual result, evidence URI, tester, waktu, dan status.

- [ ] Login Google berhasil dan penolakan sesi tidak valid teruji.
- [ ] Server memaksakan izin setiap role; jangan hanya memeriksa menu UI.
- [ ] Workspace cloud dapat dibuat/dibaca/disimpan/muat ulang di spreadsheet staging.
- [ ] Dua sesi membuat konflik versi; data sesi terbaru tidak tertimpa snapshot lama.
- [ ] Jurnal valid balance; jurnal invalid ditolak; reversal mengacu jurnal asal dan alasan.
- [ ] Duplicate submit dan retry setelah timeout tidak menggandakan transaksi atau jurnal.
- [ ] Gangguan jaringan diuji dan hasil write direkonsiliasi sebelum retry.
- [ ] Audit trail dapat ditelusuri dari aktor ke transaksi/jurnal/perubahan.
- [ ] OCR, Drive upload, WhatsApp, Telegram tetap fail-closed dan tidak mengklaim sukses.
- [ ] Laporan dihitung ulang dari dataset fixture dan cocok dengan hasil independen.

## D. Penutupan sesi harian

- [ ] Rekonsiliasi nilai dan jumlah record sebelum/sesudah seluruh tes.
- [ ] Pastikan tidak ada perubahan pada spreadsheet, Web App, maupun data produksi.
- [ ] Ekspor hasil uji, log yang sudah disanitasi, screenshot, dan backup fixture yang diperlukan.
- [ ] Jangan simpan ID token, refresh token, client secret, isi spreadsheet sensitif, atau data pribadi mentah dalam artefak.
- [ ] Buat issue untuk setiap FAIL/BLOCKED dengan langkah reproduksi dan dampak.
- [ ] Jika uji write gagal/timeout, cek cloud state sebelum mengulangi agar tidak membuat duplikat.
- [ ] Isi baris gate yang relevan di \`DEPLOYMENT_CHECKLIST.md\` beserta bukti.
- [ ] Reviewer kedua meninjau bukti dan menyatakan sesi berakhir.

## E. Keputusan sesi

- **PASS:** hasil aktual cocok dengan expected result dan bukti dapat diulang/diperiksa.
- **FAIL:** hasil menyimpang, ada kerusakan data, kontrol gagal, duplikasi, atau kebocoran lintas lingkungan.
- **BLOCKED:** prasyarat, environment, akun, bukti, atau akses tidak tersedia.
- **NOT PROVEN:** belum ada eksekusi nyata atau bukti tidak cukup. Untuk keputusan release, perlakukan sama seperti BLOCKED.

Keputusan sesi: \`PASS / FAIL / BLOCKED / NOT PROVEN\`

Defect/issue:
Reviewer:
Waktu selesai UTC:
Link evidence bundle:
