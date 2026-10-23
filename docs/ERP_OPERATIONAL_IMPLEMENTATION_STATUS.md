# ERP Operational Modules — Implementation Status

Tanggal: 2026-10-23
Branch: `feat/erp-operational-modules-20261023`

Dokumen ini mencatat ruang lingkup perubahan dan batas fungsinya secara eksplisit. Perubahan dibuat pada branch terpisah; belum dianggap production-ready sebelum CI hijau, review, konfigurasi server, dan uji integrasi nyata.

## Perubahan pada branch

- **QC** — register inspeksi per proyek/unit/tahap/item; hasil Draft/Lulus/Perlu Perbaikan/Ditolak; temuan, tindakan koreksi, tenggat, pemeriksa, dan referensi bukti.
- **Register aset** — kode unik, kategori, proyek, tanggal/nilai perolehan, nilai residu, umur manfaat, lokasi, PIC, status, dan referensi dokumen. Nilai buku adalah estimasi garis lurus di UI saja; belum membuat jurnal penyusutan atau disposal.
- **Register pajak** — PPN/PPh/BPHTB/PBB dan kategori lain, periode, dasar pengenaan, tarif input manual atau nominal manual, sumber aturan wajib, tenggat, status, referensi bayar/pelaporan. Tidak ada tarif asumsi otomatis dan tidak ada komunikasi ke Coretax/DJP.
- **Register unit perumahan** — identitas unit/blok/tipe/luas; status konstruksi/QC, penjualan, PBG/SLF; rujukan RAB, dokumen tanah, izin, kontrak, dan BAST. Status adalah input operator, bukan verifikasi eksternal.
- **RAB** — metadata unit dan luas, sumber harga/AHSP/quotation, nama pemberi persetujuan, alokasi pool biaya bersama per unit, serta validasi agar harga item tidak diam-diam bernilai nol. Unit terisi harus sudah tercatat di Register Unit. RAB tetap terpisah dari pengeluaran kas dan jurnal.
- **Anggaran** — realisasi hanya menghitung pengeluaran Buku Kas dengan bukti yang berstatus terverifikasi dan nominal cocok. Anggaran dengan cakupan proyek tumpang tindih (proyek kosong = semua proyek) ditolak untuk menghindari satu arus kas digunakan pada lebih dari satu anggaran yang overlapping.
- **Koneksi bukti-kas** — verifikasi dan posting membutuhkan ID transaksi Buku Kas yang eksplisit, bukan hanya kode bukti yang bisa dipakai berulang. Sejumlah tampilan dokumen masih bisa memperlihatkan kode yang sama sebagai referensi, tetapi kode saja tidak memvalidasi uang.
- **Pengaturan** — tes WhatsApp/Telegram tidak mengaku sukses tanpa backend. Token integrasi lama di `localStorage` dibersihkan ketika aplikasi dibuka; token tidak disimpan melalui pengaturan baru. Ekspor CSV berjalan, ekspor Excel memakai HTML kompatibel `.xls` (bukan `.xlsx` native), PDF menggunakan dialog print/save-to-PDF, dan backup manual menghasilkan JSON lokal berisi store operasional + akuntansi.
- **Keamanan ekspor** — teks sel Excel-compatible di-escape sebelum dimasukkan ke HTML; teks CSV yang diawali karakter formula spreadsheet diberi prefix aman.
- **Audit log modul baru** — QC, aset, pajak, unit, dan RAB mencatat perubahan di audit log lokal, dengan label jelas bahwa identitas pengguna belum diverifikasi server.

## Batas yang belum diimplementasikan

| Area | Status sekarang | Syarat sebelum produksi |
|---|---|---|
| Sumber data | Store operasional dan akuntansi masih di browser/localStorage terpisah | Backend/cloud database sebagai sumber utama, migrasi idempotent, kontrol konflik dan rollback |
| Autentikasi/otorisasi | Switch Admin/Viewer tetap hanya mode tampilan UI | Login server-side, permission enforcement di API/database, uji akses negatif |
| Sync multi-perangkat | Belum ada | Uji dua browser/pengguna, konflik update, offline/retry dan pemulihan |
| Google Drive / Sheets | Belum aktif; URL/ID dokumen hanya referensi | OAuth/scopes, backend credential, upload/download, CRUD spreadsheet, reconciliation end-to-end |
| Lampiran | File lokal tetap tersimpan di IndexedDB browser | Upload storage bersama, ACL, checksum, limit, backup/restore attachments |
| WhatsApp/Telegram | Tidak ada request yang dikirim oleh tombol test | Secret store server, endpoint resmi, webhook, retry/idempotency dan uji respons sebenarnya |
| PDF / DOCX / XLSX native | PDF lewat print, Excel kompatibel `.xls`; belum ada generator DOCX/XLSX native pada alur ini | Berkas valid yang dapat dibuka aplikasi target, uji format/paginasi, export/import roundtrip |
| Pajak | Register dan perhitungan yang pengguna masukkan | Validasi aturan yang berlaku oleh akuntan/pajak dan integrasi resmi jika tersedia |
| Aset tetap | Register + estimasi nilai buku saja | Kebijakan umur manfaat, convention, jurnal penyusutan, rekonsiliasi buku besar dan disposal |
| Unit cycle | Referensi/status lintas tahap manual | RAB/kontrak/progres/QC/penjualan/BAST terhubung via foreign key dan workflow yang diuji |
| QC | Checklist dan status operator | Standar toleransi per tipe pekerjaan, lampiran, sign-off berotorisasi, NCR/CAPA dan handover |
| Backup | Unduhan JSON lokal; attachment IndexedDB tidak termasuk | Restore yang divalidasi, enkripsi bila perlu, cloud backup terjadwal serta uji pemulihan |
| Rilis perangkat | React web | PWA manifest/install/offline behavior diuji pada Android/iOS; native app tidak otomatis dihasilkan |

## Perintah quality gate

Jalankan dari repo setelah branch diambil:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

CI harus diperiksa pada commit branch ini. Build hijau saja tidak membuktikan integrasi live; lakukan uji manual dan negative-case berikut:

1. Tambah/edit QC, aset, pajak, unit dan RAB; reload browser untuk memastikan persistensi lokal dan periksa audit log.
2. Tolak RAB tanpa harga positif, RAB non-Draft tanpa sumber harga/pemberi persetujuan, biaya bersama tanpa unit alokasi, dan kode unit yang tidak terdaftar.
3. Tolak satu bukti dengan ID transaksi kas kosong/tidak ada; coba gunakan kode bukti yang sama ke transaksi lain; pastikan hanya ID target yang dapat diverifikasi/posting.
4. Pastikan realisasi anggaran tidak menghitung baris tanpa bukti terverifikasi/nominal cocok; tolak rentang anggaran proyek yang overlapping.
5. Pastikan tombol tes integrasi tidak menampilkan sukses dan tidak membuat log pesan palsu.
6. Pastikan backup JSON dapat diunduh, tidak berisi token, dan jelaskan bahwa file lampiran IndexedDB tidak termasuk.
7. Uji dua browser/perangkat, login/permission, Drive/Sheets, file PDF/DOCX/XLSX dan restore sebelum mengklaim production-ready.

## Catatan migrasi dan data historis

Jangan menghapus atau menimpa data buku kas/tanah/beko yang telah ada. Baris berstatus `PERLU_KONFIRMASI`, agregat historis, dan dokumen metadata tanpa file asli harus tetap diperlakukan sebagai belum terverifikasi. Data QC/aset/pajak/unit baru sengaja mulai kosong agar tidak tercipta data operasional fiktif.
