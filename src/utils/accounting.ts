import { JurnalUmum, JurnalEntry, Akun, BukuBesar, LabaRugi, Neraca, ArusKas } from '../types/accounting';

// ============ AUTO-GENERATE JURNAL DARI TRANSAKSI ============

/**
 * Generate jurnal untuk penjualan tunai
 */
export function generateJurnalPenjualanTunai(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalKredit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: totalKredit,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '4-1001',
        akun_nama: 'Pendapatan Penjualan',
        debit: 0,
        kredit: jumlah,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-3`,
        akun_kode: '2-1003',
        akun_nama: 'Utang Pajak',
        debit: 0,
        kredit: ppn,
      }] : [])
    ],
    total_debit: totalKredit,
    total_kredit: totalKredit,
  };
}

/**
 * Generate jurnal untuk penjualan kredit (piutang)
 */
export function generateJurnalPenjualanKredit(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalKredit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1003',
        akun_nama: 'Piutang Usaha',
        debit: totalKredit,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '4-1001',
        akun_nama: 'Pendapatan Penjualan',
        debit: 0,
        kredit: jumlah,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-3`,
        akun_kode: '2-1003',
        akun_nama: 'Utang Pajak',
        debit: 0,
        kredit: ppn,
      }] : [])
    ],
    total_debit: totalKredit,
    total_kredit: totalKredit,
  };
}

/**
 * Generate jurnal untuk pembelian tunai
 */
export function generateJurnalPembelianTunai(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalDebit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1004',
        akun_nama: 'Persediaan Barang',
        debit: jumlah,
        kredit: 0,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1006',
        akun_nama: 'PPN Masukan',
        debit: ppn,
        kredit: 0,
      }] : []),
      {
        id: `E-${Date.now()}-3`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: 0,
        kredit: totalDebit,
      },
    ],
    total_debit: totalDebit,
    total_kredit: totalDebit,
  };
}

/**
 * Generate jurnal untuk pembelian kredit (utang)
 */
export function generateJurnalPembelianKredit(
  tanggal: string,
  keterangan: string,
  jumlah: number,
  ppn: number = 0
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  const totalKredit = jumlah + ppn;
  
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1004',
        akun_nama: 'Persediaan Barang',
        debit: jumlah,
        kredit: 0,
      },
      ...(ppn > 0 ? [{
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1006',
        akun_nama: 'PPN Masukan',
        debit: ppn,
        kredit: 0,
      }] : []),
      {
        id: `E-${Date.now()}-3`,
        akun_kode: '2-1001',
        akun_nama: 'Utang Usaha',
        debit: 0,
        kredit: totalKredit,
      },
    ],
    total_debit: totalKredit,
    total_kredit: totalKredit,
  };
}

/**
 * Generate jurnal untuk pembayaran piutang
 */
export function generateJurnalPembayaranPiutang(
  tanggal: string,
  keterangan: string,
  jumlah: number
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: jumlah,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1003',
        akun_nama: 'Piutang Usaha',
        debit: 0,
        kredit: jumlah,
      },
    ],
    total_debit: jumlah,
    total_kredit: jumlah,
  };
}

/**
 * Generate jurnal untuk pembayaran utang
 */
export function generateJurnalPembayaranUtang(
  tanggal: string,
  keterangan: string,
  jumlah: number
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: '2-1001',
        akun_nama: 'Utang Usaha',
        debit: jumlah,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: 0,
        kredit: jumlah,
      },
    ],
    total_debit: jumlah,
    total_kredit: jumlah,
  };
}

/**
 * Generate jurnal untuk beban operasional
 */
export function generateJurnalBeban(
  tanggal: string,
  keterangan: string,
  akunBeban: string,
  namaAkunBeban: string,
  jumlah: number
): Omit<JurnalUmum, 'id' | 'no_jurnal' | 'status' | 'createdBy' | 'createdAt'> {
  return {
    tanggal,
    keterangan,
    entries: [
      {
        id: `E-${Date.now()}-1`,
        akun_kode: akunBeban,
        akun_nama: namaAkunBeban,
        debit: jumlah,
        kredit: 0,
      },
      {
        id: `E-${Date.now()}-2`,
        akun_kode: '1-1001',
        akun_nama: 'Kas',
        debit: 0,
        kredit: jumlah,
      },
    ],
    total_debit: jumlah,
    total_kredit: jumlah,
  };
}

// ============ GENERATE BUKU BESAR ============

export function generateBukuBesar(akun: Akun, journals: JurnalUmum[]): BukuBesar {
  const entries = journals
    .filter(j => j.status === 'Posted')
    .flatMap(j => 
      j.entries
        .filter(e => e.akun_kode === akun.kode)
        .map(e => ({
          tanggal: j.tanggal,
          no_jurnal: j.no_jurnal,
          keterangan: j.keterangan,
          debit: e.debit,
          kredit: e.kredit,
          saldo: 0, // Akan dihitung di bawah
        }))
    )
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  // Hitung saldo berjalan
  let saldo = akun.saldo;
  entries.forEach(entry => {
    if (akun.saldo_normal === 'Debit') {
      saldo = saldo + entry.debit - entry.kredit;
    } else {
      saldo = saldo - entry.debit + entry.kredit;
    }
    entry.saldo = saldo;
  });

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalKredit = entries.reduce((sum, e) => sum + e.kredit, 0);

  return {
    akun_kode: akun.kode,
    akun_nama: akun.nama,
    entries,
    saldo_awal: akun.saldo,
    total_debit: totalDebit,
    total_kredit: totalKredit,
    saldo_akhir: saldo,
  };
}

// ============ GENERATE LAPORAN KEUANGAN ============

function isValidPeriod(period: string): boolean {
  return /^\d{4}-\d{2}$/.test(period) || /^\d{4}$/.test(period);
}

function journalMatchesPeriod(journalDate: string, period: string): boolean {
  const date = String(journalDate || '').slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(period)) return date.slice(0, 7) === period;
  if (/^\d{4}$/.test(period)) return date.slice(0, 4) === period;
  return false;
}

function postedJournals(journals: JurnalUmum[]): JurnalUmum[] {
  return journals.filter(journal => journal.status === 'Posted');
}

function journalBeforeDate(journal: JurnalUmum, date: string): boolean {
  const journalDate = String(journal.tanggal || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(journalDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) && journalDate <= date;
}

function accountNormalMovement(account: Akun, entry: JurnalEntry): number {
  return account.saldo_normal === 'Debit'
    ? entry.debit - entry.kredit
    : entry.kredit - entry.debit;
}

// Converts a normal-side balance to the sign used on financial statements.
// Contra-assets and debit-balance equity items (for example Prive) reduce totals.
function statementSign(account: Akun): number {
  const debitNormalStatementTypes = account.tipe === 'Aset' || account.tipe === 'Beban';
  const normalSideIncreasesStatement = debitNormalStatementTypes
    ? account.saldo_normal === 'Debit'
    : account.saldo_normal === 'Kredit';
  return normalSideIncreasesStatement ? 1 : -1;
}

function statementBalance(account: Akun, normalBalance: number): number {
  return normalBalance * statementSign(account);
}

function calculateProfitLoss(akunList: Akun[], journals: JurnalUmum[]) {
  const accountsByCode = new Map(akunList.map(account => [account.kode, account]));
  const normalBalances = new Map<string, number>();

  postedJournals(journals).forEach(journal => {
    journal.entries.forEach(entry => {
      const account = accountsByCode.get(entry.akun_kode);
      if (!account) return;
      normalBalances.set(
        account.kode,
        (normalBalances.get(account.kode) || 0) + accountNormalMovement(account, entry)
      );
    });
  });

  const pendapatan = akunList
    .filter(account => account.tipe === 'Pendapatan')
    .map(account => ({
      akun: account.nama,
      jumlah: statementBalance(account, normalBalances.get(account.kode) || 0),
    }))
    .filter(item => item.jumlah !== 0);

  const beban = akunList
    .filter(account => account.tipe === 'Beban')
    .map(account => ({
      akun: account.nama,
      jumlah: statementBalance(account, normalBalances.get(account.kode) || 0),
    }))
    .filter(item => item.jumlah !== 0);

  const total_pendapatan = pendapatan.reduce((sum, item) => sum + item.jumlah, 0);
  const total_beban = beban.reduce((sum, item) => sum + item.jumlah, 0);

  return {
    pendapatan,
    total_pendapatan,
    beban,
    total_beban,
    laba_bersih: total_pendapatan - total_beban,
  };
}

/**
 * Laporan laba rugi hanya memakai jurnal Posted pada periode yang dipilih.
 * Period menerima format YYYY-MM (bulanan) atau YYYY (tahunan).
 */
export function generateLabaRugi(
  akunList: Akun[],
  journals: JurnalUmum[],
  periode: string
): LabaRugi {
  const selected = isValidPeriod(periode)
    ? postedJournals(journals).filter(journal => journalMatchesPeriod(journal.tanggal, periode))
    : [];
  const result = calculateProfitLoss(akunList, selected);

  return { periode, ...result };
}

/**
 * Neraca adalah posisi saldo kumulatif sampai tanggal yang dipilih, bukan hanya
 * transaksi pada bulan yang sedang dibuka.
 */
export function generateNeraca(
  akunList: Akun[],
  journals: JurnalUmum[],
  tanggal: string
): Neraca {
  const asOfDate = String(tanggal || '').slice(0, 10);
  const balances = new Map<string, number>();
  const accountsByCode = new Map(akunList.map(account => [account.kode, account]));

  akunList.forEach(account => balances.set(account.kode, account.saldo || 0));

  postedJournals(journals)
    .filter(journal => journalBeforeDate(journal, asOfDate))
    .forEach(journal => {
      journal.entries.forEach(entry => {
        const account = accountsByCode.get(entry.akun_kode);
        if (!account) return;
        balances.set(
          account.kode,
          (balances.get(account.kode) || 0) + accountNormalMovement(account, entry)
        );
      });
    });

  const amountFor = (account: Akun) => statementBalance(account, balances.get(account.kode) || 0);

  const asetLancar = akunList
    .filter(account => account.tipe === 'Aset' && account.kategori === 'Aset Lancar')
    .map(account => ({ akun: account.nama, jumlah: amountFor(account) }))
    .filter(item => item.jumlah !== 0);

  const asetTetap = akunList
    .filter(account => account.tipe === 'Aset' && account.kategori === 'Aset Tetap')
    .map(account => ({ akun: account.nama, jumlah: amountFor(account) }))
    .filter(item => item.jumlah !== 0);

  const totalAsetLancar = asetLancar.reduce((sum, item) => sum + item.jumlah, 0);
  const totalAsetTetap = asetTetap.reduce((sum, item) => sum + item.jumlah, 0);
  const totalAset = totalAsetLancar + totalAsetTetap;

  const kewajibanJP = akunList
    .filter(account => account.tipe === 'Kewajiban' && account.kategori === 'Kewajiban Jangka Pendek')
    .map(account => ({ akun: account.nama, jumlah: amountFor(account) }))
    .filter(item => item.jumlah !== 0);

  const kewajibanJPanjang = akunList
    .filter(account => account.tipe === 'Kewajiban' && account.kategori === 'Kewajiban Jangka Panjang')
    .map(account => ({ akun: account.nama, jumlah: amountFor(account) }))
    .filter(item => item.jumlah !== 0);

  const totalKewajibanJP = kewajibanJP.reduce((sum, item) => sum + item.jumlah, 0);
  const totalKewajibanJPanjang = kewajibanJPanjang.reduce((sum, item) => sum + item.jumlah, 0);
  const totalKewajiban = totalKewajibanJP + totalKewajibanJPanjang;

  const ekuitas = akunList
    .filter(account => account.tipe === 'Ekuitas')
    .map(account => ({ akun: account.nama, jumlah: amountFor(account) }))
    .filter(item => item.jumlah !== 0);

  // P&L on the balance sheet is cumulative up to the as-of date, not the
  // selected reporting month. It is shown until closing entries transfer it.
  const journalsAsOf = postedJournals(journals)
    .filter(journal => journalBeforeDate(journal, asOfDate));
  const labaAkumulatif = calculateProfitLoss(akunList, journalsAsOf).laba_bersih;
  const labaDitahanIndex = ekuitas.findIndex(item => item.akun === 'Laba Ditahan');
  if (labaDitahanIndex >= 0) {
    ekuitas[labaDitahanIndex].jumlah += labaAkumulatif;
  } else if (labaAkumulatif !== 0) {
    ekuitas.push({ akun: 'Laba Bersih Periode Berjalan', jumlah: labaAkumulatif });
  }

  const totalEkuitas = ekuitas.reduce((sum, item) => sum + item.jumlah, 0);

  return {
    tanggal: asOfDate,
    aset: {
      aset_lancar: asetLancar,
      aset_tetap: asetTetap,
      total_aset_lancar: totalAsetLancar,
      total_aset_tetap: totalAsetTetap,
      total_aset: totalAset,
    },
    kewajiban: {
      kewajiban_jangka_pendek: kewajibanJP,
      kewajiban_jangka_panjang: kewajibanJPanjang,
      total_kewajiban_jangka_pendek: totalKewajibanJP,
      total_kewajiban_jangka_panjang: totalKewajibanJPanjang,
      total_kewajiban: totalKewajiban,
    },
    ekuitas,
    total_ekuitas: totalEkuitas,
    total_kewajiban_ekuitas: totalKewajiban + totalEkuitas,
  };
}

/**
 * Arus kas diturunkan dari perubahan nyata akun Kas/Bank pada jurnal Posted.
 * Arus kas awal dihitung dari saldo awal COA dan pergerakan sebelum periode.
 */
export function generateArusKas(
  akunList: Akun[],
  journals: JurnalUmum[],
  periode: string,
  kasAwalPeriode?: number
): ArusKas {
  const accountsByCode = new Map(akunList.map(account => [account.kode, account]));
  const cashAccounts = akunList.filter(account =>
    account.tipe === 'Aset' &&
    (/^1-100[12]$/.test(account.kode) || /^(kas|bank)(\s|$)/i.test(account.nama.trim()))
  );
  const cashCodes = new Set(cashAccounts.map(account => account.kode));
  const cashDelta = (journal: JurnalUmum) => journal.entries
    .filter(entry => cashCodes.has(entry.akun_kode))
    .reduce((sum, entry) => sum + entry.debit - entry.kredit, 0);

  const firstDay = /^\d{4}-\d{2}$/.test(periode)
    ? `${periode}-01`
    : /^\d{4}$/.test(periode)
      ? `${periode}-01-01`
      : '';
  const periodJournals = isValidPeriod(periode)
    ? postedJournals(journals).filter(journal => journalMatchesPeriod(journal.tanggal, periode))
    : [];
  const beforePeriod = firstDay
    ? postedJournals(journals).filter(journal => {
        const date = String(journal.tanggal || '').slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < firstDay;
      })
    : [];

  const cashOpeningFromAccounts = cashAccounts.reduce((sum, account) =>
    sum + (account.saldo_normal === 'Debit' ? account.saldo : -account.saldo), 0);
  const computedOpening = cashOpeningFromAccounts + beforePeriod.reduce((sum, journal) => sum + cashDelta(journal), 0);
  const kasAwal = Number.isFinite(kasAwalPeriode) ? kasAwalPeriode as number : computedOpening;

  const arus_kas_operasi: { keterangan: string; jumlah: number }[] = [];
  const arus_kas_investasi: { keterangan: string; jumlah: number }[] = [];
  const arus_kas_pendanaan: { keterangan: string; jumlah: number }[] = [];

  periodJournals.forEach(journal => {
    const change = cashDelta(journal);
    if (Math.abs(change) < 0.000001) return;

    const counterpartyAccounts = journal.entries
      .filter(entry => !cashCodes.has(entry.akun_kode))
      .map(entry => accountsByCode.get(entry.akun_kode))
      .filter((account): account is Akun => Boolean(account));

    const investment = counterpartyAccounts.some(account =>
      account.tipe === 'Aset' && account.kategori === 'Aset Tetap'
    );
    const financing = counterpartyAccounts.some(account =>
      account.tipe === 'Ekuitas' ||
      (account.tipe === 'Kewajiban' &&
        (account.kategori === 'Kewajiban Jangka Panjang' || /utang bank|pinjaman/i.test(account.nama))) ||
      /prive|dividen/i.test(account.nama)
    );
    const line = { keterangan: journal.keterangan || journal.no_jurnal, jumlah: change };

    if (investment) arus_kas_investasi.push(line);
    else if (financing) arus_kas_pendanaan.push(line);
    else arus_kas_operasi.push(line);
  });

  const total_arus_kas_operasi = arus_kas_operasi.reduce((sum, item) => sum + item.jumlah, 0);
  const total_arus_kas_investasi = arus_kas_investasi.reduce((sum, item) => sum + item.jumlah, 0);
  const total_arus_kas_pendanaan = arus_kas_pendanaan.reduce((sum, item) => sum + item.jumlah, 0);
  const kenaikan_penurunan_kas = total_arus_kas_operasi + total_arus_kas_investasi + total_arus_kas_pendanaan;

  return {
    periode,
    arus_kas_operasi,
    total_arus_kas_operasi,
    arus_kas_investasi,
    total_arus_kas_investasi,
    arus_kas_pendanaan,
    total_arus_kas_pendanaan,
    kenaikan_penurunan_kas,
    kas_awal_periode: kasAwal,
    kas_akhir_periode: kasAwal + kenaikan_penurunan_kas,
  };
}
