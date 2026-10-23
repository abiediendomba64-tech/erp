import { initialMenuConfig } from '../data';
import { initialAkun } from '../data/accounting';

export interface WorkspaceSnapshot {
  operational: Record<string, unknown>;
  accounting: Record<string, unknown>;
}

export const OPERATIONAL_MODULES = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'menuConfig', 'qcRecords', 'assets',
  'taxRecords', 'housingUnits'
] as const;

export const ACCOUNTING_MODULES = [
  'akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function createEmptyWorkspaceSnapshot(): WorkspaceSnapshot {
  const operational: Record<string, unknown> = {};
  for (const key of OPERATIONAL_MODULES) operational[key] = [];
  operational.menuConfig = initialMenuConfig;
  const accounting: Record<string, unknown> = {};
  for (const key of ACCOUNTING_MODULES) accounting[key] = [];
  accounting.akun = initialAkun;
  return { operational, accounting };
}

function restoreKnownArrays(
  defaults: Record<string, unknown>,
  source: Record<string, unknown>,
  moduleKeys: readonly string[],
): Record<string, unknown> {
  const result = { ...defaults };
  for (const key of moduleKeys) {
    if (Array.isArray(source[key])) result[key] = source[key];
  }
  return result;
}

/**
 * Read browser data only after a user explicitly chooses the "import local data" action.
 * The function never runs automatically at login, because localStorage is not an SSOT.
 */
export function readLocalWorkspaceSnapshot(): WorkspaceSnapshot | null {
  const operationalRaw = window.localStorage.getItem('abiedien.erp.app.v1');
  const accountingRaw = window.localStorage.getItem('abiedien.erp.accounting.v1');
  if (!operationalRaw && !accountingRaw) return null;
  const defaults = createEmptyWorkspaceSnapshot();

  let operational = defaults.operational;
  let accounting = defaults.accounting;

  if (operationalRaw) {
    const parsed: unknown = JSON.parse(operationalRaw);
    if (!isRecord(parsed)) throw new Error('Data ERP lokal tidak berbentuk object JSON yang valid.');
    operational = restoreKnownArrays(defaults.operational, parsed, OPERATIONAL_MODULES);
  }
  if (accountingRaw) {
    const parsed: unknown = JSON.parse(accountingRaw);
    if (!isRecord(parsed)) throw new Error('Data akuntansi lokal tidak berbentuk object JSON yang valid.');
    accounting = restoreKnownArrays(defaults.accounting, parsed, ACCOUNTING_MODULES);
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
  for (const key of OPERATIONAL_MODULES) {
    if (!Array.isArray(input.operational[key])) {
      throw new Error(`Data cloud tidak valid: bagian operasional "${key}" bukan array.`);
    }
  }
  for (const key of ACCOUNTING_MODULES) {
    if (!Array.isArray(input.accounting[key])) {
      throw new Error(`Data cloud tidak valid: bagian akuntansi "${key}" bukan array.`);
    }
  }
  return { operational: input.operational, accounting: input.accounting };
}
