import type { BukuKas } from '../types';
import type { Akun, JurnalUmum, JurnalEntry } from '../types/accounting';
import { getLocalDateISO } from '../data';

function uniqueId(prefix: string): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + '-' + token.toUpperCase();
}

function journalNumber(date: string): string {
  const year = /^\d{4}/.test(date) ? date.slice(0, 4) : getLocalDateISO().slice(0, 4);
  return 'JU-' + year + '-' + Date.now().toString(36).toUpperCase();
}

export function createCashbookJournal(
  record: BukuKas,
  accounts: Akun[],
  status: JurnalUmum['status'] = 'Draft'
): JurnalUmum {
  const masuk = Math.max(0, Number(record.masuk) || 0);
  const keluar = Math.max(0, Number(record.keluar) || 0);
  if ((masuk > 0) === (keluar > 0)) {
    throw new Error('Transaksi buku kas harus memiliki tepat satu nilai positif: masuk atau keluar.');
  }
  const amount = masuk > 0 ? masuk : keluar;
  const cashCode = record.akun_kas_kode || '1-1001';
  const counterCode = record.akun_lawan_kode || '';
  if (!counterCode) throw new Error('Pilih akun lawan transaksi agar jurnal dapat dibentuk.');
  if (counterCode === cashCode) throw new Error('Akun kas/bank tidak boleh sama dengan akun lawan.');
  const cashAccount = accounts.find(account => account.kode === cashCode);
  const counterAccount = accounts.find(account => account.kode === counterCode);
  if (!cashAccount || !counterAccount) throw new Error('Akun kas/bank atau akun lawan tidak ditemukan di Chart of Accounts.');

  const isReceipt = masuk > 0;
  const debitAccount = isReceipt ? cashAccount : counterAccount;
  const creditAccount = isReceipt ? counterAccount : cashAccount;
  const journalId = uniqueId('JRN');
  const date = record.tgl;
  const reference = record.no_ref || record.id;

  const entries: JurnalEntry[] = [
    {
      id: uniqueId('JE'),
      akun_kode: debitAccount.kode,
      akun_nama: debitAccount.nama,
      debit: amount,
      kredit: 0,
      keterangan: record.keterangan
    },
    {
      id: uniqueId('JE'),
      akun_kode: creditAccount.kode,
      akun_nama: creditAccount.nama,
      debit: 0,
      kredit: amount,
      keterangan: record.keterangan
    }
  ];

  return {
    id: journalId,
    tanggal: date,
    no_jurnal: journalNumber(date),
    keterangan: record.keterangan + ' (Buku Kas ' + record.id + ')',
    referensi: reference,
    entries,
    total_debit: amount,
    total_kredit: amount,
    status,
    createdBy: 'Pengguna lokal',
    createdAt: new Date().toISOString()
  };
}

export function createReversalJournal(original: JurnalUmum, reason: string): JurnalUmum {
  const id = uniqueId('REV');
  const entries: JurnalEntry[] = original.entries.map(entry => ({
    ...entry,
    id: uniqueId('JE'),
    debit: entry.kredit,
    kredit: entry.debit,
    keterangan: 'Pembalik ' + original.no_jurnal + ': ' + reason
  }));
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.kredit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005 || totalDebit <= 0) {
    throw new Error('Jurnal asli tidak valid untuk reversal. Periksa ulang jurnal sebelum koreksi.');
  }

  return {
    id,
    tanggal: getLocalDateISO(),
    no_jurnal: journalNumber(getLocalDateISO()),
    keterangan: 'Jurnal pembalik ' + original.no_jurnal + ' — ' + reason,
    referensi: original.no_jurnal,
    entries,
    total_debit: totalDebit,
    total_kredit: totalCredit,
    status: 'Posted',
    createdBy: 'Pengguna lokal',
    createdAt: new Date().toISOString()
  };
}

export function journalTotalsAreBalanced(journal: JurnalUmum): boolean {
  const debit = journal.entries.reduce((sum, entry) => sum + entry.debit, 0);
  const credit = journal.entries.reduce((sum, entry) => sum + entry.kredit, 0);
  return journal.entries.length >= 2 &&
    journal.entries.every(entry =>
      Number.isFinite(entry.debit) && Number.isFinite(entry.kredit) &&
      entry.debit >= 0 && entry.kredit >= 0 &&
      !(entry.debit > 0 && entry.kredit > 0)
    ) &&
    Math.abs(debit - credit) <= 0.005 &&
    Math.abs(journal.total_debit - debit) <= 0.005 &&
    Math.abs(journal.total_kredit - credit) <= 0.005;
}
