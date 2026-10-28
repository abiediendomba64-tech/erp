# Matriks Bukti Pengujian Staging — ERP Properti & Konstruksi

Matriks ini harus diisi dari hasil staging yang benar-benar dijalankan. Jangan mengisi PASS berdasarkan pembacaan source code atau status CI saja.

## Aturan pengumpulan bukti

- Setiap pengujian memiliki ID, commit SHA, staging run URL, tester, waktu UTC, expected, actual, status, dan evidence URL/artifact.
- Sanitasi token, credential, email yang tidak diperlukan, ID spreadsheet lengkap, serta data pribadi.
- Simpan bukti di lokasi review yang aksesnya dibatasi; referensikan link dari dokumen ini.
- Jangan menulis secret atau isi transaksi sensitif ke workflow log atau audit summary.
- Jika tidak dapat menjalankan uji, tandai \`BLOCKED\` atau \`NOT PROVEN\`, jangan tandai PASS.
- Gunakan hanya akun uji dan data fixture sintetik.

## Bukti minimum per skenario

| ID | Area | Uji / input | Expected result | Bukti wajib | Status |
|---|---|---|---|---|---|
| ENV-01 | Target | Verifikasi Script ID, Deployment ID, Spreadsheet ID | Ketiganya staging-only; bukan production | Target review tersanitasi, reviewer kedua, run URL | BLOCKED |
| CI-01 | Build | Typecheck, test, syntax, build pada commit yang diuji | Semua required checks success pada SHA yang sama | Check URLs + SHA | BLOCKED |
| AUTH-01 | Google login | Login akun Google staging yang terdaftar | Login benar dan server mengembalikan identitas/role terdaftar | Screenshot tersanitasi dan request trace tanpa token | BLOCKED |
| AUTH-02 | Token invalid | Token hilang, rusak, kedaluwarsa, audience salah | Request protected ditolak server | Status/error code tersanitasi per kasus | BLOCKED |
| AUTH-03 | Allowlist | Akun yang tidak terdaftar atau dinonaktifkan | Tidak dapat membaca/menulis workspace | Matriks kasus dan hasil aktual | BLOCKED |
| RBAC-01 | ADMIN | Buka workspace dan operasi administrasi yang diizinkan | Hanya izin ADMIN berhasil | Tabel aksi × hasil aktual | BLOCKED |
| RBAC-02 | KEUANGAN | Coba operasi akuntansi lalu administrasi pengguna | Aksi sesuai kebijakan; aksi admin-only ditolak | Tabel aksi × hasil aktual | BLOCKED |
| RBAC-03 | PROYEK | Coba operasi proyek dan tindakan finance/admin-only | Operasi proyek yang diizinkan sukses; yang dilarang ditolak | Tabel aksi × hasil aktual | BLOCKED |
| RBAC-04 | VIEWER | Coba write lewat UI dan request server yang dibentuk manual | Semua write ditolak di server | Request ID dan hasil penolakan | BLOCKED |
| WS-01 | Workspace | Create, save operational, save accounting, reload | Data tersimpan dan dibaca ulang sama dari staging cloud | Record count, nilai fixture, timestamp | BLOCKED |
| ISO-01 | Isolasi | Cek spreadsheet dan Web App sebelum/sesudah | Tidak ada perubahan di production; tidak ada akses lintas workspace | Bukti target tersanitasi dan before/after | BLOCKED |
| CON-01 | Konflik versi | Sesi A dan B membaca versi N; A simpan, B simpan snapshot lama | B mendapat version conflict; perubahan A tetap ada | Timeline dua sesi, versi, hasil reload | BLOCKED |
| REC-01 | Timeout | Putuskan koneksi/timeout saat write lalu periksa cloud state | Tidak ada retry buta; hasil didamaikan sebelum submit ulang | Error, cloud state, jumlah transaksi sebelum/sesudah | BLOCKED |
| ACC-01 | Jurnal balance | Jurnal valid dengan total debit = kredit | Diterima dan tersimpan sesuai status | Fixture, jurnal, hasil hitung independen | BLOCKED |
| ACC-02 | Jurnal invalid | Debit/kredit tidak seimbang, akun invalid, nilai negatif | Ditolak; tidak ada efek finansial parsial | Request ID, status penolakan, count before/after | BLOCKED |
| ACC-03 | Reversal | Reversal jurnal uji dengan alasan dan referensi asal | Jurnal pembalik konsisten, terlacak; jurnal posted tidak diubah/dihapus | Jurnal asal/pembalik, audit event, rekonsiliasi | BLOCKED |
| DUP-01 | Duplicate submit | Kirim transaksi fixture yang sama dua kali | Satu efek transaksi/jurnal; submit kedua di-reject atau idempotent | Request IDs, counts, saldo/laporan before/after | BLOCKED |
| DUP-02 | Retry | Simulasikan timeout setelah server mungkin menerima write, kemudian retry request sama | Tidak ada posting ganda | Timeline retry, idempotency/reference, counts | BLOCKED |
| AUD-01 | Audit trail | Create/correction/reversal dan penolakan akses | Aktor, waktu, aksi, referensi, alasan koreksi dapat ditelusuri | Audit row yang disanitasi dan record reference | BLOCKED |
| MOD-01 | OCR | Ajukan permintaan OCR saat belum diaktifkan | Error eksplisit; dokumen tidak diproses dan transaksi tidak dibuat | Response, record count before/after | BLOCKED |
| MOD-02 | Drive upload | Coba upload bukti saat belum diaktifkan | Error eksplisit; tidak mengklaim file terunggah | Response dan folder check terbatas | BLOCKED |
| MOD-03 | WA/Telegram | Coba endpoint/webhook saat belum diaktifkan | Ditolak; tidak ada transaksi/balasan sukses palsu | Response, webhook/test trace, record count | BLOCKED |
| REP-01 | Laporan | Hitung manual dari fixture yang diketahui | Output laporan sama dengan perhitungan independen | Fixture, formula, output laporan | BLOCKED |
| BAK-01 | Backup/restore | Ekspor staging lalu restore ke workspace uji terpisah | Jumlah record dan total kunci cocok | Backup hash, count report, restore run | BLOCKED |

## Log eksekusi

| ID | Commit SHA | Run URL | Tester | Waktu UTC | Expected | Actual | Status | Bukti URL | Issue |
|---|---|---|---|---|---|---|---|---|---|
| Contoh format saja — hapus sebelum review final | SHA diuji | URL run | Nama/ID internal | ISO-8601 UTC | Hasil yang diharapkan | Hasil aktual | NOT PROVEN | Link | Issue |

Hapus baris contoh sebelum menyatakan matriks final. Tambahkan satu baris untuk setiap percobaan/retest; jangan menimpa hasil FAIL sebelumnya.

## Ringkasan keputusan

- Total skenario:
- PASS:
- FAIL:
- BLOCKED:
- NOT PROVEN:
- Defect kritis/tinggi terbuka:
- Reviewer:
- Link evidence bundle:
- Waktu review UTC:

Release tidak boleh mendapatkan status staging verified bila masih ada skenario wajib berstatus FAIL, BLOCKED, atau NOT PROVEN.
