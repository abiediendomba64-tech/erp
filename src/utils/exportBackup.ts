/**
 * Export & Backup Utilities
 * Fitur: Export PDF, Excel/CSV, Print, Backup Database
 */

import { formatRupiah } from './numberParser';

function safeCsvText(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Prevent spreadsheet formula execution for untrusted text; numeric JS values remain numeric text.
  if (typeof value === 'string' && text.length > 0 && ['=', '+', '-', '@', '\\t', '\\r'].includes(text[0])) text = "'" + text;
  return text;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============ EXPORT TO CSV ============

/**
 * Export data ke format CSV
 * @param data - Array of objects
 * @param filename - Nama file (tanpa extension)
 * @param columns - Kolom yang akan diekspor (optional, default semua)
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: (keyof T)[]
): void {
  if (data.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }
  
  // Determine columns
  const cols = columns || Object.keys(data[0]) as (keyof T)[];
  
  // Build CSV content
  const header = cols.map(col => String(col)).join(',');
  const rows = data.map(row => 
    cols.map(col => {
      const value = row[col];
      // Escape quotes and wrap in quotes if contains comma
      const strValue = safeCsvText(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );
  
  const csvContent = [header, ...rows].join('\n');
  
  // Add BOM for Excel compatibility with UTF-8
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  downloadBlob(blob, `${filename}.csv`);
}

// ============ EXPORT TO EXCEL (HTML Table) ============

/**
 * Export data ke format Excel (HTML table)
 * @param data - Array of objects
 * @param filename - Nama file (tanpa extension)
 * @param columns - Kolom yang akan diekspor (optional, default semua)
 * @param title - Judul tabel (optional)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: (keyof T)[],
  title?: string
): void {
  if (data.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }
  
  const cols = columns || Object.keys(data[0]) as (keyof T)[];
  
  // Build HTML table
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${escapeHtml(filename)}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 5px; }
        th { background-color: #4472C4; color: white; font-weight: bold; }
        .title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .number { mso-number-format: '\\#\\,\\#\\#\\0'; }
      </style>
    </head>
    <body>
  `;
  
  if (title) {
    html += `<div class="title">${escapeHtml(title)}</div>`;
  }
  
  html += '<table>';
  
  // Header
  html += '<thead><tr>';
  cols.forEach(col => {
    html += `<th>${String(col)}</th>`;
  });
  html += '</tr></thead>';
  
  // Body
  html += '<tbody>';
  data.forEach(row => {
    html += '<tr>';
    cols.forEach(col => {
      const value = row[col];
      const isNumber = typeof value === 'number';
      html += `<td${isNumber ? ' class="number"' : ''}>${escapeHtml(value ?? '')}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></body></html>';
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${filename}.xls`);
}

// ============ EXPORT TO JSON (Backup) ============

/**
 * Export data ke format JSON (untuk backup)
 * @param data - Data yang akan dibackup
 * @param filename - Nama file (tanpa extension)
 * @param metadata - Metadata tambahan (optional)
 */
export function exportToJSON(
  data: any,
  filename: string,
  metadata?: Record<string, any>
): void {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    data: data
  };
  
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  
  downloadBlob(blob, `${filename}.json`);
}

// ============ PRINT RECEIPT ============

/**
 * Print receipt/kwitansi
 * @param content - HTML content untuk di-print
 * @param title - Judul print (optional)
 */
export function printReceipt(content: string, title?: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocker aktif. Izinkan popup untuk print.');
    return;
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || 'Receipt'}</title>
      <style>
        @page { margin: 1cm; }
        body { font-family: Arial, sans-serif; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 5px 0; }
        .content { margin: 20px 0; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
        .right { text-align: right; }
        .center { text-align: center; }
        .signature { margin-top: 50px; }
        .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 5px; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${content}
      <div class="footer no-print">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer;">
          Print
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; margin-left: 10px;">
          Close
        </button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Auto print after load
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

// ============ GENERATE RECEIPT HTML ============

/**
 * Generate HTML untuk receipt/kwitansi
 */
export function generateReceiptHTML(params: {
  company: string;
  address?: string;
  phone?: string;
  receiptNumber: string;
  date: string;
  receivedFrom: string;
  amount: number;
  amountInWords?: string;
  purpose: string;
  paymentMethod?: string;
  notes?: string;
}): string {
  const {
    company,
    address,
    phone,
    receiptNumber,
    date,
    receivedFrom,
    amount,
    amountInWords,
    purpose,
    paymentMethod,
    notes
  } = params;
  
  return `
    <div class="header">
      <h1>${company}</h1>
      ${address ? `<p>${address}</p>` : ''}
      ${phone ? `<p>Telp: ${phone}</p>` : ''}
    </div>
    
    <div class="content">
      <h2 style="text-align: center; text-decoration: underline;">KWITANSI</h2>
      <table style="border: none;">
        <tr style="border: none;">
          <td style="border: none; width: 150px;">No. Kwitansi</td>
          <td style="border: none;">: ${receiptNumber}</td>
        </tr>
        <tr style="border: none;">
          <td style="border: none;">Tanggal</td>
          <td style="border: none;">: ${date}</td>
        </tr>
        <tr style="border: none;">
          <td style="border: none;">Sudah Terima Dari</td>
          <td style="border: none;">: ${receivedFrom}</td>
        </tr>
        <tr style="border: none;">
          <td style="border: none;">Uang Sejumlah</td>
          <td style="border: none;">: ${amountInWords || '...'}</td>
        </tr>
        <tr style="border: none;">
          <td style="border: none;">Untuk Pembayaran</td>
          <td style="border: none;">: ${purpose}</td>
        </tr>
        ${paymentMethod ? `
        <tr style="border: none;">
          <td style="border: none;">Metode Pembayaran</td>
          <td style="border: none;">: ${paymentMethod}</td>
        </tr>
        ` : ''}
        <tr style="border: none;">
          <td style="border: none;"><strong>Jumlah</strong></td>
          <td style="border: none;"><strong>: ${formatRupiah(amount)}</strong></td>
        </tr>
      </table>
      
      ${notes ? `
      <div style="margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #4472C4;">
        <strong>Catatan:</strong><br>
        ${notes}
      </div>
      ` : ''}
      
      <div class="signature" style="display: flex; justify-content: space-between; margin-top: 50px;">
        <div style="text-align: center;">
          <p>Yang Menyerahkan,</p>
          <div class="signature-line"></div>
          <p>${receivedFrom}</p>
        </div>
        <div style="text-align: center;">
          <p>Yang Menerima,</p>
          <div class="signature-line"></div>
          <p>${company}</p>
        </div>
      </div>
    </div>
  `;
}

// ============ HELPER FUNCTIONS ============

/**
 * Download blob sebagai file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert number to Indonesian words
 * Contoh: 1234567 → "Satu Juta Dua Ratus Tiga Puluh Empat Ribu Lima Ratus Enam Puluh Tujuh"
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'Nol';
  
  const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  if (num < 12) return units[num];
  if (num < 20) return numberToWords(num - 10) + ' Belas';
  if (num < 100) return numberToWords(Math.floor(num / 10)) + ' Puluh ' + numberToWords(num % 10);
  if (num < 200) return 'Seratus ' + numberToWords(num - 100);
  if (num < 1000) return numberToWords(Math.floor(num / 100)) + ' Ratus ' + numberToWords(num % 100);
  if (num < 2000) return 'Seribu ' + numberToWords(num - 1000);
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Ribu ' + numberToWords(num % 1000);
  if (num < 1000000000) return numberToWords(Math.floor(num / 1000000)) + ' Juta ' + numberToWords(num % 1000000);
  if (num < 1000000000000) return numberToWords(Math.floor(num / 1000000000)) + ' Miliar ' + numberToWords(num % 1000000000);
  
  return numberToWords(Math.floor(num / 1000000000000)) + ' Triliun ' + numberToWords(num % 1000000000000);
}

// ============ EXAMPLE USAGE ============

/**
 * Contoh penggunaan:
 * 
 * // Export ke CSV
 * const data = [
 *   { nama: 'Pak Dede', luas: 68, harga: 750000, total: 51000000 },
 *   { nama: 'Sanaris', luas: 17, harga: 800000, total: 13600000 }
 * ];
 * exportToCSV(data, 'register_tanah', ['nama', 'luas', 'harga', 'total']);
 * 
 * // Export ke Excel
 * exportToExcel(data, 'register_tanah', ['nama', 'luas', 'harga', 'total'], 'Register Tanah');
 * 
 * // Backup ke JSON
 * const backupData = {
 *   tanah: [...],
 *   beko: [...],
 *   kas: [...]
 * };
 * exportToJSON(backupData, 'backup_2026-10-21', { version: '1.0', exportedBy: 'Admin' });
 * 
 * // Print receipt
 * const receiptHTML = generateReceiptHTML({
 *   company: 'PT Setia Surya Nugraha',
 *   address: 'Jl. Contoh No. 123',
 *   phone: '0812-3456-7890',
 *   receiptNumber: 'KW-2026-001',
 *   date: '21 Oktober 2026',
 *   receivedFrom: 'Pak Dede',
 *   amount: 51000000,
 *   amountInWords: numberToWords(51000000) + ' Rupiah',
 *   purpose: 'Pembayaran tanah 68 BT',
 *   paymentMethod: 'Transfer Bank',
 *   notes: 'Lunas'
 * });
 * printReceipt(receiptHTML, 'Kwitansi KW-2026-001');
 */
