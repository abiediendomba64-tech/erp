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
  return { operational, accounting };
}
