import { initialMenuConfig } from '../data';
import { initialAkun } from '../data/accounting';
import type { WorkspaceSnapshot } from './cloudWorkspace';

const OPERATIONAL_ARRAYS = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'qcRecords', 'assets', 'taxRecords', 'housingUnits'
] as const;
const ACCOUNTING_ARRAYS = ['akun', 'jurnal', 'invoice', 'purchaseOrder', 'rab', 'schedule'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function createEmptyWorkspaceSnapshot(): WorkspaceSnapshot {
  const operational: Record<string, unknown> = {};
  OPERATIONAL_ARRAYS.forEach(key => { operational[key] = []; });
  operational.menuConfig = initialMenuConfig;
  return {
    operational,
    accounting: {
      akun: initialAkun,
      jurnal: [],
      invoice: [],
      purchaseOrder: [],
      rab: [],
      schedule: []
    }
  };
}

function fillArrays(
  initial: Record<string, unknown>,
  saved: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const result = { ...initial };
  keys.forEach(key => { result[key] = Array.isArray(saved[key]) ? saved[key] : initial[key]; });
  if (Array.isArray(saved.menuConfig)) result.menuConfig = saved.menuConfig;
  return result;
}

/** Returns browser data only for the explicit, user-selected initial migration option. */
export function readLocalWorkspaceSnapshot(): WorkspaceSnapshot | null {
  const operationalRaw = window.localStorage.getItem('abiedien.erp.app.v1');
  const accountingRaw = window.localStorage.getItem('abiedien.erp.accounting.v1');
  if (!operationalRaw && !accountingRaw) return null;

  const empty = createEmptyWorkspaceSnapshot();
  let operational = empty.operational;
  let accounting = empty.accounting;

  if (operationalRaw) {
    const parsed: unknown = JSON.parse(operationalRaw);
    if (!isRecord(parsed)) throw new Error('Data ERP lokal tidak berbentuk object JSON.');
    operational = fillArrays(empty.operational, parsed, OPERATIONAL_ARRAYS);
  }
  if (accountingRaw) {
    const parsed: unknown = JSON.parse(accountingRaw);
    if (!isRecord(parsed)) throw new Error('Data akuntansi lokal tidak berbentuk object JSON.');
    accounting = fillArrays(empty.accounting, parsed, ACCOUNTING_ARRAYS);
    const chart = accounting.akun;
    if (!Array.isArray(chart) || !chart.every(item =>
      isRecord(item) && typeof item.kode === 'string' && typeof item.tipe === 'string'
    )) accounting.akun = initialAkun;
  }
  return { operational, accounting };
}

export function countSnapshotRows(snapshot: WorkspaceSnapshot | null): number {
  if (!snapshot) return 0;
  const arrays = [
    ...Object.values(snapshot.operational),
    ...Object.values(snapshot.accounting)
  ];
  return arrays.reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
}

export function clearWorkspaceBrowserCache(): void {
  window.localStorage.removeItem('abiedien.erp.app.v1');
  window.localStorage.removeItem('abiedien.erp.accounting.v1');
}
