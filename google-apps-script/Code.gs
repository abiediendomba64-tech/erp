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
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // Ganti dengan API key Anda
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ============ WEBHOOK HANDLERS ============

/**
 * Handle GET requests (untuk testing)
 */
function doGet(e) {
  return jsonResponse({ 
    status: 'OK', 
    message: 'ERP Backend API is running',
    endpoints: [
      'POST /ocr - Scan kwitansi',
      'POST /webhook/whatsapp - WhatsApp webhook',
      'POST /webhook/telegram - Telegram webhook',
      'POST /transaksi - Input transaksi',
      'GET /transaksi - List transaksi',
      'POST /reversal - Reversal jurnal',
      'GET /laporan/laba-rugi - Laporan laba rugi',
      'GET /laporan/neraca - Laporan neraca'
    ]
  });
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    const path = e.parameter.path || '';
    const data = JSON.parse(e.postData.contents);
    
    // Route ke handler yang sesuai
    if (path === '/ocr') {
      return jsonResponse(handleOCR(data));
    } else if (path === '/webhook/whatsapp') {
      return jsonResponse(handleWhatsAppWebhook(data));
    } else if (path === '/webhook/telegram') {
      return jsonResponse(handleTelegramWebhook(data));
    } else if (path === '/transaksi') {
      return jsonResponse(handleAddTransaksi(data));
    } else if (path === '/reversal') {
      return jsonResponse(handleReversal(data));
    } else {
      return jsonResponse({ error: 'Endpoint not found' }, 404);
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ============ OCR FUNCTIONS ============

/**
 * OCR Kwitansi dengan Gemini Vision API
 * @param {Object} data - { imageUrl: string }
 * @returns {Object} - { vendor, tanggal, total, kategori, confidence }
 */
function handleOCR(data) {
  const imageUrl = data.imageUrl;
  if (!imageUrl) {
    throw new Error('imageUrl is required');
  }
  
  // Download gambar
  const blob = UrlFetchApp.fetch(imageUrl).getBlob();
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  // Kirim ke Gemini API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
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
      saveToArsipBukti(ocrData, imageUrl);
      
      return {
        success: true,
        data: ocrData,
        message: 'OCR berhasil. Data disimpan ke ARSIP_BUKTI.'
      };
    }
  }
  
  throw new Error('Gagal parse hasil OCR: ' + JSON.stringify(result));
}

/**
 * Simpan hasil OCR ke sheet ARSIP_BUKTI
 */
function saveToArsipBukti(ocrData, imageUrl) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('ARSIP_BUKTI');
  
  if (!sheet) {
    sheet = ss.insertSheet('ARSIP_BUKTI');
    sheet.appendRow(['id', 'kode_bukti', 'jenis', 'link_drive', 'tgl_upload', 'terverifikasi', 'catatan_audit', 'penerima', 'nominal', 'keterangan', 'confidence', 'created_at']);
  }
  
  const id = 'BUKTI-' + new Date().getTime();
  const confidence = ocrData.confidence || 0;
  const status = confidence >= 90 ? 'Ya' : confidence >= 70 ? 'Perlu_Konfirmasi' : 'Tidak';
  
  sheet.appendRow([
    id,
    ocrData.nomor_bukti || '',
    'Kwitansi_Foto',
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
  
  const changes = entry.changes && entry.entry[0].changes[0];
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const transaksiSheet = ss.getSheetByName('BUKU_KAS') || ss.insertSheet('BUKU_KAS');
  const jurnalSheet = ss.getSheetByName('JURNAL') || ss.insertSheet('JURNAL');
  
  // Setup headers jika belum ada
  if (transaksiSheet.getLastRow() === 0) {
    transaksiSheet.appendRow(['id', 'tanggal', 'no_ref', 'kode_bukti', 'keterangan', 'kategori', 'masuk', 'keluar', 'status_verifikasi', 'created_at']);
  }
  if (jurnalSheet.getLastRow() === 0) {
    jurnalSheet.appendRow(['id', 'transaksi_id', 'tanggal', 'akun_kode', 'akun_nama', 'debit', 'kredit', 'keterangan', 'created_at']);
  }
  
  // Generate ID
  const transaksiId = 'TRX-' + new Date().getTime();
  const jurnalId = 'JRN-' + new Date().getTime();
  
  // Generate jurnal double-entry
  const jurnalEntries = generateJurnalDoubleEntry(data);
  
  // Simpan transaksi
  transaksiSheet.appendRow([
    transaksiId,
    data.tanggal,
    data.no_ref || transaksiId,
    data.kode_bukti || '',
    data.keterangan,
    data.kategori || 'Operasional',
    data.masuk || 0,
    data.keluar || 0,
    data.status_verifikasi || 'LENGKAP',
    new Date().toISOString()
  ]);
  
  // Simpan jurnal entries
  jurnalEntries.forEach(entry => {
    jurnalSheet.appendRow([
      jurnalId + '-' + Math.random().toString(36).substr(2, 9),
      transaksiId,
      data.tanggal,
      entry.akun_kode,
      entry.akun_nama,
      entry.debit,
      entry.kredit,
      entry.keterangan || data.keterangan,
      new Date().toISOString()
    ]);
  });
  
  // Log ke audit trail
  logAudit('CREATE', 'BUKU_KAS', transaksiId, '-', `Transaksi: ${data.keterangan} - ${data.masuk || data.keluar}`);
  
  return {
    success: true,
    transaksi_id: transaksiId,
    jurnal_id: jurnalId,
    jurnal_entries: jurnalEntries.length,
    message: 'Transaksi dan jurnal berhasil disimpan'
  };
}

/**
 * Generate jurnal double-entry dari transaksi
 */
function generateJurnalDoubleEntry(transaksi) {
  const entries = [];
  const masuk = transaksi.masuk || 0;
  const keluar = transaksi.keluar || 0;
  
  if (masuk > 0) {
    // Penerimaan kas
    entries.push({
      akun_kode: '1-1001',
      akun_nama: 'Kas',
      debit: masuk,
      kredit: 0,
      keterangan: transaksi.keterangan
    });
    
    // Sumber penerimaan
    entries.push({
      akun_kode: transaksi.sumber_akun || '4-1001',
      akun_nama: transaksi.sumber_nama || 'Pendapatan',
      debit: 0,
      kredit: masuk,
      keterangan: transaksi.keterangan
    });
  }
  
  if (keluar > 0) {
    // Pengeluaran kas
    entries.push({
      akun_kode: transaksi.beban_akun || '5-2008',
      akun_nama: transaksi.beban_nama || 'Beban',
      debit: keluar,
      kredit: 0,
      keterangan: transaksi.keterangan
    });
    
    entries.push({
      akun_kode: '1-1001',
      akun_nama: 'Kas',
      debit: 0,
      kredit: keluar,
      keterangan: transaksi.keterangan
    });
  }
  
  return entries;
}

// ============ REVERSAL FUNCTIONS ============

/**
 * Reversal jurnal (koreksi tanpa edit)
 */
function handleReversal(data) {
  const transaksiId = data.transaksi_id;
  const alasan = data.alasan || 'Reversal';
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const jurnalSheet = ss.getSheetByName('JURNAL');
  
  if (!jurnalSheet) {
    throw new Error('Sheet JURNAL tidak ditemukan');
  }
  
  // Cari jurnal original
  const jurnalData = jurnalSheet.getDataRange().getValues();
  const originalEntries = jurnalData.filter(row => row[1] === transaksiId);
  
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Sheet BUKU_KAS
  let sheet = ss.getSheetByName('BUKU_KAS');
  if (!sheet) {
    sheet = ss.insertSheet('BUKU_KAS');
    sheet.appendRow(['id', 'tanggal', 'no_ref', 'kode_bukti', 'keterangan', 'kategori', 'masuk', 'keluar', 'status_verifikasi', 'created_at']);
  }
  
  // Sheet JURNAL
  sheet = ss.getSheetByName('JURNAL');
  if (!sheet) {
    sheet = ss.insertSheet('JURNAL');
    sheet.appendRow(['id', 'transaksi_id', 'tanggal', 'akun_kode', 'akun_nama', 'debit', 'kredit', 'keterangan', 'created_at']);
  }
  
  // Sheet ARSIP_BUKTI
  sheet = ss.getSheetByName('ARSIP_BUKTI');
  if (!sheet) {
    sheet = ss.insertSheet('ARSIP_BUKTI');
    sheet.appendRow(['id', 'kode_bukti', 'jenis', 'link_drive', 'tgl_upload', 'terverifikasi', 'catatan_audit', 'penerima', 'nominal', 'keterangan', 'confidence', 'created_at']);
  }
  
  // Sheet AUDIT_LOG
  sheet = ss.getSheetByName('AUDIT_LOG');
  if (!sheet) {
    sheet = ss.insertSheet('AUDIT_LOG');
    sheet.appendRow(['id', 'timestamp', 'user', 'aksi', 'tabel', 'record_id', 'nilai_lama', 'nilai_baru', 'alasan']);
  }
  
  // Sheet AKUN (Chart of Accounts)
  sheet = ss.getSheetByName('AKUN');
  if (!sheet) {
    sheet = ss.insertSheet('AKUN');
    sheet.appendRow(['kode', 'nama', 'tipe', 'kategori', 'saldo_normal']);
    
    // Insert default accounts
    const defaultAkun = [
      ['1-1001', 'Kas', 'Aset', 'Aset Lancar', 'Debit'],
      ['1-1002', 'Bank', 'Aset', 'Aset Lancar', 'Debit'],
      ['1-1003', 'Piutang Usaha', 'Aset', 'Aset Lancar', 'Debit'],
      ['2-1001', 'Utang Usaha', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'],
      ['2-1003', 'Utang Pajak', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit'],
      ['3-1001', 'Modal Pemilik', 'Ekuitas', 'Ekuitas', 'Kredit'],
      ['3-1002', 'Laba Ditahan', 'Ekuitas', 'Ekuitas', 'Kredit'],
      ['4-1001', 'Pendapatan Penjualan', 'Pendapatan', 'Pendapatan Usaha', 'Kredit'],
      ['4-1002', 'Pendapatan Jasa', 'Pendapatan', 'Pendapatan Usaha', 'Kredit'],
      ['5-1001', 'Harga Pokok Penjualan', 'Beban', 'Beban Langsung', 'Debit'],
      ['5-2001', 'Beban Gaji', 'Beban', 'Beban Operasional', 'Debit'],
      ['5-2002', 'Beban Sewa', 'Beban', 'Beban Operasional', 'Debit'],
      ['5-2008', 'Beban Lain-lain', 'Beban', 'Beban Operasional', 'Debit'],
    ];
    
    defaultAkun.forEach(akun => sheet.appendRow(akun));
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
