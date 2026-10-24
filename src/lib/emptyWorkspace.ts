import { WorkspaceData } from './googleErpApi';
import { initialMenuConfig } from '../data';
import { initialAkun } from '../data/accounting';

export const OPERATIONAL_KEYS = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'qcRecords', 'assets',
  'taxRecords', 'housingUnits', 'menuConfig',
] as const;
export const ACCOUNTING_KEYS = ['akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'] as const;

export function createEmptyWorkspaceData(): WorkspaceData {
  const operational: Record<string, unknown> = {};
  for (const key of OPERATIONAL_KEYS) operational[key] = [];
  operational.menuConfig = initialMenuConfig;
  return {
    operational,
    accounting: {
      akun: initialAkun,
      jurnal: [],
      invoice: [],
      purchaseOrder: [],
      rab: [],
      schedule: [],
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function validateWorkspaceData(value: unknown): WorkspaceData {
  if (!isObject(value) || !isObject(value.operational) || !isObject(value.accounting)) {
    throw new Error('Struktur data workspace tidak valid.');
  }
  for (const key of OPERATIONAL_KEYS) {
    if (!Array.isArray(value.operational[key])) throw new Error(`Data operasional "${key}" tidak valid.`);
  }
  for (const key of ACCOUNTING_KEYS) {
    if (!Array.isArray(value.accounting[key])) throw new Error(`Data akuntansi "${key}" tidak valid.`);
  }
  return value as WorkspaceData;
}

export function readCurrentBrowserData(): WorkspaceData | null {
  const operationalRaw = window.localStorage.getItem('abiedien.erp.app.v1');
  const accountingRaw = window.localStorage.getItem('abiedien.erp.accounting.v1');
  if (!operationalRaw && !accountingRaw) return null;

  const empty = createEmptyWorkspaceData();
  let operational: Record<string, unknown> = empty.operational;
  let accounting: Record<string, unknown> = empty.accounting;
  try {
    if (operationalRaw) {
      const parsed: unknown = JSON.parse(operationalRaw);
      if (!isObject(parsed)) throw new Error('Data operasional browser tidak berbentuk object.');
      operational = { ...empty.operational, ...parsed };
      for (const key of OPERATIONAL_KEYS) {
        if (!Array.isArray(operational[key])) operational[key] = [];
      }
    }
    if (accountingRaw) {
      const parsed: unknown = JSON.parse(accountingRaw);
      if (!isObject(parsed)) throw new Error('Data akuntansi browser tidak berbentuk object.');
      accounting = { ...empty.accounting, ...parsed };
      for (const key of ACCOUNTING_KEYS) {
        if (!Array.isArray(accounting[key])) accounting[key] = [];
      }
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Data browser tidak bisa dibaca.');
  }
  // Apply the same known-demo cleanup used by the normal application loader before
  // offering a local-to-cloud import. Do not silently migrate known sample rows.
  const same = (item: Record<string, unknown>, checks: Record<string, unknown>) =>
    Object.keys(checks).every(key => item[key] === checks[key]);
  const filterRows = (key: string, predicate: (row: Record<string, unknown>) => boolean) => {
    const value = operational[key];
    if (Array.isArray(value)) operational[key] = value.filter(row => !isObject(row) || !predicate(row));
  };
  filterRows('stok', row =>
    same(row, { id: 'STK-001', kode: 'BB-001', nama: 'Semen Portland 50kg', stok_awal: 100, masuk: 50, keluar: 80, harga_pokok: 65000 }) ||
    same(row, { id: 'STK-002', kode: 'BB-002', nama: 'Pasir Pasang', stok_awal: 10, masuk: 5, keluar: 8, harga_pokok: 800000 }) ||
    same(row, { id: 'STK-003', kode: 'BB-003', nama: 'Besi Beton 10mm', stok_awal: 200, masuk: 100, keluar: 150, harga_pokok: 85000 }) ||
    same(row, { id: 'STK-004', kode: 'BJ-001', nama: 'Rumah Type 36', stok_awal: 0, masuk: 2, keluar: 1, harga_pokok: 250000000 }) ||
    same(row, { id: 'STK-005', kode: 'BD-001', nama: 'Keramik 40x40', stok_awal: 50, masuk: 30, keluar: 40, harga_pokok: 120000 })
  );
  filterRows('produksi', row =>
    same(row, { id: 'PRD-001', no_produksi: 'SPK-2024-001', tanggal: '2024-01-10', produk: 'Rumah Type 36' }) ||
    same(row, { id: 'PRD-002', no_produksi: 'SPK-2024-002', tanggal: '2024-02-01', produk: 'Rumah Type 36' })
  );
  filterRows('penjualan', row =>
    same(row, { id: 'PJ-001', no_invoice: 'INV-2024-001', pelanggan: 'Budi Santoso', tanggal: '2024-02-15' }) ||
    same(row, { id: 'PJ-002', no_invoice: 'INV-2024-002', pelanggan: 'Ahmad Wijaya', tanggal: '2024-03-01' })
  );
  filterRows('pembelian', row =>
    same(row, { id: 'PB-001', no_po: 'PO-2024-001', supplier: 'PT Semen Indonesia', tanggal: '2024-01-05' }) ||
    same(row, { id: 'PB-002', no_po: 'PO-2024-002', supplier: 'Toko Besi Jaya', tanggal: '2024-01-20' })
  );
  filterRows('penggajian', row =>
    same(row, { id: 'GJ-001', nip: 'EMP-001', nama: 'Budi Hermawan', periode: '2024-03' }) ||
    same(row, { id: 'GJ-002', nip: 'EMP-002', nama: 'Sri Wahyuni', periode: '2024-03' }) ||
    same(row, { id: 'GJ-003', nip: 'EMP-003', nama: 'Agus Prasetyo', periode: '2024-03' })
  );
  filterRows('anggaran', row =>
    same(row, { id: 'AG-001', periode: '2024', kategori: 'Pembebasan Tanah', anggaran: 500000000, realisasi: 309400000 }) ||
    same(row, { id: 'AG-002', periode: '2024', kategori: 'Cut & Fill (Beko)', anggaran: 200000000, realisasi: 71350000 }) ||
    same(row, { id: 'AG-003', periode: '2024', kategori: 'Material & Perlengkapan', anggaran: 150000000, realisasi: 13596000 }) ||
    same(row, { id: 'AG-004', periode: '2024', kategori: 'Tenaga Kerja', anggaran: 120000000, realisasi: 22820000 })
  );
  filterRows('ocr', row =>
    same(row, { id: 'OCR-001' }) && /drive\\.google\\.com\\/file\\/d\\/xxx1/.test(String(row.image_url || '')) ||
    same(row, { id: 'OCR-002' }) && /drive\\.google\\.com\\/file\\/d\\/xxx2/.test(String(row.image_url || '')) ||
    same(row, { id: 'OCR-003', confidence: 45, status: 'Pending' })
  );
  filterRows('whatsapp', row => ['WA-001', 'WA-002', 'WA-003'].includes(String(row.id || '')));
  filterRows('auditLog', row => same(row, { id: 'LOG-001', record_id: 'AR-001', aksi: 'CREATE' }));
  if (Array.isArray(operational.arusKas) &&
      operational.arusKas.every((row, index) => isObject(row) && row.id === 'AK-0' + (index + 1))) {
    operational.arusKas = [];
  }
  return { operational, accounting };
}
