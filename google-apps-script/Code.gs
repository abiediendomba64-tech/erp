/**
 * GOOGLE APPS SCRIPT - BACKEND LENGKAP
 * 
 * CARA SETUP:
 * 1. Buka Google Sheets Anda
 * 2. Extensions → Apps Script
 * 3. Copy-paste semua kode ini
 * 4. Ganti GEMINI_API_KEY dengan API key Anda dari aistudio.google.com
 * 5. Deploy → New deployment → Web app → Access: Anyone
 * 6. Copy URL deployment untuk digunakan di React frontend
 * 
 * FITUR:
 * ✅ OCR Kwitansi dengan Gemini Vision
 * ✅ Webhook WhatsApp/Telegram
 * ✅ Auto-generate Jurnal Double-Entry
 * ✅ Reversal Journal (koreksi tanpa edit)
 * ✅ Audit Trail otomatis
 * ✅ Integrasi Google Sheets native
 */

// ============ KONFIGURASI ============
const SPREADSHEET_ID = (function () {
  const configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return configuredId || (activeSpreadsheet ? activeSpreadsheet.getId() : '');
})();

function getErpSpreadsheet_() {
  if (!SPREADSHEET_ID) {
    throw new Error('Spreadsheet belum dikonfigurasi. Set Script Property SPREADSHEET_ID atau pasang Apps Script pada Google Sheet.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getGeminiApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY belum diatur di Apps Script > Project Settings > Script Properties.');
  return key;
}

function readSheetRecords(sheetName) {
  const sheet = getErpSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(value => String(value || '').trim());
  return rows.slice(1)
    .filter(row => row.some(value => value !== '' && value !== null))
    .map(row => headers.reduce((record, header, index) => {
      if (header) record[header] = row[index];
      return record;
    }, {}));
}

function ensureSheetHeaders_(sheet, requiredHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return requiredHeaders.slice();
  }
  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, width).getValues()[0].map(value => String(value || '').trim());
  requiredHeaders.forEach(header => {
    if (!existing.includes(header)) {
      existing.push(header);
      sheet.getRange(1, existing.length).setValue(header);
    }
  });
  return existing;
}

// ============ WEBHOOK HANDLERS ============

/**
 * Handle GET requests (untuk testing)
 */
function doGet(e) {
  try {
    const path = e && e.parameter && e.parameter.path ? e.parameter.path : '/health';

    if (path === '/transaksi') return jsonResponse(readSheetRecords('BUKU_KAS'));
    if (path === '/akun') return jsonResponse(readSheetRecords('AKUN'));
    if (path === '/laporan/laba-rugi') return jsonResponse(generateLabaRugi());
    if (path === '/laporan/neraca') return jsonResponse(generateNeraca());

    return jsonResponse({
      status: 'OK',
      message: 'ERP Backend API is running',
      endpoints: [
        'GET /transaksi',
        'GET /akun',
        'GET /laporan/laba-rugi',
        'GET /laporan/neraca',
        'POST /transaksi',
        'POST /reversal',
        'POST /ocr',
        'POST /webhook/whatsapp',
        'POST /webhook/telegram'
      ]
    });
  } catch (error) {
    return jsonResponse({ success: false, error: String(error && error.message ? error.message : error) });
  }
}



/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    const path = e && e.parameter && e.parameter.path ? e.parameter.path : '';
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '';
    const data = rawBody ? JSON.parse(rawBody) : {};

    if (path === '/ocr') return jsonResponse(handleOCR(data));
    if (path === '/webhook/whatsapp') return jsonResponse(handleWhatsAppWebhook(data));
    if (path === '/webhook/telegram') return jsonResponse(handleTelegramWebhook(data));
    if (path === '/transaksi') return jsonResponse(handleAddTransaksi(data));
    if (path === '/reversal') return jsonResponse(handleReversal(data));

    if (path.indexOf('/transaksi/') === 0) {
      return jsonResponse({
        success: false,
        error: 'Update/hapus transaksi posted tidak didukung. Gunakan reversal jurnal agar audit trail tetap utuh.'
      });
    }
    return jsonResponse({ success: false, error: 'Endpoint tidak dikenal: ' + path });
  } catch (error) {
    return jsonResponse({ success: false, error: String(error && error.message ? error.message : error) });
  }
}



// ============ OCR FUNCTIONS ============

/**
 * OCR Kwitansi dengan Gemini Vision API
 * @param {Object} data - { imageUrl: string }
 * @returns {Object} - { vendor, tanggal, total, kategori, confidence }
 */
function handleOCR(data) {
  const imageUrl = String(data.imageUrl || '').trim();
  const documentType = String(data.jenisDokumen || 'Kwitansi');
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    throw new Error('OCR membutuhkan URL gambar HTTP/HTTPS yang bisa diakses Apps Script.');
  }
  if (!['Kwitansi', 'Nota', 'Transfer_Bank', 'Lainnya'].includes(documentType)) {
    throw new Error('Jenis dokumen OCR tidak dikenal.');
  }
  if (!imageUrl) {
    throw new Error('imageUrl is required');
  }
  
  // Download gambar
  const blob = UrlFetchApp.fetch(imageUrl).getBlob();
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  // Kirim ke Gemini API
  const apiKey = getGeminiApiKey_();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [
        { 
          text: `Ekstrak data dari kwitansi/faktur ini dan kembalikan dalam format JSON dengan field:
- vendor: nama penjual/supplier (string)
- tanggal: tanggal dalam format YYYY-MM-DD (string)
- total: total amount dalam angka (number)
- kategori: kategori transaksi (string, pilih dari: tanah, beko, material, operasional, lain-lain)
- nomor_bukti: nomor kwitansi/invoice jika ada (string)
- keterangan: deskripsi singkat (string)
- confidence: skor kepercayaan 0-100 (number)

Jika field tidak ditemukan, isi dengan null. Kembalikan HANYA JSON, tanpa teks lain.`
        },
        { 
          inline_data: { 
            mime_type: blob.getContentType(), 
            data: base64 
          } 
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());
  
  // Parse hasil OCR
  if (result.candidates && result.candidates[0] && result.candidates[0].content) {
    const text = result.candidates[0].content.parts[0].text;
    
    // Extract JSON dari response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const ocrData = JSON.parse(jsonMatch[0]);
      
      // Simpan ke sheet ARSIP_BUKTI
      saveToArsipBukti(ocrData, imageUrl, documentType);
      
      return {
        success: true,
        data: ocrData,
        message: 'OCR berhasil. Hasil disimpan sebagai Perlu_Konfirmasi; confidence tidak dianggap sebagai persetujuan manusia.'
      };
    }
  }
  
  throw new Error('Gagal parse hasil OCR: ' + JSON.stringify(result));
}

/**
 * Simpan hasil OCR ke sheet ARSIP_BUKTI
 */
function saveToArsipBukti(ocrData, imageUrl, documentType) {
  const ss = getErpSpreadsheet_();
  let sheet = ss.getSheetByName('ARSIP_BUKTI');
  
  if (!sheet) {
    sheet = ss.insertSheet('ARSIP_BUKTI');
    sheet.appendRow(['id', 'kode_bukti', 'jenis', 'link_drive', 'tgl_upload', 'terverifikasi', 'catatan_audit', 'penerima', 'nominal', 'keterangan', 'confidence', 'created_at']);
  }
  
  const id = 'BUKTI-' + new Date().getTime();
  const confidence = Number(ocrData.confidence) || 0;
  const documentTypes = {
    Kwitansi: 'Kwitansi_Foto',
    Nota: 'Nota_Foto',
    Transfer_Bank: 'Transfer_Bank',
    Lainnya: 'Lainnya'
  };
  // Confidence is only a model score, not human authorization.
  const status = 'Perlu_Konfirmasi';
  
  sheet.appendRow([
    id,
    ocrData.nomor_bukti || '',
    documentTypes[documentType] || 'Kwitansi_Foto',
    imageUrl,
    new Date().toISOString().split('T')[0],
    status,
    `OCR confidence: ${confidence}%`,
    ocrData.vendor || '',
    ocrData.total || 0,
    ocrData.keterangan || '',
    confidence,
    new Date().toISOString()
  ]);
}

// ============ WHATSAPP WEBHOOK ============

/**
 * Handle WhatsApp webhook
 * @param {Object} data - WhatsApp webhook payload
 */
function handleWhatsAppWebhook(data) {
  // Extract message data
  const entry = data.entry && data.entry[0];
  if (!entry) return { success: false, message: 'No entry found' };
  
  const changes = entry.changes && entry.changes[0];
  if (!changes) return { success: false, message: 'No changes found' };
  
  const value = changes.value;
  const messages = value.messages;
  
  if (!messages || messages.length === 0) {
    return { success: false, message: 'No messages found' };
  }
  
  const message = messages[0];
  const messageType = message.type;
  const from = message.from;
  
  // Handle image message
  if (messageType === 'image') {
    const imageId = message.image.id;
    const caption = message.image.caption || '';
    
    // Download image dari WhatsApp
    const imageUrl = downloadWhatsAppMedia(imageId);
    
    // OCR gambar
    const ocrResult = handleOCR({ imageUrl: imageUrl });
    
    // Kirim konfirmasi ke WhatsApp
    sendWhatsAppMessage(from, `✅ Kwitansi berhasil diproses:\n\nVendor: ${ocrResult.data.vendor}\nTotal: Rp${ocrResult.data.total?.toLocaleString('id-ID')}\nTanggal: ${ocrResult.data.tanggal}\n\nData sudah masuk ke sistem.`);
    
    return { success: true, message: 'Image processed', ocrResult: ocrResult };
  }
  
  // Handle text message
  if (messageType === 'text') {
    const text = message.text.body;
    
    // Parse command
    if (text.toLowerCase().includes('saldo')) {
      const saldo = getSaldoKas();
      sendWhatsAppMessage(from, `💰 Saldo Kas: Rp${saldo.toLocaleString('id-ID')}`);
    } else if (text.toLowerCase().includes('laporan')) {
      const laporan = generateLabaRugi();
      sendWhatsAppMessage(from, `📊 Laba Rugi:\n\nPendapatan: Rp${laporan.total_pendapatan.toLocaleString('id-ID')}\nBeban: Rp${laporan.total_beban.toLocaleString('id-ID')}\nLaba Bersih: Rp${laporan.laba_bersih.toLocaleString('id-ID')}`);
    } else {
      sendWhatsAppMessage(from, 'Perintah tidak dikenali. Kirim "saldo" atau "laporan".');
    }
    
    return { success: true, message: 'Text message processed' };
  }
  
  return { success: false, message: 'Unsupported message type' };
}

/**
 * Download media dari WhatsApp
 */
function downloadWhatsAppMedia(mediaId) {
  // Implementasi ini memerlukan WhatsApp Cloud API access token
  // Untuk saat ini, return placeholder
  // TODO: Implementasi dengan WhatsApp Cloud API
  
  const accessToken = PropertiesService.getScriptProperties().getProperty('WHATSAPP_ACCESS_TOKEN');
  const url = `https://graph.facebook.com/v18.0/${mediaId}`;
  
  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  return data.url;
}

/**
 * Kirim pesan WhatsApp
 */
function sendWhatsAppMessage(to, message) {
  // Implementasi ini memerlukan WhatsApp Cloud API
  // TODO: Implementasi dengan WhatsApp Cloud API
  
  const accessToken = PropertiesService.getScriptProperties().getProperty('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = PropertiesService.getScriptProperties().getProperty('WHATSAPP_PHONE_NUMBER_ID');
  
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    text: { body: message }
  };
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  UrlFetchApp.fetch(url, options);
}

// ============ TELEGRAM WEBHOOK ============

/**
 * Handle Telegram webhook
 */
function handleTelegramWebhook(data) {
  const message = data.message;
  if (!message) return { success: false };
  
  const chatId = message.chat.id;
  const text = message.text;
  
  // Handle photo
  if (message.photo) {
    const photo = message.photo[message.photo.length - 1]; // Get highest resolution
    const fileId = photo.file_id;
    
    // Download photo dari Telegram
    const photoUrl = downloadTelegramPhoto(fileId);
    
    // OCR photo
    const ocrResult = handleOCR({ imageUrl: photoUrl });
    
    // Kirim konfirmasi ke Telegram
    sendTelegramMessage(chatId, `✅ Kwitansi berhasil diproses:\n\nVendor: ${ocrResult.data.vendor}\nTotal: Rp${ocrResult.data.total?.toLocaleString('id-ID')}\nTanggal: ${ocrResult.data.tanggal}`);
    
    return { success: true, ocrResult: ocrResult };
  }
  
  // Handle text command
  if (text) {
    if (text === '/saldo') {
      const saldo = getSaldoKas();
      sendTelegramMessage(chatId, `💰 Saldo Kas: Rp${saldo.toLocaleString('id-ID')}`);
    } else if (text === '/laporan') {
      const laporan = generateLabaRugi();
      sendTelegramMessage(chatId, `📊 Laba Rugi:\n\nPendapatan: Rp${laporan.total_pendapatan.toLocaleString('id-ID')}\nBeban: Rp${laporan.total_beban.toLocaleString('id-ID')}\nLaba Bersih: Rp${laporan.laba_bersih.toLocaleString('id-ID')}`);
    }
  }
  
  return { success: true };
}

/**
 * Download photo dari Telegram
 */
function downloadTelegramPhoto(fileId) {
  const botToken = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  
  // Get file path
  const url = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());
  
  const filePath = data.result.file_path;
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}

/**
 * Kirim pesan Telegram
 */
function sendTelegramMessage(chatId, text) {
  const botToken = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text
  };
  
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

// ============ TRANSAKSI FUNCTIONS ============

/**
 * Tambah transaksi baru + auto-generate jurnal
 */
function handleAddTransaksi(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getErpSpreadsheet_();
    const transaksiSheet = ss.getSheetByName('BUKU_KAS') || ss.insertSheet('BUKU_KAS');
    const jurnalSheet = ss.getSheetByName('JURNAL') || ss.insertSheet('JURNAL');

    const cashHeaders = ensureSheetHeaders_(transaksiSheet, [
      'id', 'tanggal', 'no_ref', 'kode_bukti', 'keterangan', 'kategori',
      'masuk', 'keluar', 'status_verifikasi', 'created_at', 'jenis', 'idempotency_key'
    ]);
    ensureSheetHeaders_(jurnalSheet, [
      'id', 'transaksi_id', 'tanggal', 'akun_kode', 'akun_nama',
      'debit', 'kredit', 'keterangan', 'created_at'
    ]);

    const idempotencyKey = String(data.idempotency_key || data.request_id || '').trim();
    if (idempotencyKey) {
      const existing = readSheetRecords('BUKU_KAS').find(record =>
        String(record.idempotency_key || '') === idempotencyKey
      );
      if (existing) {
        return { success: true, duplicate: true, transaksi_id: existing.id, message: 'Permintaan duplikat diabaikan.' };
      }
    }

    const transactionDate = String(data.tanggal || '');
    const description = String(data.keterangan || '').trim();
    const amount = Number(data.jumlah);
    const vat = data.ppn === undefined || data.ppn === null || data.ppn === '' ? 0 : Number(data.ppn);
    const type = String(data.jenis || data.tipe || '').trim().toLowerCase().replace(/[ -]+/g, '_');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) || isNaN(Date.parse(transactionDate))) {
      throw new Error('Tanggal harus berformat YYYY-MM-DD.');
    }
    if (!description) throw new Error('Keterangan transaksi wajib diisi.');

    const accountSheet = ss.getSheetByName('AKUN');
    if (!accountSheet || accountSheet.getLastRow() < 2) {
      throw new Error('Daftar akun kosong. Jalankan setupDatabase() terlebih dahulu.');
    }
    const accountRows = accountSheet.getDataRange().getValues();
    const accountNames = {};
    for (let i = 1; i < accountRows.length; i++) accountNames[String(accountRows[i][0])] = String(accountRows[i][1]);

    const journalEntries = generateJurnalDoubleEntry({
      ...data,
      tanggal: transactionDate,
      keterangan: description,
      jenis: type,
      jumlah: amount,
      ppn: vat
    });
    if (!journalEntries.length || journalEntries.length < 2) throw new Error('Transaksi tidak menghasilkan jurnal yang lengkap.');

    let totalDebit = 0;
    let totalKredit = 0;
    journalEntries.forEach(entry => {
      if (!accountNames[entry.akun_kode]) throw new Error('Akun tidak ditemukan: ' + entry.akun_kode + '. Jalankan setupDatabase().');
      if (!isFinite(entry.debit) || !isFinite(entry.kredit) || entry.debit < 0 || entry.kredit < 0 ||
          (entry.debit > 0 && entry.kredit > 0)) {
        throw new Error('Baris jurnal tidak valid untuk akun ' + entry.akun_kode);
      }
      totalDebit += entry.debit;
      totalKredit += entry.kredit;
      entry.akun_nama = accountNames[entry.akun_kode];
    });
    if (Math.abs(totalDebit - totalKredit) > 0.005 || totalDebit <= 0) {
      throw new Error('Jurnal tidak balance. Debit=' + totalDebit + ', Kredit=' + totalKredit);
    }

    const transaksiId = 'TRX-' + Utilities.getUuid();
    const jurnalId = 'JRN-' + Utilities.getUuid();
    const gross = (Number(data.jumlah) || 0) + vat;
    let cashIn = 0;
    let cashOut = 0;
    if (type === 'penjualan_tunai' || type === 'terima_pembayaran_piutang' || type === 'pembayaran_piutang' || type === 'penerimaan_kas') {
      cashIn = type === 'penjualan_tunai' ? gross : amount;
    } else if (type === 'pembelian_tunai') {
      cashOut = gross;
    } else if (type === 'bayar_utang' || type === 'pembayaran_utang' || type === 'beban_operasional' || type === 'catat_beban' || type === 'pengeluaran_kas') {
      cashOut = amount;
    } else if (!type && Number(data.masuk || 0) > 0) {
      cashIn = Number(data.masuk);
    } else if (!type && Number(data.keluar || 0) > 0) {
      cashOut = Number(data.keluar);
    }

    const cashRow = new Array(cashHeaders.length).fill('');
    const cashRecord = {
      id: transaksiId,
      tanggal: transactionDate,
      no_ref: String(data.referensi || data.no_ref || transaksiId),
      kode_bukti: String(data.kode_bukti || ''),
      keterangan: description,
      kategori: String(data.kategori || type || 'Operasional'),
      masuk: cashIn,
      keluar: cashOut,
      status_verifikasi: String(data.status_verifikasi || 'MENUNGGU_VERIFIKASI'),
      created_at: new Date().toISOString(),
      jenis: type || 'legacy',
      idempotency_key: idempotencyKey
    };
    cashHeaders.forEach((header, index) => cashRow[index] = cashRecord[header] === undefined ? '' : cashRecord[header]);

    const timestamp = new Date().toISOString();
    const journalRows = journalEntries.map((entry, index) => [
      jurnalId + '-' + String(index + 1).padStart(3, '0'),
      transaksiId,
      transactionDate,
      entry.akun_kode,
      entry.akun_nama,
      entry.debit,
      entry.kredit,
      entry.keterangan || description,
      timestamp
    ]);

    const startTransactionRow = transaksiSheet.getLastRow() + 1;
    const startJournalRow = jurnalSheet.getLastRow() + 1;
    try {
      transaksiSheet.getRange(startTransactionRow, 1, 1, cashRow.length).setValues([cashRow]);
      jurnalSheet.getRange(startJournalRow, 1, journalRows.length, journalRows[0].length).setValues(journalRows);
    } catch (writeError) {
      if (transaksiSheet.getLastRow() >= startTransactionRow &&
          transaksiSheet.getRange(startTransactionRow, 1).getValue() === transaksiId) {
        transaksiSheet.deleteRow(startTransactionRow);
      }
      if (jurnalSheet.getLastRow() >= startJournalRow &&
          jurnalSheet.getRange(startJournalRow, 2).getValue() === transaksiId) {
        jurnalSheet.deleteRows(startJournalRow, jurnalSheet.getLastRow() - startJournalRow + 1);
      }
      throw writeError;
    }

    logAudit('CREATE', 'BUKU_KAS', transaksiId, '-', JSON.stringify({
      jenis: type, keterangan: description, jumlah: amount, ppn: vat,
      total_debit: totalDebit, total_kredit: totalKredit
    }));

    return {
      success: true,
      transaksi_id: transaksiId,
      jurnal_id: jurnalId,
      jurnal_entries: journalEntries.length,
      total_debit: totalDebit,
      total_kredit: totalKredit,
      message: 'Transaksi dan jurnal berhasil disimpan'
    };
  } finally {
    lock.releaseLock();
  }
}



/**
 * Generate jurnal double-entry dari transaksi
 */
function generateJurnalDoubleEntry(transaksi) {
  const amount = Number(transaksi.jumlah);
  const ppn = transaksi.ppn === undefined || transaksi.ppn === null || transaksi.ppn === '' ? 0 : Number(transaksi.ppn);
  const type = String(transaksi.jenis || transaksi.tipe || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  const description = String(transaksi.keterangan || '').trim();

  const add = (kode, debit, kredit, keterangan) => ({
    akun_kode: kode, akun_nama: '', debit, kredit, keterangan: keterangan || description
  });

  // Support legacy cashbook payloads as well as the seven guided transaction types.
  if (!type) {
    const cashIn = Number(transaksi.masuk || 0);
    const cashOut = Number(transaksi.keluar || 0);
    if ((cashIn > 0) === (cashOut > 0)) throw new Error('Isi tepat satu nilai positif: masuk atau keluar.');
    if (cashIn > 0) return [
      add('1-1001', cashIn, 0),
      add(String(transaksi.sumber_akun || '4-1001'), 0, cashIn)
    ];
    return [
      add(String(transaksi.beban_akun || '5-2008'), cashOut, 0),
      add('1-1001', 0, cashOut)
    ];
  }

  if (!isFinite(amount) || amount <= 0) throw new Error('Jumlah transaksi harus lebih besar dari nol.');
  if (!isFinite(ppn) || ppn < 0) throw new Error('PPN harus bernilai nol atau lebih.');
  if (ppn > 0 && !['penjualan_tunai','penjualan_kredit','pembelian_tunai','pembelian_kredit'].includes(type)) {
    throw new Error('PPN hanya dapat diisi pada penjualan/pembelian.');
  }

  switch (type) {
    case 'penjualan_tunai':
      return [
        add('1-1001', amount + ppn, 0),
        add('4-1001', 0, amount),
        ...(ppn > 0 ? [add('2-1003', 0, ppn)] : [])
      ];
    case 'penjualan_kredit':
      if (!String(transaksi.pihak || '').trim()) throw new Error('Nama pelanggan wajib diisi untuk penjualan kredit.');
      return [
        add('1-1003', amount + ppn, 0),
        add('4-1001', 0, amount),
        ...(ppn > 0 ? [add('2-1003', 0, ppn)] : [])
      ];
    case 'pembelian_tunai':
      return [
        add('1-1004', amount, 0),
        ...(ppn > 0 ? [add('1-1006', ppn, 0)] : []),
        add('1-1001', 0, amount + ppn)
      ];
    case 'pembelian_kredit':
      if (!String(transaksi.pihak || '').trim()) throw new Error('Nama supplier wajib diisi untuk pembelian kredit.');
      return [
        add('1-1004', amount, 0),
        ...(ppn > 0 ? [add('1-1006', ppn, 0)] : []),
        add('2-1001', 0, amount + ppn)
      ];
    case 'terima_pembayaran_piutang':
    case 'pembayaran_piutang':
      if (!String(transaksi.pihak || '').trim()) throw new Error('Nama pelanggan wajib diisi untuk penerimaan piutang.');
      return [add('1-1001', amount, 0), add('1-1003', 0, amount)];
    case 'bayar_utang':
    case 'pembayaran_utang':
      if (!String(transaksi.pihak || '').trim()) throw new Error('Nama supplier wajib diisi untuk pembayaran utang.');
      return [add('2-1001', amount, 0), add('1-1001', 0, amount)];
    case 'beban_operasional':
    case 'catat_beban':
      return [
        add(String(transaksi.akunBeban || transaksi.akun_beban || transaksi.beban_akun || '5-2008'), amount, 0),
        add('1-1001', 0, amount)
      ];
    default:
      throw new Error('Jenis transaksi belum didukung: ' + type);
  }
}



// ============ REVERSAL FUNCTIONS ============

/**
 * Reversal jurnal (koreksi tanpa edit)
 */
function handleReversal(data) {
  const transaksiId = data.transaksi_id;
  const alasan = data.alasan || 'Reversal';
  
  const ss = getErpSpreadsheet_();
  const jurnalSheet = ss.getSheetByName('JURNAL');
  
  if (!jurnalSheet) {
    throw new Error('Sheet JURNAL tidak ditemukan');
  }
  
  // Cari jurnal original
  const jurnalData = jurnalSheet.getDataRange().getValues();
  const originalEntries = jurnalData.filter(row => row[1] === transaksiId);
  if (jurnalData.some(row => row[1] === transaksiId + '-REVERSAL')) {
    throw new Error('Transaksi ini sudah dibalik. Reversal kedua ditolak untuk mencegah saldo ganda.');
  }
  
  if (originalEntries.length === 0) {
    throw new Error('Transaksi tidak ditemukan');
  }
  
  // Generate reversal entries (swap debit/kredit)
  const reversalJurnalId = 'REV-' + new Date().getTime();
  const reversalEntries = [];
  
  originalEntries.forEach(entry => {
    reversalEntries.push({
      akun_kode: entry[3],
      akun_nama: entry[4],
      debit: entry[5], // Swap: original kredit jadi reversal debit
      kredit: entry[6], // Swap: original debit jadi reversal kredit
      keterangan: `REVERSAL: ${alasan} (dari ${transaksiId})`
    });
  });
  
  // Simpan reversal entries
  reversalEntries.forEach(entry => {
    jurnalSheet.appendRow([
      reversalJurnalId + '-' + Math.random().toString(36).substr(2, 9),
      transaksiId + '-REVERSAL',
      new Date().toISOString().split('T')[0],
      entry.akun_kode,
      entry.akun_nama,
      entry.kredit, // Swap
      entry.debit,  // Swap
      entry.keterangan,
      new Date().toISOString()
    ]);
  });
  
  // Log ke audit trail
  logAudit('REVERSAL', 'JURNAL', transaksiId, 'Original', `Reversal: ${alasan}`);
  
  return {
    success: true,
    reversal_jurnal_id: reversalJurnalId,
    original_transaksi_id: transaksiId,
    reversal_entries: reversalEntries.length,
    message: 'Reversal berhasil. Jurnal original tetap ada, jurnal pembalik ditambahkan.'
  };
}

// ============ LAPORAN FUNCTIONS ============

/**
 * Generate laporan Laba Rugi
 */
function generateLabaRugi() {
  const ss = getErpSpreadsheet_();
  const jurnalSheet = ss.getSheetByName('JURNAL');
  
  if (!jurnalSheet || jurnalSheet.getLastRow() === 0) {
    return { total_pendapatan: 0, total_beban: 0, laba_bersih: 0 };
  }
  
  const jurnalData = jurnalSheet.getDataRange().getValues();
  let totalPendapatan = 0;
  let totalBeban = 0;
  
  // Skip header row
  for (let i = 1; i < jurnalData.length; i++) {
    const akunKode = jurnalData[i][3];
    const debit = jurnalData[i][5] || 0;
    const kredit = jurnalData[i][6] || 0;
    
    // Pendapatan (4-xxxx) - saldo normal kredit
    if (akunKode && akunKode.startsWith('4-')) {
      totalPendapatan += kredit - debit;
    }
    // Beban (5-xxxx) - saldo normal debit
    else if (akunKode && akunKode.startsWith('5-')) {
      totalBeban += debit - kredit;
    }
  }
  
  return {
    total_pendapatan: totalPendapatan,
    total_beban: totalBeban,
    laba_bersih: totalPendapatan - totalBeban
  };
}

/**
 * Generate laporan Neraca
 */
function generateNeraca() {
  const ss = getErpSpreadsheet_();
  const jurnalSheet = ss.getSheetByName('JURNAL');
  
  if (!jurnalSheet || jurnalSheet.getLastRow() === 0) {
    return { total_aset: 0, total_kewajiban: 0, total_ekuitas: 0, balance: true };
  }
  
  const jurnalData = jurnalSheet.getDataRange().getValues();
  let totalAset = 0;
  let totalKewajiban = 0;
  let totalEkuitas = 0;
  
  // Skip header row
  for (let i = 1; i < jurnalData.length; i++) {
    const akunKode = jurnalData[i][3];
    const debit = jurnalData[i][5] || 0;
    const kredit = jurnalData[i][6] || 0;
    
    if (!akunKode) continue;
    
    // Aset (1-xxxx) - saldo normal debit
    if (akunKode.startsWith('1-')) {
      totalAset += debit - kredit;
    }
    // Kewajiban (2-xxxx) - saldo normal kredit
    else if (akunKode.startsWith('2-')) {
      totalKewajiban += kredit - debit;
    }
    // Ekuitas (3-xxxx) - saldo normal kredit
    else if (akunKode.startsWith('3-')) {
      totalEkuitas += kredit - debit;
    }
  }
  
  return {
    total_aset: totalAset,
    total_kewajiban: totalKewajiban,
    total_ekuitas: totalEkuitas,
    balance: Math.abs(totalAset - (totalKewajiban + totalEkuitas)) < 1 // Allow small rounding differences
  };
}

/**
 * Get saldo kas
 */
function getSaldoKas() {
  const ss = getErpSpreadsheet_();
  const jurnalSheet = ss.getSheetByName('JURNAL');
  
  if (!jurnalSheet || jurnalSheet.getLastRow() === 0) {
    return 0;
  }
  
  const jurnalData = jurnalSheet.getDataRange().getValues();
  let saldoKas = 0;
  
  for (let i = 1; i < jurnalData.length; i++) {
    const akunKode = jurnalData[i][3];
    const debit = jurnalData[i][5] || 0;
    const kredit = jurnalData[i][6] || 0;
    
    if (akunKode === '1-1001') { // Kas
      saldoKas += debit - kredit;
    }
  }
  
  return saldoKas;
}

// ============ AUDIT LOG ============

/**
 * Log aktivitas ke audit trail
 */
function logAudit(aksi, tabel, recordId, nilaiLama, nilaiBaru) {
  const ss = getErpSpreadsheet_();
  let sheet = ss.getSheetByName('AUDIT_LOG');
  
  if (!sheet) {
    sheet = ss.insertSheet('AUDIT_LOG');
    sheet.appendRow(['id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan']);
  }
  
  const user = Session.getActiveUser().getEmail() || 'System';
  
  sheet.appendRow([
    'LOG-' + new Date().getTime(),
    new Date().toISOString(),
    user,
    aksi,
    tabel,
    recordId,
    nilaiLama,
    nilaiBaru,
    aksi
  ]);
}

// ============ SETUP FUNCTIONS ============

/**
 * Setup database sheets (jalankan sekali)
 */
function setupDatabase() {
  const ss = getErpSpreadsheet_();
  
  // Sheets use stable headers; append new columns to existing databases without overwriting rows.
  let sheet = ss.getSheetByName('BUKU_KAS') || ss.insertSheet('BUKU_KAS');
  ensureSheetHeaders_(sheet, [
    'id', 'tanggal', 'no_ref', 'kode_bukti', 'keterangan', 'kategori',
    'masuk', 'keluar', 'status_verifikasi', 'created_at', 'jenis', 'idempotency_key'
  ]);

  sheet = ss.getSheetByName('JURNAL') || ss.insertSheet('JURNAL');
  ensureSheetHeaders_(sheet, [
    'id', 'transaksi_id', 'tanggal', 'akun_kode', 'akun_nama',
    'debit', 'kredit', 'keterangan', 'created_at', 'status'
  ]);

  sheet = ss.getSheetByName('ARSIP_BUKTI') || ss.insertSheet('ARSIP_BUKTI');
  ensureSheetHeaders_(sheet, [
    'id', 'kode_bukti', 'jenis', 'link_drive', 'tgl_upload',
    'terverifikasi', 'catatan_audit', 'penerima', 'nominal',
    'keterangan', 'confidence', 'created_at'
  ]);

  sheet = ss.getSheetByName('AUDIT_LOG') || ss.insertSheet('AUDIT_LOG');
  ensureSheetHeaders_(sheet, [
    'id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id',
    'nilai_lama', 'nilai_baru', 'alasan'
  ]);

  const accountSheet = ss.getSheetByName('AKUN') || ss.insertSheet('AKUN');
  ensureSheetHeaders_(accountSheet, ['kode', 'nama', 'tipe', 'kategori', 'saldo_normal']);
  const defaultAkun = [
    ['1-1001', 'Kas', 'Aset', 'Aset Lancar', 'Debit'],
    ['1-1002', 'Bank', 'Aset', 'Aset Lancar', 'Debit'],
    ['1-1003', 'Piutang Usaha', 'Aset', 'Aset Lancar', 'Debit'],
    ['1-1004', 'Persediaan Barang', 'Aset', 'Aset Lancar', 'Debit'],
    ['1-1005', 'Biaya Dibayar Dimuka', 'Aset', 'Aset Lancar', 'Debit'],
    ['1-1006', 'PPN Masukan', 'Aset', 'Aset Lancar', 'Debit'],
    ['1-2001', 'Peralatan', 'Aset', 'Aset Tetap', 'Debit'],
    ['1-2002', 'Kendaraan', 'Aset', 'Aset Tetap', 'Debit'],
    ['1-2003', 'Bangunan', 'Aset', 'Aset Tetap', 'Debit'],
    ['1-2004', 'Akumulasi Penyusutan', 'Aset', 'Aset Tetap', 'Kredit'],
    ['2-1001', 'Utang Usaha', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'],
    ['2-1002', 'Utang Bank', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'],
    ['2-1003', 'Utang Pajak', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'],
    ['2-1004', 'Pendapatan Diterima Dimuka', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'],
    ['2-2001', 'Utang Jangka Panjang', 'Kewajiban', 'Kewajiban Jangka Panjang', 'Kredit'],
    ['3-1001', 'Modal Pemilik', 'Ekuitas', 'Ekuitas', 'Kredit'],
    ['3-1002', 'Laba Ditahan', 'Ekuitas', 'Ekuitas', 'Kredit'],
    ['3-1003', 'Prive', 'Ekuitas', 'Ekuitas', 'Debit'],
    ['4-1001', 'Pendapatan Penjualan', 'Pendapatan', 'Pendapatan Usaha', 'Kredit'],
    ['4-1002', 'Pendapatan Jasa', 'Pendapatan', 'Pendapatan Usaha', 'Kredit'],
    ['4-1003', 'Pendapatan Lain-lain', 'Pendapatan', 'Pendapatan Non-Usaha', 'Kredit'],
    ['5-1001', 'Harga Pokok Penjualan', 'Beban', 'Beban Langsung', 'Debit'],
    ['5-2001', 'Beban Gaji', 'Beban', 'Beban Operasional', 'Debit'],
    ['5-2002', 'Beban Sewa', 'Beban', 'Beban Operasional', 'Debit'],
    ['5-2003', 'Beban Listrik & Air', 'Beban', 'Beban Operasional', 'Debit'],
    ['5-2004', 'Beban Telepon & Internet', 'Beban', 'Beban Operasional', 'Debit'],
    ['5-2005', 'Beban Transportasi', 'Beban', 'Beban Operasional', 'Debit'],
    ['5-2006', 'Beban Perlengkapan', 'Beban', 'Beban Operasional', 'Debit'],
    ['5-2007', 'Beban Penyusutan', 'Beban', 'Beban Operasional', 'Debit'],
    ['5-2008', 'Beban Lain-lain', 'Beban', 'Beban Operasional', 'Debit']
  ];
  const existingAccountCodes = new Set(
    accountSheet.getLastRow() > 1
      ? accountSheet.getRange(2, 1, accountSheet.getLastRow() - 1, 1).getValues().flat().map(String)
      : []
  );
  const missingAccounts = defaultAkun.filter(account => !existingAccountCodes.has(account[0]));
  if (missingAccounts.length) {
    accountSheet.getRange(accountSheet.getLastRow() + 1, 1, missingAccounts.length, defaultAkun[0].length).setValues(missingAccounts);
  }

  return 'Database setup complete!';
}

// ============ HELPER FUNCTIONS ============

/**
 * Return JSON response
 */
function jsonResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
