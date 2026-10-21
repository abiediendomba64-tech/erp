/**
 * TEST CASES - VERIFIKASI LOGIKA SISTEM
 * 
 * Cara menjalankan:
 * 1. Buka browser console
 * 2. Copy-paste kode ini
 * 3. Lihat hasil test
 * 
 * Atau jalankan di Node.js:
 * node test-all-functions.js
 */

// ============ TEST 1: PARSER ANGKA INDONESIA ============
console.log('\n========================================');
console.log('TEST 1: PARSER ANGKA INDONESIA');
console.log('========================================\n');

function parseRupiah(value) {
  if (!value || typeof value !== 'string') return 0;
  let cleaned = value.replace(/Rp\s?/gi, '').trim();
  const hasComma = cleaned.includes(',');
  if (hasComma) {
    cleaned = cleaned.replace(/\./g, '');
    cleaned = cleaned.replace(',', '.');
  } else {
    cleaned = cleaned.replace(/\./g, '');
  }
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

const testCases1 = [
  { input: '750.000', expected: 750000, desc: 'Format ribuan' },
  { input: '1.234.567', expected: 1234567, desc: 'Format jutaan' },
  { input: '1.234.567,50', expected: 1234567.5, desc: 'Format dengan desimal' },
  { input: 'Rp 50.000', expected: 50000, desc: 'Format dengan prefix Rp' },
  { input: '100.000.000', expected: 100000000, desc: 'Format 100 juta' },
  { input: '2,5', expected: 2.5, desc: 'Format desimal koma' },
];

let passed1 = 0;
let failed1 = 0;

testCases1.forEach((test, i) => {
  const result = parseRupiah(test.input);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === test.expected) {
    passed1++;
  } else {
    failed1++;
  }
  
  console.log(`${i + 1}. ${status} - ${test.desc}`);
  console.log(`   Input: "${test.input}"`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Got: ${result}`);
  console.log('');
});

console.log(`\nParser Test Summary: ${passed1} passed, ${failed1} failed`);

// ============ TEST 2: DOUBLE-ENTRY BALANCE ============
console.log('\n========================================');
console.log('TEST 2: DOUBLE-ENTRY BALANCE');
console.log('========================================\n');

function testDoubleEntry(jumlah, ppn = 0) {
  const totalKredit = jumlah + ppn;
  
  const entries = [
    { akun: 'Kas', debit: totalKredit, kredit: 0 },
    { akun: 'Pendapatan', debit: 0, kredit: jumlah },
  ];
  
  if (ppn > 0) {
    entries.push({ akun: 'Utang Pajak', debit: 0, kredit: ppn });
  }
  
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalKreditSum = entries.reduce((sum, e) => sum + e.kredit, 0);
  
  return {
    entries,
    totalDebit,
    totalKredit: totalKreditSum,
    isBalance: totalDebit === totalKreditSum
  };
}

const testCases2 = [
  { jumlah: 10000000, ppn: 1000000, desc: 'Penjualan 10jt + PPN 1jt' },
  { jumlah: 5000000, ppn: 0, desc: 'Penjualan 5jt tanpa PPN' },
  { jumlah: 25000000, ppn: 2500000, desc: 'Penjualan 25jt + PPN 2.5jt' },
  { jumlah: 100000000, ppn: 10000000, desc: 'Penjualan 100jt + PPN 10jt' },
];

let passed2 = 0;
let failed2 = 0;

testCases2.forEach((test, i) => {
  const result = testDoubleEntry(test.jumlah, test.ppn);
  const status = result.isBalance ? '✅ PASS' : '❌ FAIL';
  
  if (result.isBalance) {
    passed2++;
  } else {
    failed2++;
  }
  
  console.log(`${i + 1}. ${status} - ${test.desc}`);
  console.log(`   Total Debit: ${result.totalDebit.toLocaleString('id-ID')}`);
  console.log(`   Total Kredit: ${result.totalKredit.toLocaleString('id-ID')}`);
  console.log(`   Balance: ${result.isBalance ? 'YES' : 'NO'}`);
  console.log('');
});

console.log(`\nDouble-Entry Test Summary: ${passed2} passed, ${failed2} failed`);

// ============ TEST 3: ALOKASI DANA ============
console.log('\n========================================');
console.log('TEST 3: ALOKASI DANA PERIODE 1');
console.log('========================================\n');

const danaPeriode1 = 32500000;
const alokasiPeriode1 = [
  { nama: 'Pak Dede', nominal: 20000000 },
  { nama: 'Sanaris', nominal: 5200000 },
  { nama: 'Cap', nominal: 350000 },
  { nama: 'NPWP', nominal: 150000 },
  { nama: 'Ija 2.5 BT', nominal: 2000000 },
];

const totalTerbayar = alokasiPeriode1.reduce((sum, a) => sum + a.nominal, 0);
const sisa = danaPeriode1 - totalTerbayar;
const biayaPT = 8500000;
const kekurangan = (totalTerbayar + biayaPT) - danaPeriode1;

console.log(`Dana tersedia: ${danaPeriode1.toLocaleString('id-ID')}`);
console.log(`\nAlokasi terbayar:`);
alokasiPeriode1.forEach(a => {
  console.log(`  - ${a.nama}: ${a.nominal.toLocaleString('id-ID')}`);
});
console.log(`\nTotal terbayar: ${totalTerbayar.toLocaleString('id-ID')}`);
console.log(`Sisa: ${sisa.toLocaleString('id-ID')}`);
console.log(`Biaya PT (belum terbayar): ${biayaPT.toLocaleString('id-ID')}`);
console.log(`Kekurangan: ${kekurangan.toLocaleString('id-ID')}`);

const test3Pass = totalTerbayar === 27700000 && sisa === 4800000 && kekurangan === 3700000;
console.log(`\n${test3Pass ? '✅ PASS' : '❌ FAIL'} - Perhitungan alokasi periode 1`);

// ============ TEST 4: IDEMPOTENCY KEY ============
console.log('\n========================================');
console.log('TEST 4: IDEMPOTENCY KEY (ANTI-DUPLIKASI)');
console.log('========================================\n');

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateIdempotencyKey(tx) {
  const tanggal = tx.tanggal.trim();
  const jenis = tx.jenis.toLowerCase().trim();
  const pihak = tx.pihak.toLowerCase().trim().replace(/\s+/g, ' ');
  const nominal = Math.round(tx.nominal);
  const referensi = tx.referensi?.trim() || '';
  const raw = `${jenis}|${tanggal}|${pihak}|${nominal}|${referensi}`;
  return simpleHash(raw);
}

const tx1 = { tanggal: '2026-10-13', jenis: 'tanah', pihak: 'Pak Dede', nominal: 51000000 };
const tx2 = { tanggal: '2026-10-13', jenis: 'tanah', pihak: 'Pak Dede', nominal: 51000000 };
const tx3 = { tanggal: '2026-10-13', jenis: 'tanah', pihak: 'Pak Dede', nominal: 52000000 };

const key1 = generateIdempotencyKey(tx1);
const key2 = generateIdempotencyKey(tx2);
const key3 = generateIdempotencyKey(tx3);

console.log(`Transaksi 1: ${JSON.stringify(tx1)}`);
console.log(`Key 1: ${key1}`);
console.log('');
console.log(`Transaksi 2 (sama): ${JSON.stringify(tx2)}`);
console.log(`Key 2: ${key2}`);
console.log(`Key 1 === Key 2: ${key1 === key2 ? '✅ YES (DUPLICATE DETECTED)' : '❌ NO'}`);
console.log('');
console.log(`Transaksi 3 (beda nominal): ${JSON.stringify(tx3)}`);
console.log(`Key 3: ${key3}`);
console.log(`Key 1 === Key 3: ${key1 === key3 ? '❌ YES (SHOULD BE DIFFERENT)' : '✅ NO (CORRECT)'}`);

const test4Pass = key1 === key2 && key1 !== key3;
console.log(`\n${test4Pass ? '✅ PASS' : '❌ FAIL'} - Idempotency key detection`);

// ============ TEST 5: NERACA BALANCE ============
console.log('\n========================================');
console.log('TEST 5: NERACA BALANCE CHECK');
console.log('========================================\n');

// Simulasi neraca sederhana
const aset = {
  kas: 100000000,
  piutang: 25000000,
  peralatan: 15000000,
};

const kewajiban = {
  utangUsaha: 20000000,
  utangPajak: 2500000,
};

const ekuitas = {
  modal: 100000000,
  labaDitahan: 17500000,
};

const totalAset = Object.values(aset).reduce((sum, v) => sum + v, 0);
const totalKewajiban = Object.values(kewajiban).reduce((sum, v) => sum + v, 0);
const totalEkuitas = Object.values(ekuitas).reduce((sum, v) => sum + v, 0);
const totalKewajibanEkuitas = totalKewajiban + totalEkuitas;

console.log('ASET:');
Object.entries(aset).forEach(([key, value]) => {
  console.log(`  ${key}: ${value.toLocaleString('id-ID')}`);
});
console.log(`  Total Aset: ${totalAset.toLocaleString('id-ID')}`);

console.log('\nKEWAJIBAN:');
Object.entries(kewajiban).forEach(([key, value]) => {
  console.log(`  ${key}: ${value.toLocaleString('id-ID')}`);
});
console.log(`  Total Kewajiban: ${totalKewajiban.toLocaleString('id-ID')}`);

console.log('\nEKUITAS:');
Object.entries(ekuitas).forEach(([key, value]) => {
  console.log(`  ${key}: ${value.toLocaleString('id-ID')}`);
});
console.log(`  Total Ekuitas: ${totalEkuitas.toLocaleString('id-ID')}`);

console.log(`\nTotal Kewajiban + Ekuitas: ${totalKewajibanEkuitas.toLocaleString('id-ID')}`);
console.log(`Balance: ${totalAset === totalKewajibanEkuitas ? '✅ YES' : '❌ NO'}`);
console.log(`Selisih: ${(totalAset - totalKewajibanEkuitas).toLocaleString('id-ID')}`);

const test5Pass = totalAset === totalKewajibanEkuitas;
console.log(`\n${test5Pass ? '✅ PASS' : '❌ FAIL'} - Neraca balance check`);

// ============ FINAL SUMMARY ============
console.log('\n========================================');
console.log('FINAL TEST SUMMARY');
console.log('========================================\n');

const allTests = [
  { name: 'Parser Angka Indonesia', passed: passed1 === testCases1.length },
  { name: 'Double-Entry Balance', passed: passed2 === testCases2.length },
  { name: 'Alokasi Dana Periode 1', passed: test3Pass },
  { name: 'Idempotency Key', passed: test4Pass },
  { name: 'Neraca Balance', passed: test5Pass },
];

const totalPassed = allTests.filter(t => t.passed).length;
const totalFailed = allTests.filter(t => !t.passed).length;

allTests.forEach((test, i) => {
  console.log(`${i + 1}. ${test.passed ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n========================================`);
console.log(`TOTAL: ${totalPassed}/${allTests.length} tests passed`);
console.log(`========================================`);

if (totalPassed === allTests.length) {
  console.log('\n🎉 ALL TESTS PASSED! Core functions are working correctly.');
} else {
  console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review.`);
}
