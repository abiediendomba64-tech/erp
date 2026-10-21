/**
 * GOOGLE APPS SCRIPT - BACKEND API
 * 
 * Cara Setup:
 * 1. Buka https://script.google.com
 * 2. Buat project baru
 * 3. Copy-paste kode ini
 * 4. Deploy sebagai Web App
 * 5. Copy URL untuk digunakan di frontend
 * 
 * Endpoints:
 * - POST /transaksi - Input transaksi baru
 * - GET /transaksi - List semua transaksi
 * - PUT /transaksi/:id - Update transaksi
 * - DELETE /transaksi/:id - Hapus transaksi
 * - POST /ocr - Scan foto kwitansi
 * - GET /laporan/laba-rugi - Laporan laba rugi
 * - GET /laporan/neraca - Laporan neraca
 */

// ============ KONFIGURASI ============
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Ganti dengan ID Google Sheets Anda
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // Ganti dengan API key Gemini Anda

// ============ MAIN FUNCTIONS ============

/**
 * Handle GET requests
 */
function doGet(e) {
  const path = e.parameter.path || '';
  
  try {
    if (path === '/transaksi') {
      return jsonResponse(getAllTransaksi());
    } else if (path === '/laporan/laba-rugi') {
      return jsonResponse(generateLabaRugi());
    } else if (path === '/laporan/neraca') {
      return jsonResponse(generateNeraca());
    } else if (path === '/akun') {
      return jsonResponse(getAllAkun());
    } else {
      return jsonResponse({ error: 'Endpoint not found' }, 404);
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  const path = e.parameter.path || '';
  const data = JSON.parse(e.postData.contents);
  
  try {
    if (path === '/transaksi') {
      const result = addTransaksi(data);
      return jsonResponse(result);
    } else if (path === '/ocr') {
      const result = scanKwitansi(data.imageUrl);
      return jsonResponse(result);
    } else {
      return jsonResponse({ error: 'Endpoint not found' }, 404);
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle PUT requests
 */
function doPut(e) {
  const path = e.parameter.path || '';
  const data = JSON.parse(e.postData.contents);
  
  try {
    if (path.startsWith('/transaksi/')) {
      const id = path.split('/')[2];
      const result = updateTransaksi(id, data);
      return jsonResponse(result);
    } else {
      return jsonResponse({ error: 'Endpoint not found' }, 404);
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle DELETE requests
 */
function doDelete(e) {
  const path = e.parameter.path || '';
  
  try {
    if (path.startsWith('/transaksi/')) {
      const id = path.split('/')[2];
      const result = deleteTransaksi(id);
      return jsonResponse(result);
    } else {
      return jsonResponse({ error: 'Endpoint not found' }, 404);
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ============ TRANSAKSI FUNCTIONS ============

/**
 * Get semua transaksi
 */
function getAllTransaksi() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transaksi');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

/**
 * Tambah transaksi baru
 */
function addTransaksi(transaksi) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transaksi');
  
  // Generate ID
  const id = 'TRX-' + new Date().getTime();
  
  // Generate jurnal otomatis
  const jurnal = generateJurnal(transaksi);
  
  // Simpan transaksi
  sheet.appendRow([
    id,
    transaksi.tanggal,
    transaksi.jenis,
    transaksi.keterangan,
    transaksi.jumlah,
    transaksi.ppn || 0,
    transaksi.pihak || '',
    transaksi.referensi || '',
    new Date().toISOString(),
    'Admin'
  ]);
  
  // Simpan jurnal
  const jurnalSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Jurnal');
  jurnal.forEach(entry => {
    jurnalSheet.appendRow([
      id,
      entry.akun_kode,
      entry.akun_nama,
      entry.debit,
      entry.kredit,
      new Date().toISOString()
    ]);
  });
  
  return { success: true, id: id, jurnal: jurnal };
}

/**
 * Update transaksi
 */
function updateTransaksi(id, data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transaksi');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      // Update data
      sheet.getRange(i + 1, 2, 1, 8).setValues([[
        data.tanggal,
        data.jenis,
        data.keterangan,
        data.jumlah,
        data.ppn || 0,
        data.pihak || '',
        data.referensi || '',
        new Date().toISOString()
      ]]);
      
      return { success: true, id: id };
    }
  }
  
  throw new Error('Transaksi tidak ditemukan');
}

/**
 * Hapus transaksi
 */
function deleteTransaksi(id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transaksi');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      sheet.deleteRow(i + 1);
      
      // Hapus jurnal terkait
      const jurnalSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Jurnal');
      const jurnalValues = jurnalSheet.getDataRange().getValues();
      
      for (let j = jurnalValues.length - 1; j >= 1; j--) {
        if (jurnalValues[j][0] === id) {
          jurnalSheet.deleteRow(j + 1);
        }
      }
      
      return { success: true, id: id };
    }
  }
  
  throw new Error('Transaksi tidak ditemukan');
}

// ============ JURNAL FUNCTIONS ============

/**
 * Generate jurnal dari transaksi (Double-Entry)
 */
function generateJurnal(transaksi) {
  const jurnal = [];
  const totalKredit = transaksi.jumlah + (transaksi.ppn || 0);
  
  switch (transaksi.jenis) {
    case 'penjualan_tunai':
      jurnal.push(
        { akun_kode: '1-1001', akun_nama: 'Kas', debit: totalKredit, kredit: 0 },
        { akun_kode: '4-1001', akun_nama: 'Pendapatan Penjualan', debit: 0, kredit: transaksi.jumlah }
      );
      if (transaksi.ppn > 0) {
        jurnal.push({ akun_kode: '2-1003', akun_nama: 'Utang Pajak', debit: 0, kredit: transaksi.ppn });
      }
      break;
      
    case 'penjualan_kredit':
      jurnal.push(
        { akun_kode: '1-1003', akun_nama: 'Piutang Usaha', debit: totalKredit, kredit: 0 },
        { akun_kode: '4-1001', akun_nama: 'Pendapatan Penjualan', debit: 0, kredit: transaksi.jumlah }
      );
      if (transaksi.ppn > 0) {
        jurnal.push({ akun_kode: '2-1003', akun_nama: 'Utang Pajak', debit: 0, kredit: transaksi.ppn });
      }
      break;
      
    case 'pembelian_tunai':
      jurnal.push(
        { akun_kode: '5-1001', akun_nama: 'Harga Pokok Penjualan', debit: transaksi.jumlah, kredit: 0 },
        { akun_kode: '1-1001', akun_nama: 'Kas', debit: 0, kredit: totalKredit }
      );
      if (transaksi.ppn > 0) {
        jurnal.push({ akun_kode: '1-1005', akun_nama: 'Biaya Dibayar Dimuka', debit: transaksi.ppn, kredit: 0 });
      }
      break;
      
    case 'pembelian_kredit':
      jurnal.push(
        { akun_kode: '5-1001', akun_nama: 'Harga Pokok Penjualan', debit: transaksi.jumlah, kredit: 0 },
        { akun_kode: '2-1001', akun_nama: 'Utang Usaha', debit: 0, kredit: totalKredit }
      );
      if (transaksi.ppn > 0) {
        jurnal.push({ akun_kode: '1-1005', akun_nama: 'Biaya Dibayar Dimuka', debit: transaksi.ppn, kredit: 0 });
      }
      break;
      
    case 'terima_piutang':
      jurnal.push(
        { akun_kode: '1-1001', akun_nama: 'Kas', debit: transaksi.jumlah, kredit: 0 },
        { akun_kode: '1-1003', akun_nama: 'Piutang Usaha', debit: 0, kredit: transaksi.jumlah }
      );
      break;
      
    case 'bayar_utang':
      jurnal.push(
        { akun_kode: '2-1001', akun_nama: 'Utang Usaha', debit: transaksi.jumlah, kredit: 0 },
        { akun_kode: '1-1001', akun_nama: 'Kas', debit: 0, kredit: transaksi.jumlah }
      );
      break;
      
    case 'beban_operasional':
      jurnal.push(
        { akun_kode: '5-2008', akun_nama: 'Beban Lain-lain', debit: transaksi.jumlah, kredit: 0 },
        { akun_kode: '1-1001', akun_nama: 'Kas', debit: 0, kredit: transaksi.jumlah }
      );
      break;
  }
  
  return jurnal;
}

// ============ OCR FUNCTIONS ============

/**
 * Scan foto kwitansi dengan Gemini API
 */
function scanKwitansi(imageUrl) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [{
        fileData: {
          mimeType: 'image/jpeg',
          fileUri: imageUrl
        }
      }, {
        text: 'Ekstrak data dari kwitansi ini dalam format JSON dengan field: penerima, nominal, tanggal, nomor_bukti, keterangan. Jika field tidak ditemukan, isi dengan null.'
      }]
    }]
  };
  
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  // Parse hasil OCR
  const text = data.candidates[0].content.parts[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Gagal parse hasil OCR');
}

// ============ LAPORAN FUNCTIONS ============

/**
 * Generate laporan Laba Rugi
 */
function generateLabaRugi() {
  const jurnalSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Jurnal');
  const jurnalData = jurnalSheet.getDataRange().getValues();
  
  let totalPendapatan = 0;
  let totalBeban = 0;
  
  // Hitung saldo per akun
  const saldoAkun = {};
  
  for (let i = 1; i < jurnalData.length; i++) {
    const akunKode = jurnalData[i][1];
    const debit = jurnalData[i][3];
    const kredit = jurnalData[i][4];
    
    if (!saldoAkun[akunKode]) {
      saldoAkun[akunKode] = 0;
    }
    
    // Akun pendapatan (4-xxxx) - saldo normal kredit
    if (akunKode.startsWith('4-')) {
      saldoAkun[akunKode] += kredit - debit;
    }
    // Akun beban (5-xxxx) - saldo normal debit
    else if (akunKode.startsWith('5-')) {
      saldoAkun[akunKode] += debit - kredit;
    }
  }
  
  // Hitung total
  Object.keys(saldoAkun).forEach(akunKode => {
    if (akunKode.startsWith('4-')) {
      totalPendapatan += saldoAkun[akunKode];
    } else if (akunKode.startsWith('5-')) {
      totalBeban += saldoAkun[akunKode];
    }
  });
  
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
  const jurnalSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Jurnal');
  const jurnalData = jurnalSheet.getDataRange().getValues();
  
  // Hitung saldo per akun
  const saldoAkun = {};
  
  for (let i = 1; i < jurnalData.length; i++) {
    const akunKode = jurnalData[i][1];
    const debit = jurnalData[i][3];
    const kredit = jurnalData[i][4];
    
    if (!saldoAkun[akunKode]) {
      saldoAkun[akunKode] = 0;
    }
    
    // Akun aset (1-xxxx) - saldo normal debit
    if (akunKode.startsWith('1-')) {
      saldoAkun[akunKode] += debit - kredit;
    }
    // Akun kewajiban (2-xxxx) - saldo normal kredit
    else if (akunKode.startsWith('2-')) {
      saldoAkun[akunKode] += kredit - debit;
    }
    // Akun ekuitas (3-xxxx) - saldo normal kredit
    else if (akunKode.startsWith('3-')) {
      saldoAkun[akunKode] += kredit - debit;
    }
  }
  
  // Hitung total
  let totalAset = 0;
  let totalKewajiban = 0;
  let totalEkuitas = 0;
  
  Object.keys(saldoAkun).forEach(akunKode => {
    if (akunKode.startsWith('1-')) {
      totalAset += saldoAkun[akunKode];
    } else if (akunKode.startsWith('2-')) {
      totalKewajiban += saldoAkun[akunKode];
    } else if (akunKode.startsWith('3-')) {
      totalEkuitas += saldoAkun[akunKode];
    }
  });
  
  return {
    total_aset: totalAset,
    total_kewajiban: totalKewajiban,
    total_ekuitas: totalEkuitas,
    balance: totalAset === (totalKewajiban + totalEkuitas)
  };
}

// ============ AKUN FUNCTIONS ============

/**
 * Get semua akun
 */
function getAllAkun() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Akun');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
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

// ============ SETUP FUNCTIONS ============

/**
 * Setup database sheets (jalankan sekali)
 */
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Sheet Transaksi
  let sheet = ss.getSheetByName('Transaksi');
  if (!sheet) {
    sheet = ss.insertSheet('Transaksi');
    sheet.appendRow(['id', 'tanggal', 'jenis', 'keterangan', 'jumlah', 'ppn', 'pihak', 'referensi', 'created_at', 'created_by']);
  }
  
  // Sheet Jurnal
  sheet = ss.getSheetByName('Jurnal');
  if (!sheet) {
    sheet = ss.insertSheet('Jurnal');
    sheet.appendRow(['transaksi_id', 'akun_kode', 'akun_nama', 'debit', 'kredit', 'created_at']);
  }
  
  // Sheet Akun
  sheet = ss.getSheetByName('Akun');
  if (!sheet) {
    sheet = ss.insertSheet('Akun');
    sheet.appendRow(['kode', 'nama', 'tipe', 'kategori', 'saldo_normal', 'saldo']);
    
    // Insert default accounts
    const defaultAkun = [
      ['1-1001', 'Kas', 'Aset', 'Aset Lancar', 'Debit', 0],
      ['1-1002', 'Bank', 'Aset', 'Aset Lancar', 'Debit', 0],
      ['1-1003', 'Piutang Usaha', 'Aset', 'Aset Lancar', 'Debit', 0],
      ['1-1004', 'Persediaan Barang', 'Aset', 'Aset Lancar', 'Debit', 0],
      ['1-1005', 'Biaya Dibayar Dimuka', 'Aset', 'Aset Lancar', 'Debit', 0],
      ['1-2001', 'Peralatan', 'Aset', 'Aset Tetap', 'Debit', 0],
      ['1-2002', 'Kendaraan', 'Aset', 'Aset Tetap', 'Debit', 0],
      ['1-2003', 'Bangunan', 'Aset', 'Aset Tetap', 'Debit', 0],
      ['1-2004', 'Akumulasi Penyusutan', 'Aset', 'Aset Tetap', 'Kredit', 0],
      ['2-1001', 'Utang Usaha', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit', 0],
      ['2-1002', 'Utang Bank', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit', 0],
      ['2-1003', 'Utang Pajak', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit', 0],
      ['2-1004', 'Pendapatan Diterima Dimuka', 'Kewajiban', 'Kewajiban Jangka Pendek', 'Kredit', 0],
      ['2-2001', 'Utang Jangka Panjang', 'Kewajiban', 'Kewajiban Jangka Panjang', 'Kredit', 0],
      ['3-1001', 'Modal Pemilik', 'Ekuitas', 'Ekuitas', 'Kredit', 0],
      ['3-1002', 'Laba Ditahan', 'Ekuitas', 'Ekuitas', 'Kredit', 0],
      ['3-1003', 'Prive', 'Ekuitas', 'Ekuitas', 'Debit', 0],
      ['4-1001', 'Pendapatan Penjualan', 'Pendapatan', 'Pendapatan Usaha', 'Kredit', 0],
      ['4-1002', 'Pendapatan Jasa', 'Pendapatan', 'Pendapatan Usaha', 'Kredit', 0],
      ['4-1003', 'Pendapatan Lain-lain', 'Pendapatan', 'Pendapatan Non-Usaha', 'Kredit', 0],
      ['5-1001', 'Harga Pokok Penjualan', 'Beban', 'Beban Langsung', 'Debit', 0],
      ['5-2001', 'Beban Gaji', 'Beban', 'Beban Operasional', 'Debit', 0],
      ['5-2002', 'Beban Sewa', 'Beban', 'Beban Operasional', 'Debit', 0],
      ['5-2003', 'Beban Listrik & Air', 'Beban', 'Beban Operasional', 'Debit', 0],
      ['5-2004', 'Beban Telepon & Internet', 'Beban', 'Beban Operasional', 'Debit', 0],
      ['5-2005', 'Beban Transportasi', 'Beban', 'Beban Operasional', 'Debit', 0],
      ['5-2006', 'Beban Perlengkapan', 'Beban', 'Beban Operasional', 'Debit', 0],
      ['5-2007', 'Beban Penyusutan', 'Beban', 'Beban Operasional', 'Debit', 0],
      ['5-2008', 'Beban Lain-lain', 'Beban', 'Beban Operasional', 'Debit', 0],
    ];
    
    defaultAkun.forEach(akun => sheet.appendRow(akun));
  }
  
  return 'Database setup complete!';
}
