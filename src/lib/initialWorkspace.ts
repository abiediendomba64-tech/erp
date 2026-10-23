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

function fillKnownArrays(
  base: Record<string, unknown>,
  saved: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const result = { ...base };
  for (const key of keys) result[key] = Array.isArray(saved[key]) ? saved[key] : base[key];
  if (Array.isArray(saved.menuConfig)) result.menuConfig = saved.menuConfig;
  return result;
}

export function readLocalWorkspaceSnapshot(): WorkspaceSnapshot | null {
  const operationalRaw = window.localStorage.getItem('abiedien.erp.app.v1');
  const accountingRaw = window.localStorage.getItem('abiedien.erp.accounting.v1');
  if (!operationalRaw && !accountingRaw) return null;

  const empty = createEmptyWorkspaceSnapshot();
  let operational: Record<string, unknown> = empty.operational;
  let accounting: Record<string, unknown> = empty.accounting;

  if (operationalRaw) {
    const parsed: unknown = JSON.parse(operationalRaw);
    if (!isRecord(parsed)) throw new Error('Data ERP lokal tidak berbentuk object JSON yang valid.');
    operational = fillKnownArrays(empty.operational, parsed, OPERATIONAL_ARRAYS);
  }
  if (accountingRaw) {
    const parsed: unknown = JSON.parse(accountingRaw);
    if (!isRecord(parsed)) throw new Error('Data akuntansi lokal tidak berbentuk object JSON yang valid.');
    accounting = fillKnownArrays(empty.accounting, parsed, ACCOUNTING_ARRAYS);
    const accounts = accounting.akun;
    if (!Array.isArray(accounts) || !accounts.every((item) =>
      isRecord(item) && typeof item.kode === 'string' && typeof item.tipe === 'string'
    )) {
      accounting.akun = initialAkun;
    }
  }

  return { operational, accounting };
}

export function validateWorkspaceSnapshot(input: unknown): WorkspaceSnapshot {
  if (!isRecord(input) || !isRecord(input.operational) || !isRecord(input.accounting)) {
    throw new Error('Data cloud ERP tidak valid. Muat ulang atau hubungi administrator.');
  }
  const operational = input.operational;
  const accounting = input.accounting;
  for (const key of OPERATIONAL_ARRAYS) {
    if (!Array.isArray(operational[key])) {
      throw new Error(`Data cloud tidak valid: bagian operasional "${key}" bukan array.`);
    }
  }
  if (!Array.isArray(operational.menuConfig)) {
    throw new Error('Data cloud tidak valid: konfigurasi menu bukan array.');
  }
  for (const key of ACCOUNTING_ARRAYS) {
    if (!Array.isArray(accounting[key])) {
      throw new Error(`Data cloud tidak valid: bagian akuntansi "${key}" bukan array.`);
    }
  }
  return { operational, accounting };
}
