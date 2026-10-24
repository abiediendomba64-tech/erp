# Google Cloud ERP — implementasi bertahap

## Arsitektur
- Google Apps Script (Code.gs + CloudApi.gs) menjadi backend.
- Google Sheets menyimpan pengguna, keanggotaan workspace, versi snapshot, record ERP, dan audit log.
- Google Drive menyimpan dokumen; snapshot ERP menyimpan metadata/tautan, bukan file biner.
- Google Sign-In ID token diverifikasi di server. Token sesi aplikasi disimpan sebagai hash di AUTH_SESSIONS.
- Penyimpanan workspace memakai expectedVersion untuk mendeteksi konflik lintas perangkat dan event append-only.
- OCR hanya menghasilkan draft Pending; OCR tidak membuat transaksi kas/jurnal final.

## Endpoint cloud
POST ke URL Web App dengan query ?path=%2Fcloud-api dan body JSON:
- auth.health (publik, hanya status backend)
- auth.login dengan idToken Google Sign-In
- auth.me, auth.logout
- workspace.list, workspace.create, workspace.load, state.save
- users.list, users.upsert, workspace.member.add (admin)
- document.upload, ocr.process

## Script Properties wajib
- SPREADSHEET_ID
- GOOGLE_CLIENT_ID
- INITIAL_ADMIN_EMAIL
- DOCUMENTS_FOLDER_ID (upload/OCR Drive)
- GEMINI_API_KEY (OCR)

Jangan simpan rahasia di source React atau GitHub. Akun pertama yang boleh auto-enroll harus sama dengan INITIAL_ADMIN_EMAIL.

## CORS dan hosting
Google Apps Script Web App tidak menyediakan kontrol header CORS yang dapat dikonfigurasi bebas. Jangan menganggap fetch dari domain React terpisah sudah berfungsi hanya karena build sukses. Pilihan tanpa backend berbayar adalah menyajikan panel dari Apps Script HtmlService/same-origin atau melakukan browser integration test pada hosting yang digunakan sebelum mengaktifkan fitur. Jangan memakai mode no-cors karena respons tidak dapat dibaca dan aplikasi tidak bisa memastikan penyimpanan berhasil.

## Batasan dan syarat rilis
Apps Script memiliki kuota harian dan batas waktu eksekusi. Backend membatasi snapshot hingga 1,5 juta karakter, record hingga 30.000 karakter, upload bukti hingga 4 MB, dan menolak lebih dari 150 perubahan per penyimpanan. Sheets bukan database relasional: gunakan ID stabil, lock, version check, dan jangan memakai nomor baris sebagai ID.

PENTING: routing cloud API kini tersedia, tetapi integrasi store React, UI Google Sign-In, konfigurasi Apps Script, pengujian concurrency/role/CORS, dan verifikasi lintas perangkat masih harus diselesaikan sebelum menyebut ERP siap produksi.