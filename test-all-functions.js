/**
 * Regression tests against the actual TypeScript accounting functions.
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';

async function loadActualTypeScript(relativePath) {
  let source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  // Accounting domain interfaces are compile-time only and this test deliberately
  // executes the production helpers without requiring a browser bundler.
  source = source.replace(/^import\s+\{[^}]+\}\s+from\s+['"](?:\.\.\/types\/accounting|\.\/types)['"];?\s*\r?\n/gm, '');
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: false
    }
  }).outputText;
  const url = 'data:text/javascript;base64,' + Buffer.from(javascript, 'utf8').toString('base64');
  return import(url);
}

const accounting = await loadActualTypeScript('./src/utils/accounting.ts');
const data = await loadActualTypeScript('./src/data/accounting.ts');
const numbers = await loadActualTypeScript('./src/utils/numberParser.ts');
const accounts = data.initialAkun;

function sumSide(entries, side) {
  return entries.reduce((sum, entry) => sum + Number(entry[side] || 0), 0);
}

function assertBalanced(label, journal) {
  assert.ok(Array.isArray(journal.entries), label + ': entries harus berupa array');
  assert.ok(journal.entries.length >= 2, label + ': minimal dua baris jurnal');
  const debit = sumSide(journal.entries, 'debit');
  const credit = sumSide(journal.entries, 'kredit');
  assert.ok(Math.abs(debit - credit) < 0.005, label + ': debit dan kredit harus sama (' + debit + ' vs ' + credit + ')');
  for (const entry of journal.entries) {
    assert.ok(accounts.some(account => account.kode === entry.akun_kode), label + ': akun tidak ditemukan ' + entry.akun_kode);
    assert.ok(Number.isFinite(entry.debit) && entry.debit >= 0, label + ': debit tidak valid');
    assert.ok(Number.isFinite(entry.kredit) && entry.kredit >= 0, label + ': kredit tidak valid');
    assert.ok(!(entry.debit > 0 && entry.kredit > 0), label + ': satu baris tidak boleh debit dan kredit sekaligus');
  }
}

function wrapJournal(id, date, details, status) {
  return {
    id,
    tanggal: date,
    no_jurnal: 'JU-' + id,
    keterangan: id,
    referensi: id,
    entries: details.entries.map((entry, index) => ({ ...entry, id: entry.id || id + '-' + index })),
    total_debit: sumSide(details.entries, 'debit'),
    total_kredit: sumSide(details.entries, 'kredit'),
    status: status || 'Posted',
    createdBy: 'automated-test',
    createdAt: date + 'T12:00:00.000Z'
  };
}

const parserCases = [
  ['750.000', 750000],
  ['1.234.567', 1234567],
  ['Rp 50.000', 50000],
  ['1.234.567,50', 1234567.5],
  ['2,5', 2.5]
];
for (const [input, expected] of parserCases) {
  assert.equal(numbers.parseRupiah(input), expected, 'parseRupiah(' + input + ')');
}
assert.equal(numbers.isValidRupiah('750.000'), true);
assert.equal(numbers.isValidRupiah('12abc'), false);
console.log('PASS: parser angka Indonesia menggunakan implementasi production');

const generatorCases = [
  ['penjualan tunai', accounting.generateJurnalPenjualanTunai('2026-01-05', 'Penjualan', 1000000, 110000), 1110000],
  ['penjualan kredit', accounting.generateJurnalPenjualanKredit('2026-01-05', 'Penjualan kredit', 1000000, 110000), 1110000],
  ['pembelian tunai', accounting.generateJurnalPembelianTunai('2026-01-05', 'Pembelian stok', 1000000, 110000), 1110000],
  ['pembelian kredit', accounting.generateJurnalPembelianKredit('2026-01-05', 'Pembelian kredit', 1000000, 110000), 1110000],
  ['penerimaan piutang', accounting.generateJurnalPembayaranPiutang('2026-01-06', 'Terima piutang', 500000), 500000],
  ['pembayaran utang', accounting.generateJurnalPembayaranUtang('2026-01-07', 'Bayar utang', 300000), 300000],
  ['beban operasi', accounting.generateJurnalBeban('2026-01-10', 'Listrik', '5-2003', 'Beban Listrik & Air', 200000), 200000]
];
for (const [label, journal, total] of generatorCases) {
  assertBalanced(label, journal);
  assert.equal(journal.total_debit, total, label + ': total debit');
  assert.equal(journal.total_kredit, total, label + ': total kredit');
}
assert.equal(generatorCases[2][1].entries[0].akun_kode, '1-1004', 'Pembelian tunai harus menambah persediaan, bukan HPP langsung');
assert.equal(generatorCases[2][1].entries[1].akun_kode, '1-1006', 'PPN masukan harus masuk akun aset PPN Masukan');
assert.equal(generatorCases[3][1].entries[0].akun_kode, '1-1004', 'Pembelian kredit harus menambah persediaan');
assert.equal(generatorCases[3][1].entries.at(-1).akun_kode, '2-1001', 'Pembelian kredit harus menambah utang usaha');
console.log('PASS: tujuh generator jurnal production menghasilkan debit/kredit seimbang dan akun yang tepat');

const modal = {
  tanggal: '2026-01-01',
  entries: [
    { akun_kode: '1-1001', akun_nama: 'Kas', debit: 1000000, kredit: 0 },
    { akun_kode: '3-1001', akun_nama: 'Modal Pemilik', debit: 0, kredit: 1000000 }
  ]
};
const saleJanuary = accounting.generateJurnalPenjualanTunai('2026-01-05', 'Penjualan Januari', 1000000, 0);
const expenseJanuary = accounting.generateJurnalBeban('2026-01-10', 'Listrik Januari', '5-2003', 'Beban Listrik & Air', 200000);
const saleFebruary = accounting.generateJurnalPenjualanTunai('2026-02-05', 'Penjualan Februari', 2000000, 0);
const draftJanuary = accounting.generateJurnalPenjualanTunai('2026-01-20', 'Draft harus diabaikan', 5000000, 0);
const journals = [
  wrapJournal('MODAL', '2026-01-01', modal),
  wrapJournal('SALE-JAN', '2026-01-05', saleJanuary),
  wrapJournal('EXP-JAN', '2026-01-10', expenseJanuary),
  wrapJournal('SALE-FEB', '2026-02-05', saleFebruary),
  wrapJournal('DRAFT-JAN', '2026-01-20', draftJanuary, 'Draft')
];

const pAndLJan = accounting.generateLabaRugi(accounts, journals, '2026-01');
assert.equal(pAndLJan.total_pendapatan, 1000000, 'P&L Januari tidak boleh mengambil pendapatan Februari/draft');
assert.equal(pAndLJan.total_beban, 200000, 'P&L Januari harus memfilter beban periode');
assert.equal(pAndLJan.laba_bersih, 800000, 'Laba bersih Januari');
const pAndLFeb = accounting.generateLabaRugi(accounts, journals, '2026-02');
assert.equal(pAndLFeb.total_pendapatan, 2000000, 'P&L Februari harus mengisolasi Februari');
assert.equal(pAndLFeb.total_beban, 0, 'Beban Januari tidak boleh terbawa ke P&L Februari');

const balanceSheet = accounting.generateNeraca(accounts, journals, '2026-01-31');
assert.equal(balanceSheet.aset.total_aset, 1800000, 'Neraca per Januari hanya mengambil saldo kumulatif sampai tanggal neraca');
assert.equal(balanceSheet.total_kewajiban_ekuitas, 1800000, 'Neraca harus balance setelah laba periode berjalan dihitung ke ekuitas');
assert.equal(balanceSheet.aset.total_aset, balanceSheet.total_kewajiban_ekuitas);

const cashFlow = accounting.generateArusKas(accounts, journals, '2026-01');
assert.equal(cashFlow.total_arus_kas_operasi, 800000, 'Arus kas operasi: penjualan tunai dikurangi beban');
assert.equal(cashFlow.total_arus_kas_pendanaan, 1000000, 'Setoran modal masuk arus kas pendanaan');
assert.equal(cashFlow.kenaikan_penurunan_kas, 1800000, 'Perubahan kas harus cocok dengan kas transaksi');
assert.equal(cashFlow.kas_akhir_periode, 1800000, 'Kas akhir periode harus berdasarkan jurnal yang posted');
console.log('PASS: laporan periode, neraca kumulatif, dan arus kas dihitung dari jurnal Posted sebenarnya');


const gasSource = await readFile(new URL('./google-apps-script/Code.gs', import.meta.url), 'utf8');
const gasContext = {
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: key => key === 'SPREADSHEET_ID' ? 'test-spreadsheet-id' : null
    })
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({ getId: () => 'test-spreadsheet-id' }),
    openById: id => ({ getId: () => id })
  }
};
runInNewContext(gasSource, gasContext, { filename: 'Code.gs' });

const backendCases = [
  ['backend penjualan tunai', { jenis: 'penjualan_tunai', keterangan: 'Penjualan', jumlah: 1000000, ppn: 110000 }],
  ['backend penjualan kredit', { jenis: 'penjualan_kredit', pihak: 'Pelanggan A', keterangan: 'Penjualan kredit', jumlah: 1000000, ppn: 110000 }],
  ['backend pembelian tunai', { jenis: 'pembelian_tunai', keterangan: 'Pembelian stok', jumlah: 1000000, ppn: 110000 }],
  ['backend pembelian kredit', { jenis: 'pembelian_kredit', pihak: 'Supplier A', keterangan: 'Pembelian kredit', jumlah: 1000000, ppn: 110000 }],
  ['backend pembayaran piutang', { jenis: 'pembayaran_piutang', pihak: 'Pelanggan A', keterangan: 'Pelunasan piutang', jumlah: 500000 }],
  ['backend pembayaran utang', { jenis: 'pembayaran_utang', pihak: 'Supplier A', keterangan: 'Pelunasan utang', jumlah: 300000 }],
  ['backend beban operasional', { jenis: 'beban_operasional', akun_beban: '5-2003', keterangan: 'Listrik', jumlah: 200000 }]
];
for (const [label, transaction] of backendCases) {
  const entries = runInNewContext(
    'generateJurnalDoubleEntry(' + JSON.stringify(transaction) + ')',
    gasContext
  );
  assertBalanced(label, { entries });
}
let invalidBackendMessage = '';
try {
  runInNewContext(
    'generateJurnalDoubleEntry(' + JSON.stringify({ jenis: 'penjualan_tunai', keterangan: 'Invalid', jumlah: 0, ppn: 0 }) + ')',
    gasContext
  );
} catch (error) {
  invalidBackendMessage = String(error && error.message ? error.message : error);
}
assert.ok(invalidBackendMessage.includes('Jumlah transaksi'), 'Apps Script harus menolak nominal nol');
console.log('PASS: Apps Script backend aktual menghasilkan jurnal seimbang untuk 7 tipe transaksi dan menolak nominal tidak valid');


const helpers = await loadActualTypeScript('./src/helpers.ts');
const landKnown = { id: 'T-TEST-1', pemilik: 'Uji', luas_bt: 19, harga_per_bt: 800000, dp: 5200000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: '' };
assert.equal(helpers.hasKnownLandContractValue(landKnown), true);
assert.equal(helpers.getTanahNilaiTotal(landKnown), 15200000);
assert.equal(helpers.getTanahSisa(landKnown), 10000000);
assert.equal(helpers.getTanahKelebihanBayar(landKnown), 0);

const landUnknown = { id: 'T-TEST-2', pemilik: 'Uji', luas_bt: 0, harga_per_bt: 0, dp: 70000000, status: 'DP', kode_bukti: '', url_bukti: '', catatan: '' };
assert.equal(helpers.hasKnownLandContractValue(landUnknown), false, 'pembayaran bukan nilai kontrak');
assert.equal(helpers.getTanahNilaiTotal(landUnknown), 0, 'nilai kontrak tak diketahui tidak boleh ditebak dari DP');
assert.equal(helpers.getTanahSisa(landUnknown), 0, 'sisa untuk nilai belum diketahui harus dilabeli unknown di UI');
assert.equal(helpers.getTanahKelebihanBayar(landUnknown), 0, 'tanpa nilai kontrak jangan menuduh kelebihan bayar');

const landManual = { ...landUnknown, nilai_total_manual: 70000000 };
assert.equal(helpers.hasKnownLandContractValue(landManual), true);
assert.equal(helpers.getTanahNilaiTotal(landManual), 70000000);
assert.equal(helpers.getTanahSisa(landManual), 0);

const bekoLumpsum = { id: 'BK-01', item: 'Mobilisasi', panjang: 0, lebar: 0, tinggi: 0, tarif: 4500000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: '', satuan_volume: 'ls' };
assert.equal(helpers.getBekoVolume(bekoLumpsum), 1);
assert.equal(helpers.getBekoNilai(bekoLumpsum), 4500000);

const bekoQuantity = { id: 'BK-02', item: 'Mobilisasi Beko', panjang: 25.5, lebar: 1, tinggi: 1, tarif: 650000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: '', satuan_volume: 'unit' };
assert.equal(helpers.getBekoVolume(bekoQuantity), 25.5);
assert.equal(helpers.getBekoNilai(bekoQuantity), 16575000, 'kuantitas 25.5 x tarif 650.000');

const bekoVolume = { id: 'BK-03', item: 'Cut Fill', panjang: 21, lebar: 15, tinggi: 2, tarif: 25000, status: 'Lunas', kode_bukti: '', url_bukti: '', catatan: '', satuan_volume: 'm3' };
assert.equal(helpers.getBekoVolume(bekoVolume), 630);
assert.equal(helpers.getBekoNilai(bekoVolume), 15750000, 'volume 21 x 15 x 2 x 25.000');
console.log('PASS: rumus tanah dan beko aktual, termasuk nilai kontrak unknown dan kuantitas unit');

const noProof = { id: 'KAS-TEST-1', kode_bukti: '' };
assert.equal(helpers.getBukuKasVerificationStatus(noProof, []), 'TANPA_BUKTI');
assert.equal(helpers.getBukuKasVerificationStatus({ id: 'KAS-TEST-2', kode_bukti: 'KW-02' }, []), 'PERLU_KONFIRMASI');
assert.equal(helpers.getBukuKasVerificationStatus({ id: 'KAS-TEST-3', kode_bukti: 'KW-03' }, [{
  id: 'DOC-PENDING', kode_bukti: 'KW-03', terverifikasi: 'Perlu_Konfirmasi', link_drive: 'https://example.test/bukti.pdf'
}]), 'PERLU_KONFIRMASI');
assert.equal(helpers.getBukuKasVerificationStatus({ id: 'KAS-TEST-4', kode_bukti: 'KW-04' }, [{
  id: 'DOC-VERIFIED', kode_bukti: 'KW-04', terverifikasi: 'Ya', link_drive: 'https://example.test/bukti.pdf'
}]), 'LENGKAP');
assert.equal(helpers.getBukuKasVerificationStatus({ id: 'KAS-TEST-5', kode_bukti: 'KW-05' }, [{
  id: 'DOC-EMPTY', kode_bukti: 'KW-05', terverifikasi: 'Ya', link_drive: ''
}]), 'PERLU_KONFIRMASI');
console.log('PASS: status bukti diturunkan dari keberadaan file/URL dan verifikasi, bukan hanya kode bukti');

console.log('\nALL PRODUCTION ACCOUNTING REGRESSION TESTS PASSED');
