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
  const props = PropertiesService.getScriptProperties();
  const configuredId = props.getProperty('ERP_SPREADSHEET_ID') || props.getProperty('SPREADSHEET_ID') || '';
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const id = configuredId || (active ? active.getId() : '');
  if (!id) {
    throw new Error('Spreadsheet belum dikonfigurasi. Jalankan setupErpBackend() atau isi ERP_SPREADSHEET_ID pada Script Properties.');
  }
  return SpreadsheetApp.openById(id);
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
/**
 * Google Apps Script Web App entry points.
 * All browser-facing data access goes through the authenticated HtmlService bridge.
 * Legacy anonymous JSON routes are deliberately disabled.
 */
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const props = PropertiesService.getScriptProperties();

  // WhatsApp webhook verification handshake. POST events should be relayed by n8n,
  // which verifies the provider signature before forwarding to ERP.
  if (params['hub.mode'] === 'subscribe') {
    const expected = props.getProperty('ERP_WHATSAPP_VERIFY_TOKEN') || '';
    if (expected && params['hub.verify_token'] === expected) {
      return ContentService.createTextOutput(String(params['hub.challenge'] || ''));
    }
    return ContentService.createTextOutput('Verification failed');
  }

  const path = String(params.path || '/');
  if (path === '/health') {
    return jsonResponse({ status: 'ok', backend: 'Google Apps Script', dataApi: 'authenticated-bridge-only' });
  }

  const template = HtmlService.createTemplateFromFile('Bridge');
  template.allowedOrigins = JSON.stringify(getAllowedOrigins_());
  return template.evaluate()
    .setTitle('ERP Secure Backend Bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const path = String(params.path || '');
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '';
    const data = rawBody ? JSON.parse(rawBody) : {};

    if (path === '/webhook/inbox') {
      const expected = PropertiesService.getScriptProperties().getProperty('ERP_INGEST_SECRET') || '';
      if (!expected || !constantTimeEquals_(String(data.ingest_secret || ''), expected)) {
        return jsonResponse({ success: false, error: 'Webhook authentication failed' });
      }
      return jsonResponse(receiveInboxEvent_(data));
    }

    // Old public endpoints accepted unauthenticated financial writes. They are no
    // longer exposed; client UI must use apiRequest through the verified bridge.
    return jsonResponse({
      success: false,
      error: 'Endpoint publik lama dinonaktifkan. Gunakan autentikasi ERP atau webhook n8n yang dilindungi secret.'
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: String(error && error.message ? error.message : error)
    });
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
  const sheet = ss.getSheetByName('ARSIP_BUKTI') || ss.insertSheet('ARSIP_BUKTI');
  const headers = ensureSheetHeaders_(sheet, [
    'id', 'kode_bukti', 'jenis', 'link_drive', 'tgl_upload',
    'terverifikasi', 'catatan_audit', 'penerima', 'nominal',
    'keterangan', 'confidence', 'created_at'
  ]);

  const id = 'BUKTI-' + Utilities.getUuid();
  const confidence = Math.max(0, Math.min(100, Number(ocrData.confidence) || 0));
  const documentTypes = {
    Kwitansi: 'Kwitansi_Foto',
    Nota: 'Nota_Foto',
    Transfer_Bank: 'Transfer_Bank',
    Lainnya: 'Lainnya'
  };

  // Confidence is only a model score, never human authorization.
  const record = {
    id: id,
    kode_bukti: String(ocrData.nomor_bukti || ''),
    jenis: documentTypes[documentType] || 'Kwitansi_Foto',
    link_drive: imageUrl,
    tgl_upload: new Date().toISOString().slice(0, 10),
    terverifikasi: 'Perlu_Konfirmasi',
    catatan_audit: 'OCR confidence: ' + confidence + '%. Menunggu verifikasi manual.',
    penerima: String(ocrData.vendor || ''),
    nominal: Number(ocrData.total) || 0,
    keterangan: String(ocrData.keterangan || ''),
    confidence: confidence,
    created_at: new Date().toISOString()
  };
  const row = headers.map(header => record[header] === undefined ? '' : record[header]);
  sheet.appendRow(row);
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
    ['1-1007', 'Persediaan Tanah & Properti untuk Dijual', 'Aset', 'Aset Lancar', 'Debit'],
    ['1-1008', 'Proyek dalam Pengerjaan (WIP)', 'Aset', 'Aset Lancar', 'Debit'],
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


// ============================================================================
// AUTHENTICATION + CLOUD SINGLE SOURCE OF TRUTH
// ============================================================================

const ERP_OPERATIONAL_MODULES_ = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'menuConfig', 'qcRecords',
  'assets', 'taxRecords', 'housingUnits'
];
const ERP_ACCOUNTING_MODULES_ = ['akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'];
const ERP_STATE_HEADERS_ = ['module', 'record_id', 'sort_index', 'payload_json', 'version', 'updated_at', 'updated_by'];
const ERP_USERS_HEADERS_ = ['google_sub', 'email', 'nama', 'role', 'status', 'created_at', 'last_login', 'phone'];
const ERP_ALLOWED_ROLES_ = ['ADMIN', 'KEUANGAN', 'PROYEK', 'VIEWER'];

function getAllowedOrigins_() {
  const value = PropertiesService.getScriptProperties().getProperty('ERP_ALLOWED_ORIGINS') || '';
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Run once from the Apps Script editor. Existing spreadsheet IDs are preserved.
 * If ERP_SPREADSHEET_ID / SPREADSHEET_ID is not configured and this is a bound
 * script, use its spreadsheet. Otherwise create a new Google Sheets database.
 */
function setupErpBackend() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('ERP_SPREADSHEET_ID') || props.getProperty('SPREADSHEET_ID') || '';
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!id && active) id = active.getId();
  if (!id) {
    const created = SpreadsheetApp.create('ERP Properti & Konstruksi - Database');
    id = created.getId();
  }
  props.setProperty('ERP_SPREADSHEET_ID', id);
  if (!props.getProperty('ERP_SESSION_SECRET')) {
    props.setProperty('ERP_SESSION_SECRET', Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid());
  }

  const ss = SpreadsheetApp.openById(id);
  ensureNamedSheet_(ss, 'USERS', ERP_USERS_HEADERS_);
  ensureNamedSheet_(ss, 'ERP_STATE', ERP_STATE_HEADERS_);
  ensureNamedSheet_(ss, 'INBOX_OCR', [
    'id', 'received_at', 'source', 'provider_message_id', 'sender_id',
    'sender_name', 'text', 'media_id', 'media_mime_type', 'status', 'raw_json'
  ]);
  ensureNamedSheet_(ss, 'AUDIT_LOG', [
    'id', 'timestamp', 'user_sub', 'user_email', 'aksi', 'modul',
    'record_id', 'nilai_lama', 'nilai_baru', 'alasan'
  ]);
  return {
    success: true,
    spreadsheetId: id,
    spreadsheetUrl: ss.getUrl(),
    tabs: ['USERS', 'ERP_STATE', 'INBOX_OCR', 'AUDIT_LOG'],
    nextSteps: [
      'Set ERP_GOOGLE_CLIENT_ID',
      'Set ERP_BOOTSTRAP_ADMIN_EMAIL',
      'Set ERP_ALLOWED_ORIGINS',
      'Deploy web app as owner and use the deployment URL in VITE_GAS_WEB_APP_URL'
    ]
  };
}

function ensureNamedSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
      .getValues()[0].map(value => String(value || '').trim());
    headers.forEach(header => {
      if (current.indexOf(header) < 0) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        current.push(header);
      }
    });
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function apiRequest(request) {
  try {
    if (!request || typeof request !== 'object') return apiError_('invalid_request', 'Permintaan tidak valid.');
    const action = String(request.action || '');
    if (action === 'bridge.ping') return { ok: true, data: { backend: 'Google Apps Script', version: 1 } };
    if (action === 'auth.login') return { ok: true, data: loginWithGoogle_(String(request.credential || '')) };

    const user = requireUserSession_(String(request.sessionToken || ''));
    if (action === 'auth.me') return { ok: true, data: { user: publicUser_(user), expiresAt: user.exp } };
    if (action === 'workspace.load') return { ok: true, data: loadWorkspaceForRole_(user) };
    if (action === 'workspace.bootstrap') {
      requireRole_(user, ['ADMIN']);
      return { ok: true, data: bootstrapWorkspace_(request.snapshot, user) };
    }
    if (action === 'workspace.save') {
      return { ok: true, data: saveWorkspace_(request.snapshot, request.expectedVersion, user) };
    }
    if (action === 'audit.list') {
      requireRole_(user, ['ADMIN', 'KEUANGAN', 'PROYEK']);
      return { ok: true, data: { records: readCloudAuditRows_() } };
    }
    if (action === 'admin.users.list') {
      requireRole_(user, ['ADMIN']);
      return { ok: true, data: { users: listUsers_() } };
    }
    if (action === 'admin.users.save') {
      requireRole_(user, ['ADMIN']);
      return { ok: true, data: saveUser_(request.user, user) };
    }
    if (action === 'ocr.parse') {
      requireRole_(user, ['ADMIN', 'KEUANGAN', 'PROYEK']);
      return { ok: true, data: parseReceiptWithGemini_(request.file) };
    }
    if (action === 'drive.upload') {
      requireRole_(user, ['ADMIN', 'KEUANGAN', 'PROYEK']);
      return { ok: true, data: uploadEvidenceToDrive_(request.file, request.folderName) };
    }
    return apiError_('unknown_action', 'Operasi backend tidak dikenal.');
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    const code = /Authentication required|expired|Invalid session/i.test(message) ? 'unauthenticated'
      : /not authorized|access denied|forbidden|role/i.test(message) ? 'forbidden'
        : /version conflict/i.test(message) ? 'conflict' : 'request_failed';
    return apiError_(code, message);
  }
}

function apiError_(code, message) {
  return { ok: false, error: { code: String(code), message: String(message || 'Permintaan gagal.') } };
}

function loginWithGoogle_(credential) {
  if (!credential || credential.length < 100 || credential.length > 20000) {
    throw new Error('Token Google tidak valid.');
  }
  const props = PropertiesService.getScriptProperties();
  const clientId = props.getProperty('ERP_GOOGLE_CLIENT_ID') || '';
  if (!clientId) throw new Error('ERP_GOOGLE_CLIENT_ID belum diatur pada Script Properties.');
  const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential);
  const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Google menolak token login. Silakan login ulang.');
  const claims = JSON.parse(response.getContentText());
  const now = Math.floor(Date.now() / 1000);
  const audience = String(claims.aud || '');
  const issuer = String(claims.iss || '');
  const email = String(claims.email || '').trim().toLowerCase();
  const sub = String(claims.sub || '');
  const exp = Number(claims.exp || 0);
  const verified = claims.email_verified === true || String(claims.email_verified).toLowerCase() === 'true';
  if (audience !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(issuer) ||
      exp <= now || !sub || !email || !verified) {
    throw new Error('Identitas Google tidak lolos validasi audience, issuer, masa berlaku, atau email terverifikasi.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const users = ensureNamedSheet_(getErpSpreadsheet_(), 'USERS', ERP_USERS_HEADERS_);
    const rows = users.getDataRange().getValues();
    const headers = rows[0].map(String);
    const index = Object.fromEntries(headers.map((key, i) => [key, i]));
    let matchedRow = -1;
    let matched = null;
    for (let i = 1; i < rows.length; i++) {
      const rowEmail = String(rows[i][index.email] || '').trim().toLowerCase();
      const rowSub = String(rows[i][index.google_sub] || '');
      if (rowSub === sub || rowEmail === email) {
        matchedRow = i + 1;
        matched = {
          sub: rowSub, email: rowEmail, nama: String(rows[i][index.nama] || ''),
          role: String(rows[i][index.role] || ''), status: String(rows[i][index.status] || '')
        };
        break;
      }
    }

    if (!matched) {
      const adminEmail = String(props.getProperty('ERP_BOOTSTRAP_ADMIN_EMAIL') || '').trim().toLowerCase();
      const activeAdmins = rows.slice(1).filter(row =>
        String(row[index.role] || '').toUpperCase() === 'ADMIN' &&
        String(row[index.status] || '').toUpperCase() === 'ACTIVE'
      ).length;
      if (!adminEmail || email !== adminEmail || activeAdmins > 0) {
        throw new Error('Akun belum terdaftar. Minta ADMIN menambahkan alamat Google Anda terlebih dahulu.');
      }
      matched = { sub: sub, email: email, nama: String(claims.name || email), role: 'ADMIN', status: 'ACTIVE' };
      matchedRow = users.getLastRow() + 1;
      users.getRange(matchedRow, 1, 1, ERP_USERS_HEADERS_.length).setValues([[
        sub, email, matched.nama, matched.role, matched.status, new Date().toISOString(), new Date().toISOString(), ''
      ]]);
    } else {
      if (matched.sub && matched.sub !== sub) throw new Error('Alamat email ini terikat ke akun Google yang berbeda.');
      if (matched.status.toUpperCase() !== 'ACTIVE') throw new Error('Akun dinonaktifkan. Hubungi ADMIN.');
      if (!ERP_ALLOWED_ROLES_.includes(matched.role.toUpperCase())) throw new Error('Role pengguna belum valid.');
      if (!matched.sub) {
        const gmailIdentity = email.endsWith('@gmail.com');
        const workspaceIdentity = Boolean(String(claims.hd || '').trim());
        if (!gmailIdentity && !workspaceIdentity) {
          throw new Error('Untuk keamanan, undangan non-Gmail memerlukan pembuktian tambahan sebelum menautkan akun Google. Gunakan akun Gmail atau minta administrator memverifikasi akun organisasi.');
        }
        users.getRange(matchedRow, index.google_sub + 1).setValue(sub);
      }
      users.getRange(matchedRow, index.last_login + 1).setValue(new Date().toISOString());
    }

    const normalized = {
      sub: sub, email: email, nama: matched.nama || String(claims.name || email),
      role: matched.role.toUpperCase(), status: 'ACTIVE'
    };
    const sessionToken = createSessionToken_(normalized, Math.min(exp, now + 3600));
    return { sessionToken: sessionToken, user: publicUser_(Object.assign({}, normalized, { exp: Math.min(exp, now + 3600) })) };
  } finally {
    lock.releaseLock();
  }
}

function createSessionToken_(user, expiresAt) {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('ERP_SESSION_SECRET') || '';
  if (!secret) throw new Error('Jalankan setupErpBackend() untuk membuat secret sesi.');
  const header = base64UrlEncodeText_(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncodeText_(JSON.stringify({
    sub: user.sub, email: user.email, name: user.nama, role: user.role,
    iat: Math.floor(Date.now() / 1000), exp: expiresAt, iss: 'erp-gas', jti: Utilities.getUuid()
  }));
  const body = header + '.' + payload;
  const signature = Utilities.computeHmacSha256Signature(body, secret);
  return body + '.' + Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, '');
}

function base64UrlEncodeText_(value) {
  return Utilities.base64EncodeWebSafe(String(value), Utilities.Charset.UTF_8).replace(/=+$/g, '');
}

function requireUserSession_(token) {
  if (!token || token.length > 5000) throw new Error('Authentication required.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid session token.');
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('ERP_SESSION_SECRET') || '';
  if (!secret) throw new Error('Jalankan setupErpBackend() terlebih dahulu.');
  const expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0] + '.' + parts[1], secret)).replace(/=+$/g, '');
  if (!constantTimeEquals_(expected, parts[2])) throw new Error('Invalid session signature.');
  const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== 'erp-gas' || !payload.sub || Number(payload.exp || 0) <= now) {
    throw new Error('Session expired. Login ulang.');
  }
  const active = findUserBySub_(String(payload.sub));
  if (!active || active.status !== 'ACTIVE' || active.role !== String(payload.role).toUpperCase()) {
    throw new Error('User not authorized or disabled.');
  }
  return { sub: active.google_sub, email: active.email, nama: active.nama, role: active.role, exp: Number(payload.exp) };
}

function constantTimeEquals_(left, right) {
  left = String(left || '');
  right = String(right || '');
  let result = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) result |= (left.charCodeAt(i % (left.length || 1)) || 0) ^ (right.charCodeAt(i % (right.length || 1)) || 0);
  return result === 0;
}

function findUserBySub_(sub) {
  const sheet = ensureNamedSheet_(getErpSpreadsheet_(), 'USERS', ERP_USERS_HEADERS_);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return null;
  const headers = rows[0].map(String);
  const index = Object.fromEntries(headers.map((key, i) => [key, i]));
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][index.google_sub] || '') === sub) {
      return {
        google_sub: sub, email: String(rows[i][index.email] || ''),
        nama: String(rows[i][index.nama] || ''), role: String(rows[i][index.role] || '').toUpperCase(),
        status: String(rows[i][index.status] || '').toUpperCase()
      };
    }
  }
  return null;
}

function publicUser_(user) {
  return { sub: String(user.sub || ''), email: String(user.email || ''), nama: String(user.nama || ''),
    role: String(user.role || '').toUpperCase(), exp: Number(user.exp || 0) };
}

function requireRole_(user, roles) {
  if (!user || roles.indexOf(String(user.role || '').toUpperCase()) < 0) {
    throw new Error('Role ' + String(user && user.role || 'unknown') + ' tidak memiliki akses untuk operasi ini.');
  }
}

function listUsers_() {
  const sheet = ensureNamedSheet_(getErpSpreadsheet_(), 'USERS', ERP_USERS_HEADERS_);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(String);
  const index = Object.fromEntries(headers.map((key, i) => [key, i]));
  return rows.slice(1).filter(row => String(row[index.email] || '').trim()).map(row => ({
    email: String(row[index.email] || ''), nama: String(row[index.nama] || ''),
    role: String(row[index.role] || '').toUpperCase(), status: String(row[index.status] || '').toUpperCase(),
    created_at: String(row[index.created_at] || ''), last_login: String(row[index.last_login] || ''),
    phone: String(row[index.phone] || ''),
    google_sub_linked: Boolean(String(row[index.google_sub] || ''))
  }));
}

function saveUser_(input, actor) {
  if (!input || typeof input !== 'object') throw new Error('Data user tidak valid.');
  const email = String(input.email || '').trim().toLowerCase();
  const name = String(input.nama || '').trim();
  const phone = String(input.phone || '').trim();
  const role = String(input.role || 'VIEWER').toUpperCase();
  const status = String(input.status || 'ACTIVE').toUpperCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email user tidak valid.');
  if (name.length > 100) throw new Error('Nama maksimum 100 karakter.');
  if (phone.length > 30) throw new Error('Nomor WhatsApp maksimum 30 karakter.');
  if (!ERP_ALLOWED_ROLES_.includes(role) || !['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('Role atau status tidak valid.');
  if (email === actor.email && (status !== 'ACTIVE' || role !== 'ADMIN')) throw new Error('Admin tidak boleh menonaktifkan atau menurunkan role dirinya sendiri.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = ensureNamedSheet_(getErpSpreadsheet_(), 'USERS', ERP_USERS_HEADERS_);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0].map(String);
    const index = Object.fromEntries(headers.map((key, i) => [key, i]));
    const activeAdmins = rows.slice(1).filter(row =>
      String(row[index.role] || '').toUpperCase() === 'ADMIN' &&
      String(row[index.status] || '').toUpperCase() === 'ACTIVE'
    );
    const existingTarget = rows.slice(1).find(row => String(row[index.email] || '').trim().toLowerCase() === email);
    if (activeAdmins.length === 1 && existingTarget &&
        String(existingTarget[index.role] || '').toUpperCase() === 'ADMIN' &&
        String(existingTarget[index.status] || '').toUpperCase() === 'ACTIVE' &&
        (role !== 'ADMIN' || status !== 'ACTIVE')) {
      throw new Error('Admin aktif terakhir tidak boleh diturunkan role atau dinonaktifkan.');
    }
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][index.email] || '').trim().toLowerCase() === email) {
        sheet.getRange(i + 1, index.nama + 1).setValue(name || email);
        sheet.getRange(i + 1, index.role + 1).setValue(role);
        sheet.getRange(i + 1, index.status + 1).setValue(status);
        if (index.phone !== undefined) sheet.getRange(i + 1, index.phone + 1).setValue(phone);
        return { saved: true, email: email, role: role, status: status };
      }
    }
    sheet.appendRow(['', email, name || email, role, status, new Date().toISOString(), '', phone]);
    return { saved: true, email: email, role: role, status: status, invited: true };
  } finally {
    lock.releaseLock();
  }
}

function defaultWorkspaceSnapshot_() {
  const snapshot = { operational: {}, accounting: {} };
  ERP_OPERATIONAL_MODULES_.forEach(module => snapshot.operational[module] = []);
  ERP_ACCOUNTING_MODULES_.forEach(module => snapshot.accounting[module] = []);
  return snapshot;
}

function validateWorkspaceSnapshot_(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.operational || !snapshot.accounting) {
    throw new Error('Snapshot cloud harus memiliki bagian operational dan accounting.');
  }
  const clean = { operational: {}, accounting: {} };
  ERP_OPERATIONAL_MODULES_.forEach(module => {
    if (!Array.isArray(snapshot.operational[module])) throw new Error('Modul operational.' + module + ' harus berupa array.');
    clean.operational[module] = snapshot.operational[module];
  });
  ERP_ACCOUNTING_MODULES_.forEach(module => {
    if (!Array.isArray(snapshot.accounting[module])) throw new Error('Modul accounting.' + module + ' harus berupa array.');
    clean.accounting[module] = snapshot.accounting[module];
  });
  if (JSON.stringify(snapshot).length > 4000000) throw new Error('Snapshot melebihi batas aman 4 MB. Lampiran berkas tidak boleh disimpan sebagai base64 di data state.');
  return clean;
}

function getCanonicalStateSheet_(ss) {
  let current = ss.getSheetByName('ERP_STATE');
  const previous = ss.getSheetByName('ERP_STATE_PREVIOUS');
  const stage = ss.getSheetByName('ERP_STATE_STAGE');
  if (!current && previous) {
    previous.setName('ERP_STATE');
    current = previous;
  }
  if (current && previous) ss.deleteSheet(previous);
  if (stage) ss.deleteSheet(stage);
  if (!current) current = ensureNamedSheet_(ss, 'ERP_STATE', ERP_STATE_HEADERS_);
  return current;
}

function loadWorkspace_() {
  const sheet = getCanonicalStateSheet_(getErpSpreadsheet_());
  if (sheet.getLastRow() < 2) return { found: false, snapshot: null, version: 0 };
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const index = Object.fromEntries(headers.map((key, i) => [key, i]));
  const snapshot = defaultWorkspaceSnapshot_();
  let version = 0;
  let anyRecord = false;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const module = String(row[index.module] || '');
    const recordId = String(row[index.record_id] || '');
    if (module === '__meta__' && recordId === 'version') {
      try { version = Number(JSON.parse(String(row[index.payload_json] || '{}')).version || 0); } catch (ignore) {}
      anyRecord = true;
      continue;
    }
    const path = module.split('.');
    if (path.length !== 2 || !['operational', 'accounting'].includes(path[0])) continue;
    const allowed = path[0] === 'operational' ? ERP_OPERATIONAL_MODULES_ : ERP_ACCOUNTING_MODULES_;
    if (allowed.indexOf(path[1]) < 0) continue;
    try {
      const item = JSON.parse(String(row[index.payload_json] || 'null'));
      if (item !== null) snapshot[path[0]][path[1]].push({ sort: Number(row[index.sort_index] || 0), item: item });
      anyRecord = true;
    } catch (error) {
      throw new Error('Data cloud rusak pada ' + module + '/' + recordId + '. Hentikan penulisan dan periksa sheet ERP_STATE.');
    }
  }
  Object.keys(snapshot.operational).forEach(module => snapshot.operational[module] =
    snapshot.operational[module].sort((a, b) => a.sort - b.sort).map(entry => entry.item));
  Object.keys(snapshot.accounting).forEach(module => snapshot.accounting[module] =
    snapshot.accounting[module].sort((a, b) => a.sort - b.sort).map(entry => entry.item));
  return { found: anyRecord, snapshot: snapshot, version: version };
}

function readableModulesForRole_(role) {
  role = String(role || '').toUpperCase();
  if (role === 'ADMIN') return ERP_OPERATIONAL_MODULES_.map(m => 'operational.' + m).concat(ERP_ACCOUNTING_MODULES_.map(m => 'accounting.' + m));
  if (role === 'KEUANGAN') return allowedModulesForRole_('KEUANGAN').concat(['operational.auditLog']);
  if (role === 'PROYEK') return allowedModulesForRole_('PROYEK').concat(['operational.auditLog']);
  if (role === 'VIEWER') return ['operational.tanah', 'operational.beko'];
  return [];
}

function loadWorkspaceForRole_(user) {
  const state = loadWorkspace_();
  if (!state.found) return state;
  const snapshot = JSON.parse(JSON.stringify(state.snapshot));
  const readable = readableModulesForRole_(user.role);
  ERP_OPERATIONAL_MODULES_.forEach(module => {
    if (readable.indexOf('operational.' + module) < 0) snapshot.operational[module] = [];
  });
  ERP_ACCOUNTING_MODULES_.forEach(module => {
    if (readable.indexOf('accounting.' + module) < 0) snapshot.accounting[module] = [];
  });

  if (['ADMIN', 'KEUANGAN', 'PROYEK'].indexOf(String(user.role).toUpperCase()) >= 0) {
    snapshot.operational.auditLog = readCloudAuditRows_();
  } else {
    snapshot.operational.auditLog = [];
  }

  if (String(user.role).toUpperCase() === 'VIEWER') {
    snapshot.operational.tanah = snapshot.operational.tanah.map((row, index) => ({
      ...row,
      pemilik: 'Bidang ' + (index + 1),
      harga_per_bt: 0,
      dp: 0,
      nilai_total_manual: 0,
      kode_bukti: '',
      url_bukti: '',
      catatan: 'Rincian pembayaran disembunyikan untuk role VIEWER.'
    }));
    snapshot.operational.beko = snapshot.operational.beko.map(row => ({
      ...row,
      tarif: 0,
      kode_bukti: '',
      url_bukti: '',
      catatan: 'Rincian biaya disembunyikan untuk role VIEWER.'
    }));
  }
  return { found: true, snapshot: snapshot, version: state.version };
}

function bootstrapWorkspace_(snapshot, actor) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const loaded = loadWorkspace_();
    if (loaded.found) throw new Error('Database cloud sudah memiliki state. Tidak akan ditimpa oleh bootstrap.');
    const initial = validateWorkspaceSnapshot_(snapshot);
    const result = writeWorkspaceSnapshot_(initial, 1, actor);
    appendCloudAudit_(actor, 'BOOTSTRAP', 'workspace', '', JSON.stringify({ version: result.version, modules: ERP_OPERATIONAL_MODULES_.length + ERP_ACCOUNTING_MODULES_.length }));
    return { found: true, snapshot: initial, version: result.version, created: true };
  } finally {
    lock.releaseLock();
  }
}

function saveWorkspace_(snapshot, expectedVersion, actor) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const oldState = loadWorkspace_();
    if (!oldState.found) throw new Error('Database cloud belum diinisialisasi. Bootstrap wajib dilakukan oleh ADMIN.');
    if (Number(expectedVersion) !== oldState.version) {
      return { saved: false, conflict: true, version: oldState.version, error_code: 'conflict' };
    }
    const requested = validateWorkspaceSnapshot_(snapshot);
    // Start with the canonical server state and copy back only modules the verified
    // role may edit. Hidden/unauthorized arrays sent by a browser are never applied.
    const next = JSON.parse(JSON.stringify(oldState.snapshot));
    const changed = [];
    const allowed = allowedModulesForRole_(actor.role);
    ERP_OPERATIONAL_MODULES_.forEach(module => {
      const path = 'operational.' + module;
      if (allowed.indexOf(path) < 0) return;
      if (JSON.stringify(oldState.snapshot.operational[module]) !== JSON.stringify(requested.operational[module])) {
        next.operational[module] = requested.operational[module];
        changed.push(path);
      }
    });
    ERP_ACCOUNTING_MODULES_.forEach(module => {
      const path = 'accounting.' + module;
      if (allowed.indexOf(path) < 0) return;
      if (JSON.stringify(oldState.snapshot.accounting[module]) !== JSON.stringify(requested.accounting[module])) {
        next.accounting[module] = requested.accounting[module];
        changed.push(path);
      }
    });
    if (changed.length === 0) return { saved: true, version: oldState.version, changedModules: [] };
    const oldAudit = oldState.snapshot.operational.auditLog;
    const nextAudit = next.operational.auditLog;
    if (nextAudit.length < oldAudit.length || oldAudit.some((row, i) => JSON.stringify(row) !== JSON.stringify(nextAudit[i]))) {
      throw new Error('Audit trail append-only: baris lama tidak boleh diubah atau dihapus.');
    }
    const result = writeWorkspaceSnapshot_(next, oldState.version + 1, actor);
    appendCloudAudit_(actor, 'SAVE_SNAPSHOT', 'workspace', '', JSON.stringify({ changed_modules: changed, version: result.version }));
    return { saved: true, version: result.version, changedModules: changed };
  } finally {
    lock.releaseLock();
  }
}

function allowedModulesForRole_(role) {
  role = String(role || '').toUpperCase();
  if (role === 'ADMIN') return ERP_OPERATIONAL_MODULES_.map(m => 'operational.' + m).concat(ERP_ACCOUNTING_MODULES_.map(m => 'accounting.' + m));
  if (role === 'KEUANGAN') return [
    'operational.bukuKas', 'operational.arsipBukti', 'operational.posKewajiban',
    'operational.anggaran', 'operational.arusKas',
    'operational.penggajian', 'operational.taxRecords',
    'accounting.akun', 'accounting.jurnal', 'accounting.invoice',
    'accounting.purchaseOrder', 'accounting.rab', 'accounting.schedule'
  ];
  if (role === 'PROYEK') return [
    'operational.tanah', 'operational.beko', 'operational.notaMaterial',
    'operational.stok', 'operational.produksi', 'operational.penjualan',
    'operational.pembelian', 'operational.ocr', 'operational.whatsapp',
    'operational.qcRecords', 'operational.assets', 'operational.housingUnits',
    'operational.auditLog', 'accounting.rab'
  ];
  return [];
}

function snapshotToRows_(snapshot, version, actor) {
  const now = new Date().toISOString();
  const rows = [[
    '__meta__', 'version', -1, JSON.stringify({ version: version, updatedAt: now, updatedBy: actor.sub }),
    version, now, actor.email
  ]];
  function addModule(scope, module) {
    const list = snapshot[scope][module];
    const seen = {};
    list.forEach((item, index) => {
      const id = item && typeof item === 'object'
        ? String(item.id || item.kode || item.kode_unit || item.no_ref || (module + '-' + index))
        : module + '-' + index;
      if (seen[id]) throw new Error('ID duplikat pada ' + scope + '.' + module + ': ' + id);
      seen[id] = true;
      const payload = JSON.stringify(item);
      if (payload.length > 45000) throw new Error('Record ' + scope + '.' + module + '/' + id + ' melebihi 45.000 karakter. Pindahkan lampiran ke Drive.');
      rows.push([scope + '.' + module, id, index, payload, version, now, actor.email]);
    });
  }
  ERP_OPERATIONAL_MODULES_.forEach(module => addModule('operational', module));
  ERP_ACCOUNTING_MODULES_.forEach(module => addModule('accounting', module));
  if (rows.length > 10001) throw new Error('Snapshot melebihi batas 10.000 baris records. Arsipkan data historis sebelum melanjutkan.');
  return rows;
}

function writeWorkspaceSnapshot_(snapshot, version, actor) {
  const ss = getErpSpreadsheet_();
  getCanonicalStateSheet_(ss);
  let stage = ss.getSheetByName('ERP_STATE_STAGE');
  if (stage) ss.deleteSheet(stage);
  stage = ss.insertSheet('ERP_STATE_STAGE');
  stage.getRange(1, 1, 1, ERP_STATE_HEADERS_.length).setValues([ERP_STATE_HEADERS_]);
  const rows = snapshotToRows_(snapshot, version, actor);
  stage.getRange(2, 1, rows.length, ERP_STATE_HEADERS_.length).setValues(rows);
  SpreadsheetApp.flush();

  const current = ss.getSheetByName('ERP_STATE');
  const previous = ss.getSheetByName('ERP_STATE_PREVIOUS');
  if (previous) ss.deleteSheet(previous);
  if (current) current.setName('ERP_STATE_PREVIOUS');
  stage.setName('ERP_STATE');
  const old = ss.getSheetByName('ERP_STATE_PREVIOUS');
  if (old) ss.deleteSheet(old);
  SpreadsheetApp.flush();
  return { version: version };
}

function appendCloudAudit_(actor, action, module, recordId, details) {
  const ss = getErpSpreadsheet_();
  const sheet = ensureNamedSheet_(ss, 'AUDIT_LOG', [
    'id', 'timestamp', 'user_sub', 'user_email', 'user', 'aksi',
    'modul', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan'
  ]);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(value => String(value || '').trim());
  const record = {
    id: 'LOG-' + Utilities.getUuid(),
    timestamp: new Date().toISOString(),
    user_sub: actor.sub || '',
    user_email: actor.email || '',
    user: actor.email || 'System',
    aksi: action,
    modul: module,
    tabel: module,
    record_id: recordId || '',
    nilai_lama: '',
    nilai_baru: details || '',
    alasan: 'Generated by authenticated Google Apps Script backend'
  };
  sheet.appendRow(headers.map(header => Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ''));
}

function readCloudAuditRows_() {
  const sheet = ensureNamedSheet_(getErpSpreadsheet_(), 'AUDIT_LOG', [
    'id', 'timestamp', 'user_sub', 'user_email', 'user', 'aksi',
    'modul', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan'
  ]);
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(value => String(value || '').trim());
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  return values.slice(1).filter(row => String(row[index.id] || '').trim()).map(row => ({
    id: String(row[index.id] || ''),
    timestamp: row[index.timestamp] instanceof Date ? row[index.timestamp].toISOString() : String(row[index.timestamp] || ''),
    user: String(row[index.user_email] || row[index.user] || 'System'),
    aksi: String(row[index.aksi] || 'CHANGE'),
    tabel: String(row[index.modul] || row[index.tabel] || 'ERP'),
    record_id: String(row[index.record_id] || ''),
    nilai_lama: String(row[index.nilai_lama] || ''),
    nilai_baru: String(row[index.nilai_baru] || ''),
    alasan: String(row[index.alasan] || ''),
    sumber_bukti: 'Google Apps Script server audit log'
  })).slice(-1000).reverse();
}

function receiveInboxEvent_(data) {
  const source = String(data.source || '').toLowerCase();
  if (!['telegram', 'whatsapp', 'web'].includes(source)) throw new Error('Sumber Inbox tidak dikenal.');
  const id = String(data.provider_message_id || data.message_id || Utilities.getUuid());
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getErpSpreadsheet_();
    const sheet = ensureNamedSheet_(ss, 'INBOX_OCR', [
      'id', 'received_at', 'source', 'provider_message_id', 'sender_id',
      'sender_name', 'text', 'media_id', 'media_mime_type', 'status', 'raw_json'
    ]);
    const rows = sheet.getDataRange().getValues();
    if (rows.slice(1).some(row => String(row[3] || '') === id && id)) {
      return { success: true, duplicate: true, status: 'duplicate_ignored' };
    }
    const text = String(data.text || data.caption || '').slice(0, 5000);
    const mediaId = String(data.media_id || data.file_id || '').slice(0, 500);
    const raw = JSON.stringify(data.raw || {});
    if (raw.length > 30000) throw new Error('Metadata webhook terlalu besar.');
    sheet.appendRow([
      'INBOX-' + Utilities.getUuid(), new Date().toISOString(), source, id,
      String(data.sender_id || data.from || '').slice(0, 200),
      String(data.sender_name || '').slice(0, 200), text, mediaId,
      String(data.media_mime_type || '').slice(0, 100), 'RECEIVED', raw
    ]);
    return { success: true, duplicate: false, status: 'RECEIVED' };
  } finally {
    lock.releaseLock();
  }
}

function parseReceiptWithGemini_(file) {
  if (!file || typeof file !== 'object') throw new Error('Lampirkan foto nota atau invoice.');
  const base64 = String(file.base64 || '');
  const mimeType = String(file.mimeType || '').toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType)) {
    throw new Error('Format berkas harus JPG, PNG, WEBP, atau PDF.');
  }
  if (!base64 || base64.length > 11000000) throw new Error('Berkas kosong atau melebihi 8 MB.');
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY belum diatur di Script Properties.');
  const model = PropertiesService.getScriptProperties().getProperty('ERP_GEMINI_MODEL') || 'gemini-3.8-flash';
  const prompt = [
    'Ekstrak data bukti transaksi dalam Bahasa Indonesia. Jangan menebak angka/tanggal yang tidak terbaca.',
    'Balas hanya JSON object dengan fields tanggal (YYYY-MM-DD atau null), nama_toko, deskripsi, jumlah (angka atau null), kategori (Material, Cut_Fill, Pembebasan_Tanah, Marketing, Operasional, Pajak, Lainnya atau Perlu_Konfirmasi), nomor_bukti, metode_pembayaran, teks_terbaca, confidence (0-100), needs_review (boolean), alasan_konfirmasi.',
    'Jika nominal, tanggal atau pihak meragukan/terpotong, isi null atau needs_review=true. OCR bukan persetujuan pembayaran.'
  ].join(' ');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const payload = {
    contents: [{ parts: [
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: base64 } }
    ] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' }
  };
  const response = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const body = JSON.parse(response.getContentText() || '{}');
  if (code < 200 || code >= 300) throw new Error('Gemini API gagal (' + code + '). Periksa model, kuota, dan API key.');
  const text = body.candidates && body.candidates[0] && body.candidates[0].content &&
    body.candidates[0].content.parts && body.candidates[0].content.parts[0] &&
    body.candidates[0].content.parts[0].text;
  if (!text) throw new Error('Gemini tidak mengembalikan hasil OCR yang bisa dibaca.');
  const parsed = JSON.parse(String(text).replace(/^\uFEFF/, '').trim());
  const amount = parsed.jumlah === null || parsed.jumlah === '' ? null : Number(parsed.jumlah);
  if (amount !== null && (!isFinite(amount) || amount < 0)) throw new Error('Nominal OCR bukan angka valid.');
  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
  return {
    draft: {
      tanggal: /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.tanggal || '')) ? String(parsed.tanggal) : null,
      nama_toko: String(parsed.nama_toko || ''),
      deskripsi: String(parsed.deskripsi || ''),
      jumlah: amount,
      kategori: String(parsed.kategori || 'Perlu_Konfirmasi'),
      nomor_bukti: String(parsed.nomor_bukti || ''),
      metode_pembayaran: String(parsed.metode_pembayaran || ''),
      teks_terbaca: String(parsed.teks_terbaca || '').slice(0, 5000),
      confidence: confidence,
      needs_review: parsed.needs_review !== false || amount === null || !parsed.tanggal,
      alasan_konfirmasi: String(parsed.alasan_konfirmasi || '')
    },
    posted: false,
    message: 'Hasil OCR hanya draf Inbox. Tidak ada transaksi kas/jurnal yang diposting otomatis.'
  };
}

function uploadEvidenceToDrive_(file, requestedFolderName) {
  if (!file || typeof file !== 'object') throw new Error('File bukti belum dipilih.');
  const base64 = String(file.base64 || '');
  const name = String(file.name || 'bukti').replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 120);
  const mimeType = String(file.mimeType || 'application/octet-stream');
  if (!base64 || base64.length > 11000000) throw new Error('Berkas kosong atau melebihi 8 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType)) throw new Error('Format bukti harus JPG, PNG, WEBP, atau PDF.');
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, name);
  const folderName = String(requestedFolderName || 'ERP Evidence').replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 80);
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('ERP_DRIVE_FOLDER_ID') || '';
  let folder = null;
  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch (ignore) { folder = null; }
  }
  if (!folder) {
    const matches = DriveApp.getFoldersByName(folderName);
    folder = matches.hasNext() ? matches.next() : DriveApp.createFolder(folderName);
    props.setProperty('ERP_DRIVE_FOLDER_ID', folder.getId());
  }
  const created = folder.createFile(blob);
  created.setDescription('ERP evidence file. Uploaded at ' + new Date().toISOString());
  return { fileId: created.getId(), name: created.getName(), mimeType: created.getMimeType(), url: created.getUrl(), posted: false };
}
