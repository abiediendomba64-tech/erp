/**
 * ERP backend: Google Apps Script + Google Sheets.
 * Canonical React workspace data, server-authenticated accounts and version-checked saves
 * live in ERP_STATE. Legacy OCR/WhatsApp/Telegram/transaction routes remain fail-closed
 * until they are adapted to the canonical writer. See docs/GOOGLE_APPS_SCRIPT_BACKEND.md.
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
  const params = e && e.parameter ? e.parameter : {};
  try {
    // The React frontend talks through this HTML-service bridge. The parent origin
    // must be explicitly allowlisted in Script Properties before a bridge is served.
    if (params.mode === 'bridge') return renderErpBridge_(String(params.parentOrigin || ''));

    // Meta WhatsApp webhook verification handshake.
    if (params['hub.mode'] === 'subscribe') {
      const expected = PropertiesService.getScriptProperties().getProperty('WHATSAPP_VERIFY_TOKEN') || '';
      if (params['hub.verify_token'] && safeConstantTimeEqual_(String(params['hub.verify_token']), expected)) {
        return ContentService.createTextOutput(String(params['hub.challenge'] || ''));
      }
      return jsonResponse({ success: false, error: 'Webhook verification failed.' });
    }

    const path = String(params.path || '/health');
    // No unauthenticated read endpoint may return financial or personal data.
    if (path !== '/health') {
      return jsonResponse({ success: false, error: 'Endpoint baca langsung dinonaktifkan. Gunakan login ERP.' });
    }
    return jsonResponse({
      success: true,
      status: 'OK',
      backend: 'Google Apps Script + Google Sheets',
      authentication: 'required',
      configured: Boolean(SPREADSHEET_ID),
      schemaVersion: 1
    });
  } catch (error) {
    return jsonResponse({ success: false, error: String(error && error.message ? error.message : error) });
  }
}


function doPost(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const path = String(params.path || '');

    // These legacy routes wrote into separate BUKU_KAS/JURNAL/ARSIP_BUKTI tables,
    // while the React ERP now stores its canonical state in versioned ERP_STATE.
    // Fail closed until each integration is adapted to the same canonical writer.
    if (['/ocr','/transaksi','/reversal','/webhook/whatsapp','/webhook/telegram'].includes(path)) {
      return jsonResponse({
        success: false,
        error: 'Endpoint lama sengaja dinonaktifkan agar tidak membuat sumber data ganda. Adapter harus menulis ke ERP_STATE sebelum OCR/webhook diaktifkan.'
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
// AUTHENTICATION + GOOGLE SHEETS CANONICAL CLOUD STATE (ERP v1)
// ============================================================================
// Setup properties (Apps Script > Project Settings > Script Properties):
// SPREADSHEET_ID, ERP_BOOTSTRAP_CODE (one-time), ALLOWED_APP_ORIGINS.
// Add Gemini/WhatsApp/Telegram secrets separately only when those integrations
// are deliberately enabled. No client may access these Script Properties.

const ERP_USER_HEADERS_ = [
  'id','email','name','phone','role','status','password_salt','password_hash',
  'failed_attempts','locked_until','created_at','last_login'
];
const ERP_SESSION_HEADERS_ = ['token_hash','user_id','created_at','expires_at','last_seen','revoked_at'];
const ERP_META_HEADERS_ = ['workspace_name','version','updated_at','updated_by'];
const ERP_STATE_HEADERS_ = ['version','chunk_index','chunk_count','json_chunk','updated_at','updated_by'];
const ERP_AUDIT_HEADERS_ = ['id','timestamp','actor_id','actor_email','action','entity','record_id','details_json'];
const ERP_PASSWORD_ITERATIONS_ = 12000;
const ERP_SESSION_HOURS_ = 12;
const ERP_STATE_CHUNK_CHARS_ = 40000;
const ERP_MAX_SNAPSHOT_CHARS_ = 4500000;
const ERP_ROLE_VALUES_ = ['ADMIN','KEUANGAN','PROYEK','VIEWER'];

function ensureErpBackendSheets_() {
  const ss = getErpSpreadsheet_();
  const definitions = [
    ['USERS', ERP_USER_HEADERS_],
    ['SESSIONS', ERP_SESSION_HEADERS_],
    ['ERP_META', ERP_META_HEADERS_],
    ['ERP_STATE', ERP_STATE_HEADERS_],
    ['BACKEND_AUDIT', ERP_AUDIT_HEADERS_]
  ];
  definitions.forEach(([name, headers]) => {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    ensureSheetHeaders_(sheet, headers);
  });
  return ss;
}

function sheetRecordsWithRows_(sheetName) {
  const sheet = getErpSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(v => String(v || '').trim());
  return values.slice(1).map((row, index) => {
    const record = { __rowNumber: index + 2 };
    headers.forEach((header, col) => { if (header) record[header] = row[col]; });
    return record;
  }).filter(record => Object.keys(record).some(key =>
    key !== '__rowNumber' && record[key] !== '' && record[key] !== null
  ));
}

function safeSheetCell_(value) {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) return "'" + value;
  return value === undefined || value === null ? '' : value;
}

function appendRecord_(sheetName, headers, record) {
  const sheet = getErpSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet belum dibuat: ' + sheetName);
  const row = headers.map(header => safeSheetCell_(record[header]));
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function updateRecordRow_(sheetName, rowNumber, headers, record) {
  const sheet = getErpSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet belum dibuat: ' + sheetName);
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues(
    headers.map(header => safeSheetCell_(record[header]))
  );
}

function sha256Base64_(value) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8)
  );
}

function passwordHash_(password, salt) {
  let digest = String(salt) + ':' + String(password);
  for (let i = 0; i < ERP_PASSWORD_ITERATIONS_; i++) digest = sha256Base64_(digest);
  return digest;
}

function safeConstantTimeEqual_(left, right) {
  left = String(left || '');
  right = String(right || '');
  let difference = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) {
    difference |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return difference === 0;
}

function newSessionToken_() {
  return Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');
}

function publicUser_(user) {
  return {
    id: String(user.id),
    email: String(user.email),
    name: String(user.name || ''),
    phone: String(user.phone || ''),
    role: String(user.role),
    status: String(user.status),
    createdAt: String(user.created_at || ''),
    lastLogin: String(user.last_login || '')
  };
}

function findUserByEmail_(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return sheetRecordsWithRows_('USERS').find(user =>
    String(user.email || '').trim().toLowerCase() === normalized
  ) || null;
}

function findUserById_(id) {
  return sheetRecordsWithRows_('USERS').find(user => String(user.id) === String(id)) || null;
}

function createSession_(user) {
  const token = newSessionToken_();
  const now = new Date();
  const expiry = new Date(now.getTime() + ERP_SESSION_HOURS_ * 60 * 60 * 1000);
  appendRecord_('SESSIONS', ERP_SESSION_HEADERS_, {
    token_hash: sha256Base64_(token),
    user_id: String(user.id),
    created_at: now.toISOString(),
    expires_at: expiry.toISOString(),
    last_seen: now.toISOString(),
    revoked_at: ''
  });
  return { token: token, expiresAt: expiry.toISOString() };
}

function getSessionContext_(token) {
  if (!token || String(token).length < 60 || String(token).length > 200) return null;
  const tokenHash = sha256Base64_(token);
  const session = sheetRecordsWithRows_('SESSIONS').find(item =>
    safeConstantTimeEqual_(String(item.token_hash || ''), tokenHash) &&
    !item.revoked_at &&
    Date.parse(String(item.expires_at || '')) > Date.now()
  );
  if (!session) return null;
  const foundUser = findUserById_(session.user_id);
  if (!foundUser || String(foundUser.status) !== 'ACTIVE') return null;
  return { user: foundUser, session: session };
}

function requireSession_(token, roles) {
  const context = getSessionContext_(token);
  if (!context) throw new Error('Sesi tidak valid atau telah kedaluwarsa. Login ulang.');
  if (roles && roles.indexOf(String(context.user.role)) < 0) throw new Error('Akses ditolak untuk role ' + context.user.role + '.');
  return context;
}

function recordBackendAudit_(context, action, entity, recordId, details) {
  ensureErpBackendSheets_();
  appendRecord_('BACKEND_AUDIT', ERP_AUDIT_HEADERS_, {
    id: 'AUD-' + Utilities.getUuid(),
    timestamp: new Date().toISOString(),
    actor_id: context && context.user ? String(context.user.id) : 'SYSTEM',
    actor_email: context && context.user ? String(context.user.email) : 'SYSTEM',
    action: String(action),
    entity: String(entity || 'ERP'),
    record_id: String(recordId || ''),
    details_json: JSON.stringify(details || {})
  });
}

function allowedOrigins_() {
  const raw = PropertiesService.getScriptProperties().getProperty('ALLOWED_APP_ORIGINS') || '';
  return raw.split(',').map(item => item.trim().replace(/\/+$/, '')).filter(Boolean);
}

function renderErpBridge_(parentOrigin) {
  const normalized = String(parentOrigin || '').trim().replace(/\/+$/, '');
  const origins = allowedOrigins_();
  if (!normalized || origins.indexOf(normalized) < 0 || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(normalized) &&
      !/^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(normalized)) {
    return HtmlService.createHtmlOutput('Origin aplikasi tidak diizinkan. Atur ALLOWED_APP_ORIGINS di Script Properties.');
  }
  const template = HtmlService.createTemplateFromFile('Bridge');
  template.parentOrigin = normalized;
  return template.evaluate().setTitle('ERP secure backend bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function isValidWebhookSecret_(provided, propertyName) {
  const expected = PropertiesService.getScriptProperties().getProperty(propertyName) || '';
  return expected.length >= 24 && safeConstantTimeEqual_(provided, expected);
}

function getWorkspaceMeta_() {
  const sheet = getErpSpreadsheet_().getSheetByName('ERP_META');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const row = sheet.getRange(2, 1, 1, ERP_META_HEADERS_.length).getValues()[0];
  return {
    workspace_name: String(row[0] || 'ERP Properti & Konstruksi'),
    version: Number(row[1]) || 0,
    updated_at: String(row[2] || ''),
    updated_by: String(row[3] || '')
  };
}

function loadWorkspaceSnapshot_() {
  const meta = getWorkspaceMeta_();
  if (!meta || meta.version < 1) return null;
  const sheet = getErpSpreadsheet_().getSheetByName('ERP_STATE');
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Metadata cloud ada tetapi potongan data tidak ditemukan.');
  const records = sheetRecordsWithRows_('ERP_STATE').filter(item => Number(item.version) === meta.version)
    .sort((a, b) => Number(a.chunk_index) - Number(b.chunk_index));
  if (!records.length) throw new Error('Snapshot cloud kosong untuk versi ' + meta.version + '.');
  const count = Number(records[0].chunk_count);
  if (!count || records.length !== count) throw new Error('Snapshot cloud tidak lengkap; jangan menyimpan perubahan sebelum diperiksa.');
  for (let i = 0; i < records.length; i++) {
    if (Number(records[i].chunk_index) !== i || Number(records[i].chunk_count) !== count) {
      throw new Error('Urutan potongan snapshot cloud tidak valid.');
    }
  }
  const raw = records.map(item => String(item.json_chunk || '')).join('');
  if (raw.length > ERP_MAX_SNAPSHOT_CHARS_) throw new Error('Snapshot cloud melewati batas ukuran ERP.');
  return { snapshot: validateErpSnapshot_(JSON.parse(raw)), meta: meta };
}

function validateErpSnapshot_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !input.operational || typeof input.operational !== 'object' || Array.isArray(input.operational) ||
      !input.accounting || typeof input.accounting !== 'object' || Array.isArray(input.accounting)) {
    throw new Error('Snapshot ERP tidak valid (operational/accounting wajib berupa object).');
  }
  const operationalKeys = [
    'bukuKas','arsipBukti','posKewajiban','auditLog','tanah','beko','notaMaterial',
    'stok','produksi','penjualan','pembelian','penggajian','anggaran','arusKas',
    'ocr','whatsapp','menuConfig','qcRecords','assets','taxRecords','housingUnits'
  ];
  const accountingKeys = ['akun','jurnal','invoice','purchaseOrder','rab','schedule'];
  operationalKeys.forEach(key => {
    if (!Array.isArray(input.operational[key])) throw new Error('Snapshot ERP tidak valid: ' + key + ' wajib berupa array.');
  });
  accountingKeys.forEach(key => {
    if (!Array.isArray(input.accounting[key])) throw new Error('Snapshot ERP tidak valid: accounting.' + key + ' wajib berupa array.');
  });
  const normalized = JSON.parse(JSON.stringify(input));
  const serialized = JSON.stringify(normalized);
  if (serialized.length > ERP_MAX_SNAPSHOT_CHARS_) throw new Error('Data ERP terlalu besar untuk satu snapshot. Arsipkan data lama lebih dulu.');
  return normalized;
}

function writeWorkspaceSnapshot_(snapshot, nextVersion, context) {
  const json = JSON.stringify(validateErpSnapshot_(snapshot));
  const chunks = [];
  for (let cursor = 0; cursor < json.length;) {
    let end = Math.min(cursor + ERP_STATE_CHUNK_CHARS_, json.length);
    // Do not split a UTF-16 surrogate pair between Google Sheets cells.
    if (end < json.length && end > cursor) {
      const charCode = json.charCodeAt(end - 1);
      if (charCode >= 0xD800 && charCode <= 0xDBFF) end--;
    }
    chunks.push(json.slice(cursor, end));
    cursor = end;
  }
  if (!chunks.length) chunks.push('{}');
  const sheet = getErpSpreadsheet_().getSheetByName('ERP_STATE');
  // Retry after interrupted save safely reuses the uncommitted version number.
  const rows = sheetRecordsWithRows_('ERP_STATE').filter(item => Number(item.version) === nextVersion)
    .map(item => Number(item.__rowNumber)).sort((a, b) => b - a);
  rows.forEach(rowNumber => sheet.deleteRow(rowNumber));
  const now = new Date().toISOString();
  const records = chunks.map((chunk, index) => [
    nextVersion, index, chunks.length, chunk, now,
    context && context.user ? String(context.user.id) : 'SYSTEM'
  ]);
  if (records.length) sheet.getRange(sheet.getLastRow() + 1, 1, records.length, ERP_STATE_HEADERS_.length).setValues(records);

  const metaSheet = getErpSpreadsheet_().getSheetByName('ERP_META');
  const existingMeta = getWorkspaceMeta_();
  const metaRow = [
    existingMeta ? existingMeta.workspace_name : 'ERP Properti & Konstruksi',
    nextVersion, now, context && context.user ? String(context.user.id) : 'SYSTEM'
  ];
  if (metaSheet.getLastRow() < 2) {
    metaSheet.getRange(2, 1, 1, metaRow.length).setValues([metaRow]);
  } else {
    metaSheet.getRange(2, 1, 1, metaRow.length).setValues([metaRow]);
  }
}

function cloneSnapshot_(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

function snapshotForRole_(snapshot, role) {
  const result = cloneSnapshot_(snapshot);
  const allOperational = [
    'bukuKas','arsipBukti','posKewajiban','auditLog','tanah','beko','notaMaterial',
    'stok','produksi','penjualan','pembelian','penggajian','anggaran','arusKas',
    'ocr','whatsapp','menuConfig','qcRecords','assets','taxRecords','housingUnits'
  ];
  const financeKeys = ['bukuKas','arsipBukti','posKewajiban','tanah','beko','anggaran','arusKas','ocr','whatsapp'];
  const projectKeys = ['tanah','beko','notaMaterial','stok','produksi','penjualan','pembelian','anggaran','qcRecords','assets','housingUnits'];
  const visible = role === 'ADMIN' ? allOperational
    : role === 'KEUANGAN' ? financeKeys
      : role === 'PROYEK' ? projectKeys
        : ['tanah','beko'];
  allOperational.forEach(key => {
    if (visible.indexOf(key) < 0) result.operational[key] = [];
  });
  result.operational.auditLog = role === 'ADMIN' ? result.operational.auditLog : [];
  result.operational.menuConfig = role === 'ADMIN' ? result.operational.menuConfig : [];
  if (role === 'ADMIN' || role === 'KEUANGAN') return result;
  result.accounting = {
    akun: [], jurnal: [], invoice: [], purchaseOrder: [], rab: [], schedule: []
  };
  if (role === 'VIEWER') {
    result.operational.tanah = (snapshot.operational.tanah || []).map(item => ({
      id: item.id, pemilik: '', luas_bt: Number(item.luas_bt) || 0, harga_per_bt: 0,
      dp: 0, status: item.status, kode_bukti: '', url_bukti: '',
      catatan: String(item.catatan || '').slice(0, 120)
    }));
    result.operational.beko = (snapshot.operational.beko || []).map(item => ({
      id: item.id, item: item.item, panjang: Number(item.panjang) || 0,
      lebar: Number(item.lebar) || 0, tinggi: Number(item.tinggi) || 0,
      tarif: 0, status: item.status, kode_bukti: '', url_bukti: '',
      catatan: String(item.catatan || '').slice(0, 120),
      ...(item.satuan_volume ? { satuan_volume: item.satuan_volume } : {})
    }));
  }
  return result;
}

function mergeSnapshotForRole_(currentSnapshot, incomingSnapshot, role) {
  const current = cloneSnapshot_(currentSnapshot);
  const incoming = validateErpSnapshot_(incomingSnapshot);
  if (role === 'ADMIN') return incoming;
  const allowedOperational = role === 'KEUANGAN'
    ? ['bukuKas','arsipBukti','posKewajiban','tanah','beko','anggaran','arusKas','ocr','whatsapp']
    : role === 'PROYEK'
      ? ['tanah','beko','notaMaterial','stok','produksi','penjualan','pembelian','anggaran','qcRecords','assets','housingUnits']
      : [];
  if (role === 'VIEWER') throw new Error('Role VIEWER hanya mendapat akses baca.');
  allowedOperational.forEach(key => { current.operational[key] = incoming.operational[key]; });
  if (role === 'KEUANGAN') current.accounting = incoming.accounting;
  // auditLog is retained from the canonical snapshot; BACKEND_AUDIT is the
  // server-authored activity log and is never part of client-writable state.
  current.operational.auditLog = currentSnapshot.operational.auditLog;
  return current;
}

function apiBootstrapAdmin(bootstrapCode, email, password, name, phone, snapshot) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ensureErpBackendSheets_();
    const properties = PropertiesService.getScriptProperties();
    const expectedCode = properties.getProperty('ERP_BOOTSTRAP_CODE') || '';
    const users = sheetRecordsWithRows_('USERS').filter(user => String(user.status) === 'ACTIVE');
    if (users.length) return { success: false, error: 'Administrator sudah dibuat. Gunakan halaman login.' };
    if (!expectedCode || !safeConstantTimeEqual_(String(bootstrapCode || ''), expectedCode)) {
      return { success: false, error: 'Kode aktivasi awal tidak benar. Periksa ERP_BOOTSTRAP_CODE pada Script Properties.' };
    }
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const cleanPassword = String(password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { success: false, error: 'Email tidak valid.' };
    if (cleanName.length < 2 || cleanName.length > 100) return { success: false, error: 'Nama minimal 2 karakter.' };
    if (cleanPassword.length < 12 || cleanPassword.length > 128) return { success: false, error: 'Kata sandi harus 12–128 karakter.' };
    const validatedSnapshot = validateErpSnapshot_(snapshot);
    const now = new Date().toISOString();
    const salt = Utilities.getUuid() + Utilities.getUuid();
    const user = {
      id: 'USR-' + Utilities.getUuid(),
      email: normalizedEmail, name: cleanName, phone: String(phone || '').trim(),
      role: 'ADMIN', status: 'ACTIVE',
      password_salt: salt, password_hash: passwordHash_(cleanPassword, salt),
      failed_attempts: 0, locked_until: '', created_at: now, last_login: now
    };
    // Persist the validated workspace before consuming the one-time code or creating
    // an active account. If the cloud snapshot write fails, setup can be retried safely.
    writeWorkspaceSnapshot_(validatedSnapshot, 1, { user: user });
    appendRecord_('USERS', ERP_USER_HEADERS_, user);
    const session = createSession_(user);
    properties.deleteProperty('ERP_BOOTSTRAP_CODE');
    const context = { user: user };
    recordBackendAudit_(context, 'BOOTSTRAP_ADMIN', 'USERS', user.id, { role: 'ADMIN' });
    return {
      success: true, sessionToken: session.token, expiresAt: session.expiresAt,
      user: publicUser_(user), version: 1, snapshot: snapshotForRole_(validatedSnapshot, 'ADMIN')
    };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  } finally {
    lock.releaseLock();
  }
}

function apiLogin(email, password) {
  try {
    ensureErpBackendSheets_();
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const user = findUserByEmail_(email);
      // Keep the response generic to avoid confirming whether an email exists.
      if (!user || String(user.status) !== 'ACTIVE') {
        return { success: false, error: 'Email atau kata sandi tidak valid, atau akun terkunci.' };
      }
      const lockedUntil = Date.parse(String(user.locked_until || ''));
      if (lockedUntil && lockedUntil > Date.now()) {
        return { success: false, error: 'Email atau kata sandi tidak valid, atau akun terkunci.' };
      }
      const passOk = safeConstantTimeEqual_(String(user.password_hash || ''),
        passwordHash_(String(password || ''), String(user.password_salt || 'invalid-salt')));
      if (!passOk) {
        const failures = (Number(user.failed_attempts) || 0) + 1;
        const next = Object.assign({}, user, {
          failed_attempts: failures,
          locked_until: failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : ''
        });
        updateRecordRow_('USERS', user.__rowNumber, ERP_USER_HEADERS_, next);
        return { success: false, error: 'Email atau kata sandi tidak valid, atau akun terkunci.' };
      }
      const nextUser = Object.assign({}, user, {
        failed_attempts: 0, locked_until: '', last_login: new Date().toISOString()
      });
      updateRecordRow_('USERS', user.__rowNumber, ERP_USER_HEADERS_, nextUser);
      const session = createSession_(nextUser);
      recordBackendAudit_({ user: nextUser }, 'LOGIN', 'SESSIONS', nextUser.id, { expiresAt: session.expiresAt });
      return { success: true, sessionToken: session.token, expiresAt: session.expiresAt, user: publicUser_(nextUser) };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  }
}

function apiGetSession(token) {
  try {
    const context = requireSession_(String(token || ''), ERP_ROLE_VALUES_);
    return { success: true, user: publicUser_(context.user), expiresAt: String(context.session.expires_at) };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  }
}

function apiLoadWorkspace(token) {
  try {
    const context = requireSession_(String(token || ''), ERP_ROLE_VALUES_);
    ensureErpBackendSheets_();
    const loaded = loadWorkspaceSnapshot_();
    if (!loaded) return { success: false, error: 'Workspace belum diinisialisasi. Administrator harus menjalankan setup awal.' };
    return {
      success: true, version: loaded.meta.version, updatedAt: loaded.meta.updated_at,
      snapshot: snapshotForRole_(loaded.snapshot, String(context.user.role))
    };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  }
}

function apiSaveWorkspace(token, snapshot, expectedVersion) {
  const lock = LockService.getScriptLock();
  try {
    const context = requireSession_(String(token || ''), ['ADMIN','KEUANGAN','PROYEK']);
    lock.waitLock(10000);
    ensureErpBackendSheets_();
    const loaded = loadWorkspaceSnapshot_();
    if (!loaded) return { success: false, error: 'Workspace belum diinisialisasi.' };
    if (Number(expectedVersion) !== Number(loaded.meta.version)) {
      return { success: false, conflict: true, version: loaded.meta.version, error: 'Versi data cloud berubah. Muat ulang sebelum menyimpan untuk mencegah data tertimpa.' };
    }
    const merged = mergeSnapshotForRole_(loaded.snapshot, snapshot, String(context.user.role));
    const newVersion = loaded.meta.version + 1;
    writeWorkspaceSnapshot_(merged, newVersion, context);
    const changedSections = [];
    ['operational','accounting'].forEach(section => {
      const before = loaded.snapshot[section];
      const after = merged[section];
      Object.keys(after).forEach(key => {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changedSections.push(section + '.' + key);
      });
    });
    recordBackendAudit_(context, 'SAVE_WORKSPACE', 'ERP_STATE', String(newVersion), {
      versionBefore: loaded.meta.version, versionAfter: newVersion,
      changedSections: changedSections.slice(0, 50)
    });
    return { success: true, version: newVersion, updatedAt: new Date().toISOString() };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function apiLogout(token) {
  try {
    const tokenHash = sha256Base64_(String(token || ''));
    const session = sheetRecordsWithRows_('SESSIONS').find(item =>
      safeConstantTimeEqual_(String(item.token_hash || ''), tokenHash) && !item.revoked_at
    );
    if (session) {
      const next = Object.assign({}, session, { revoked_at: new Date().toISOString() });
      updateRecordRow_('SESSIONS', session.__rowNumber, ERP_SESSION_HEADERS_, next);
      const user = findUserById_(session.user_id);
      if (user) recordBackendAudit_({ user: user }, 'LOGOUT', 'SESSIONS', user.id, {});
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  }
}

function apiListUsers(token) {
  try {
    requireSession_(String(token || ''), ['ADMIN']);
    return { success: true, users: sheetRecordsWithRows_('USERS').map(publicUser_) };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  }
}

function apiCreateUser(token, input) {
  const lock = LockService.getScriptLock();
  try {
    const context = requireSession_(String(token || ''), ['ADMIN']);
    lock.waitLock(10000);
    ensureErpBackendSheets_();
    const email = String(input && input.email || '').trim().toLowerCase();
    const name = String(input && input.name || '').trim();
    const password = String(input && input.password || '');
    const role = String(input && input.role || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email tidak valid.');
    if (name.length < 2 || name.length > 100) throw new Error('Nama minimal 2 karakter.');
    if (password.length < 12 || password.length > 128) throw new Error('Kata sandi harus 12–128 karakter.');
    if (ERP_ROLE_VALUES_.indexOf(role) < 0) throw new Error('Role tidak valid.');
    if (findUserByEmail_(email)) throw new Error('Email sudah terdaftar.');
    const salt = Utilities.getUuid() + Utilities.getUuid();
    const now = new Date().toISOString();
    const user = {
      id: 'USR-' + Utilities.getUuid(), email, name,
      phone: String(input && input.phone || '').trim(), role, status: 'ACTIVE',
      password_salt: salt, password_hash: passwordHash_(password, salt),
      failed_attempts: 0, locked_until: '', created_at: now, last_login: ''
    };
    appendRecord_('USERS', ERP_USER_HEADERS_, user);
    recordBackendAudit_(context, 'CREATE_USER', 'USERS', user.id, { email: email, role: role });
    return { success: true, user: publicUser_(user) };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function apiSetUserStatus(token, userId, status) {
  const lock = LockService.getScriptLock();
  try {
    const context = requireSession_(String(token || ''), ['ADMIN']);
    lock.waitLock(10000);
    const target = findUserById_(userId);
    if (!target) throw new Error('User tidak ditemukan.');
    const nextStatus = String(status || '').toUpperCase();
    if (!['ACTIVE','INACTIVE'].includes(nextStatus)) throw new Error('Status user tidak valid.');
    if (String(context.user.id) === String(target.id) && nextStatus !== 'ACTIVE') throw new Error('Admin tidak dapat menonaktifkan akun sendiri.');
    if (String(target.role) === 'ADMIN' && nextStatus !== 'ACTIVE') {
      const activeAdmins = sheetRecordsWithRows_('USERS').filter(user => user.role === 'ADMIN' && user.status === 'ACTIVE');
      if (activeAdmins.length <= 1) throw new Error('Admin aktif terakhir tidak dapat dinonaktifkan.');
    }
    updateRecordRow_('USERS', target.__rowNumber, ERP_USER_HEADERS_, Object.assign({}, target, { status: nextStatus }));
    if (nextStatus !== 'ACTIVE') {
      const sessions = sheetRecordsWithRows_('SESSIONS').filter(session =>
        String(session.user_id) === String(target.id) && !session.revoked_at
      );
      const sheet = getErpSpreadsheet_().getSheetByName('SESSIONS');
      sessions.forEach(session => {
        const next = Object.assign({}, session, { revoked_at: new Date().toISOString() });
        updateRecordRow_('SESSIONS', session.__rowNumber, ERP_SESSION_HEADERS_, next);
      });
    }
    recordBackendAudit_(context, 'SET_USER_STATUS', 'USERS', target.id, { status: nextStatus });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function apiChangePassword(token, currentPassword, newPassword) {
  const lock = LockService.getScriptLock();
  try {
    const context = requireSession_(String(token || ''), ERP_ROLE_VALUES_);
    lock.waitLock(10000);
    const user = findUserById_(context.user.id);
    if (!user) throw new Error('User tidak ditemukan.');
    const currentHash = passwordHash_(String(currentPassword || ''), String(user.password_salt || ''));
    if (!safeConstantTimeEqual_(String(user.password_hash || ''), currentHash)) throw new Error('Kata sandi lama tidak benar.');
    const password = String(newPassword || '');
    if (password.length < 12 || password.length > 128) throw new Error('Kata sandi baru harus 12–128 karakter.');
    const salt = Utilities.getUuid() + Utilities.getUuid();
    const nextUser = Object.assign({}, user, { password_salt: salt, password_hash: passwordHash_(password, salt) });
    updateRecordRow_('USERS', user.__rowNumber, ERP_USER_HEADERS_, nextUser);
    const sessions = sheetRecordsWithRows_('SESSIONS').filter(item =>
      String(item.user_id) === String(user.id) && !item.revoked_at
    );
    sessions.forEach(item => updateRecordRow_('SESSIONS', item.__rowNumber, ERP_SESSION_HEADERS_,
      Object.assign({}, item, { revoked_at: new Date().toISOString() })
    ));
    const session = createSession_(nextUser);
    recordBackendAudit_({ user: nextUser }, 'CHANGE_PASSWORD', 'USERS', user.id, {});
    return { success: true, sessionToken: session.token, expiresAt: session.expiresAt, user: publicUser_(nextUser) };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function apiHealth() {
  return {
    success: true,
    backend: 'Google Apps Script + Google Sheets',
    configured: Boolean(SPREADSHEET_ID),
    stateVersion: getWorkspaceMeta_() ? getWorkspaceMeta_().version : 0
  };
}



function apiUpdateUser(token, userId, input) {
  const lock = LockService.getScriptLock();
  try {
    const context = requireSession_(String(token || ''), ['ADMIN']);
    lock.waitLock(10000);
    const target = findUserById_(userId);
    if (!target) throw new Error('User tidak ditemukan.');
    const name = String(input && input.name || '').trim();
    const phone = String(input && input.phone || '').trim();
    const role = String(input && input.role || '');
    if (name.length < 2 || name.length > 100) throw new Error('Nama minimal 2 karakter.');
    if (phone.length > 40) throw new Error('Nomor telepon terlalu panjang.');
    if (ERP_ROLE_VALUES_.indexOf(role) < 0) throw new Error('Role tidak valid.');
    if (String(target.id) === String(context.user.id) && role !== 'ADMIN') {
      throw new Error('Admin tidak dapat menurunkan role akun sendiri.');
    }
    if (String(target.role) === 'ADMIN' && role !== 'ADMIN' && String(target.status) === 'ACTIVE') {
      const activeAdmins = sheetRecordsWithRows_('USERS').filter(user => user.role === 'ADMIN' && user.status === 'ACTIVE');
      if (activeAdmins.length <= 1) throw new Error('Admin aktif terakhir tidak dapat diturunkan role-nya.');
    }
    const nextUser = Object.assign({}, target, { name: name, phone: phone, role: role });
    updateRecordRow_('USERS', target.__rowNumber, ERP_USER_HEADERS_, nextUser);
    recordBackendAudit_(context, 'UPDATE_USER', 'USERS', target.id, { role: role, name: name });
    return { success: true, user: publicUser_(nextUser) };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function apiListBackendAudit(token, limit) {
  try {
    requireSession_(String(token || ''), ['ADMIN']);
    const capped = Math.max(1, Math.min(500, Number(limit) || 100));
    const records = sheetRecordsWithRows_('BACKEND_AUDIT')
      .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
      .slice(0, capped)
      .map(row => ({
        id: String(row.id || ''),
        timestamp: String(row.timestamp || ''),
        actorId: String(row.actor_id || ''),
        actorEmail: String(row.actor_email || ''),
        action: String(row.action || ''),
        entity: String(row.entity || ''),
        recordId: String(row.record_id || ''),
        details: String(row.details_json || '{}')
      }));
    return { success: true, records: records };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  }
}
