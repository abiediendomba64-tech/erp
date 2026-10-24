import { initialMenuConfig } from '../data';
import { initialAkun } from '../data/accounting';

export interface WorkspaceSnapshot {
  operational: Record<string, unknown>;
  accounting: Record<string, unknown>;
}

const OPERATIONAL_ARRAYS = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'qcRecords', 'assets',
  'taxRecords', 'housingUnits'
] as const;

const ACCOUNTING_ARRAYS = ['akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function createEmptyWorkspaceSnapshot(): WorkspaceSnapshot {
  const operational: Record<string, unknown> = {};
  for (const key of OPERATIONAL_ARRAYS) operational[key] = [];
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

function readSliceFromLocalStorage(
  key: string,
  base: Record<string, unknown>,
  expectedArrays: readonly string[],
): Record<string, unknown> {
  const raw = window.localStorage.getItem(key);
  if (!raw) return base;
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('Data lokal tidak valid. Unduh backup JSON dan periksa sebelum migrasi.');
  const result = { ...base };
  for (const arrayKey of expectedArrays) {
    if (Array.isArray(parsed[arrayKey])) result[arrayKey] = parsed[arrayKey];
  }
  if (Array.isArray(parsed.menuConfig)) result.menuConfig = parsed.menuConfig;
  return result;
}

/** Called only after the admin explicitly selects "import local data". */
export function readLocalWorkspaceSnapshot(): WorkspaceSnapshot {
  const empty = createEmptyWorkspaceSnapshot();
  return {
    operational: readSliceFromLocalStorage('abiedien.erp.app.v1', empty.operational, OPERATIONAL_ARRAYS),
    accounting: readSliceFromLocalStorage('abiedien.erp.accounting.v1', empty.accounting, ACCOUNTING_ARRAYS),
  };
}

export function validateWorkspaceSnapshot(input: unknown): WorkspaceSnapshot {
  if (!isRecord(input) || !isRecord(input.operational) || !isRecord(input.accounting)) {
    throw new Error('Data workspace cloud tidak valid.');
  }
  const operational = input.operational;
  const accounting = input.accounting;
  for (const key of OPERATIONAL_ARRAYS) {
    if (!Array.isArray(operational[key])) throw new Error('Data cloud operasional tidak lengkap: ' + key);
  }
  if (!Array.isArray(operational.menuConfig)) throw new Error('Konfigurasi menu cloud tidak valid.');
  for (const key of ACCOUNTING_ARRAYS) {
    if (!Array.isArray(accounting[key])) throw new Error('Data cloud akuntansi tidak lengkap: ' + key);
  }
  return { operational, accounting };
}
