import { initialMenuConfig } from '../data';
import { initialAkun } from '../data/accounting';
import type { WorkspaceSnapshot } from './googleBackend';

const operationalModules = [
  'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
  'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
  'anggaran', 'arusKas', 'ocr', 'whatsapp', 'qcRecords', 'assets',
  'taxRecords', 'housingUnits'
];

export function createEmptyWorkspaceSnapshot(): WorkspaceSnapshot {
  const operational: Record<string, unknown> = {};
  operationalModules.forEach(key => { operational[key] = []; });
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

export function getLegacyLocalSnapshot(): WorkspaceSnapshot | null {
  const operationalRaw = window.localStorage.getItem('abiedien.erp.app.v1');
  const accountingRaw = window.localStorage.getItem('abiedien.erp.accounting.v1');
  if (!operationalRaw && !accountingRaw) return null;
  const empty = createEmptyWorkspaceSnapshot();
  let operational: Record<string, unknown> = { ...empty.operational };
  let accounting: Record<string, unknown> = { ...empty.accounting };

  if (operationalRaw) {
    const local = JSON.parse(operationalRaw) as unknown;
    if (!isObject(local)) throw new Error('Data operasional lokal tidak valid.');
    Object.keys(operational).forEach(key => {
      if (Array.isArray(local[key])) operational[key] = local[key];
    });
  }
  if (accountingRaw) {
    const local = JSON.parse(accountingRaw) as unknown;
    if (!isObject(local)) throw new Error('Data akuntansi lokal tidak valid.');
    Object.keys(accounting).forEach(key => {
      if (Array.isArray(local[key])) accounting[key] = local[key];
    });
  }
  return { operational, accounting };
}

export function countSnapshotRecords(snapshot: WorkspaceSnapshot) {
  const operational = Object.values(snapshot.operational).reduce((count, value) => count + (Array.isArray(value) ? value.length : 0), 0);
  const accounting = Object.values(snapshot.accounting).reduce((count, value) => count + (Array.isArray(value) ? value.length : 0), 0);
  return { operational, accounting, total: operational + accounting };
}
