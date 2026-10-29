# Template Persetujuan Produksi Final — ERP

> **Dokumen keputusan, bukan izin otomatis untuk deploy.** Isi hanya setelah laporan staging selesai dan dapat ditelusuri. Jika bukti belum ada, gunakan NO-GO atau NOT PROVEN.

## 1. Identitas release

- Repository: \`abiediendomba64-tech/erp\`
- Kandidat branch/PR:
- Candidate commit SHA (full):
- CI run URLs:
- Staging workflow run URL:
- Staging Web App version / release identifier:
- Staging review document:
- Evidence bundle:
- Tanggal/waktu keputusan UTC:

## 2. Hasil gate

Isi berdasarkan \`DEPLOYMENT_CHECKLIST.md\` dan \`docs/STAGING_EVIDENCE_MATRIX.md\`.

| Gate | Hasil | Bukti | Defect/issue terbuka |
|---|---|---|---|
| 1. Git hygiene & branch protection | NOT PROVEN | | |
| 2. Staging isolation & target | NOT PROVEN | | |
| 3. Frontend environment & build | NOT PROVEN | | |
| 4. OAuth & session rejection | NOT PROVEN | | |
| 5. Workspace/data isolation | NOT PROVEN | | |
| 6. Server-side RBAC | NOT PROVEN | | |
| 7. Accounting/journal integrity | NOT PROVEN | | |
| 8. Anti-duplication/idempotency | NOT PROVEN | | |
| 9. Concurrency & recovery | NOT PROVEN | | |
| 10. Disabled features & rollback | NOT PROVEN | | |

Nilai yang diizinkan: \`PASS\`, \`FAIL\`, \`BLOCKED\`, \`NOT PROVEN\`.

## 3. Pemeriksaan wajib sebelum keputusan

- [ ] Semua skenario wajib pada matriks bukti telah dijalankan di staging dengan akun Google nyata.
- [ ] Script ID, Deployment ID, dan spreadsheet staging telah diverifikasi sebagai terisolasi.
- [ ] Tidak ada data produksi tertulis/terbaca selama pengujian staging; hasil pemeriksaan dan bukti pembanding terlampir.
- [ ] Role ADMIN, KEUANGAN, PROYEK, VIEWER telah diuji melalui server-side request, termasuk negative authorization.
- [ ] Save/load, konflik versi, timeout/retry, backup/restore, balance jurnal, reversal, deduplikasi dan audit trail lulus.
- [ ] OCR, Drive upload, WhatsApp, dan Telegram terbukti fail-closed bila belum diaktifkan.
- [ ] Branch protection/ruleset \`main\` diverifikasi langsung dari pengaturan repository; screenshot/link bukti mencantumkan required checks dan review rules.
- [ ] Tidak ada secret yang terbuka pada tracked files; secret scan dilakukan. Jika credential pernah terungkap, rotasi dan catat tindakan.
- [ ] Seluruh critical/high security, auth, data-integrity, atau cross-environment issue ditutup dan diverifikasi.
- [ ] Rollback, backup, restore dan pemilik on-call/operasional telah ditetapkan.
- [ ] Exact commit yang akan dirilis sama dengan commit yang diuji atau seluruh delta telah diuji ulang.
- [ ] Persetujuan engineering, security/reviewer, dan business owner tercatat.

## 4. Risk register / exception

Tidak boleh ada exception diam-diam. Untuk tiap risiko yang tidak bersifat critical/high dan dapat diterima menurut kebijakan organisasi:

| Risiko | Dampak | Mitigasi | Pemilik | Batas waktu | Persetujuan eksplisit |
|---|---|---|---|---|---|
| Tidak ada | — | — | — | — | — |

Jika tabel memiliki exception kritis/tinggi atau berkaitan dengan akses tidak sah, duplikasi posting, hilangnya data, atau pencampuran data produksi-staging, keputusan wajib NO-GO.

## 5. Keputusan

Pilih tepat satu:

- [ ] **NO-GO — CI PASS — DEPLOYMENT HOLD**: ada gate FAIL/BLOCKED/NOT PROVEN, bukti tidak lengkap, atau defect kritis/tinggi terbuka.
- [ ] **STAGING VERIFIED — PRODUCTION REVIEW IN PROGRESS**: semua gate staging PASS dengan bukti, sedang menunggu pemeriksaan produksi terakhir dan persetujuan berwenang.
- [ ] **GO FOR PRODUCTION REVIEW / CHANGE WINDOW**: seluruh prasyarat terpenuhi dan persetujuan formal untuk memulai change window telah diberikan. Ini bukan bukti deployment sukses.
- [ ] **DEPLOYMENT VERIFIED**: deployment produksi telah benar-benar dijalankan oleh pihak berwenang, exact target terverifikasi, smoke test pascadeploy dan pemeriksaan pascadeploy lulus. Gunakan hanya setelah ada bukti operasional.

## 6. Tanda tangan

**Engineering / release operator**
- Nama:
- Keputusan:
- Bukti:
- Waktu UTC:

**Security / independent reviewer**
- Nama:
- Keputusan:
- Bukti verifikasi branch protection, RBAC, secrets:
- Waktu UTC:

**Business owner / pemilik sistem**
- Nama:
- Keputusan:
- Pernyataan bahwa data dan laporan dapat direkonsiliasi:
- Waktu UTC:

**Final decision owner**
- Nama dan kewenangan:
- Keputusan final:
- Change/ticket ID:
- Jadwal change window:
- Rollback owner:
- Waktu UTC:

## 7. Catatan setelah deployment (isi hanya setelah GO dan eksekusi nyata)

- Produksi Script ID alias / bukti target tersanitasi:
- Production Deployment ID alias:
- Exact commit:
- Deployment workflow run:
- Health smoke test:
- Login pascadeploy:
- Verifikasi akses dan data:
- Monitoring/peringatan:
- Keputusan pascadeploy:
- Link bukti akhir:

Tidak ada tanda tangan atau status CI yang menggantikan pengujian staging nyata dan verifikasi target. Jika hasil aktual berbeda dari bukti yang diajukan, hentikan release dan kembali ke NO-GO.
