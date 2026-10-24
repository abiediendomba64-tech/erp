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
  'taxRecords', 'housingUnits',
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
      throw new Error(\`Data cloud tidak valid: bagian operasional "\${key}" bukan array.\`);
    }
  }
  if (!Array.isArray(operational.menuConfig)) throw new Error('Data cloud tidak valid: konfigurasi menu bukan array.');
  for (const key of ACCOUNTING_ARRAYS) {
    if (!Array.isArray(accounting[key])) {
      throw new Error(\`Data cloud tidak valid: bagian akuntansi "\${key}" bukan array.\`);
    }
  }
  return { operational, accounting };
}

export function saveWorkspaceSnapshotToLocalCache(snapshot: WorkspaceSnapshot): void {
  const validated = validateWorkspaceSnapshot(snapshot);
  window.localStorage.setItem('abiedien.erp.app.v1', JSON.stringify(validated.operational));
  window.localStorage.setItem('abiedien.erp.accounting.v1', JSON.stringify(validated.accounting));
}

export function downloadLocalWorkspaceBackup(snapshot: WorkspaceSnapshot): void {
  const payload = {
    version: 'ERP_LOCAL_BACKUP_V1',
    timestamp: new Date().toISOString(),
    note: 'Cadangan lokal sebelum pergantian sumber data. Lampiran IndexedDB tidak termasuk.',
    data: snapshot,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = \`erp-local-backup-\${new Date().toISOString().slice(0, 10)}.json\`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}


const CLOUD_CACHE_META_KEY = 'abiedien.erp.cloud.cache.meta.v1';

export interface CloudCacheMeta {
  workspaceId: string;
  version: number;
  fingerprint: string;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  const record = value as Record<string, unknown>;
  return '{' + Object.keys(record).sort().map((key) =>
    JSON.stringify(key) + ':' + stableJson(record[key])
  ).join(',') + '}';
}

// A compact cache-integrity fingerprint, not a cryptographic security signature.
export function snapshotFingerprint(snapshot: WorkspaceSnapshot): string {
  const text = stableJson(snapshot);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function getCloudCacheMeta(): CloudCacheMeta | null {
  try {
    const raw = window.localStorage.getItem(CLOUD_CACHE_META_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || typeof value.workspaceId !== 'string' ||
        !Number.isInteger(value.version) || typeof value.fingerprint !== 'string') return null;
    return {
      workspaceId: value.workspaceId,
      version: Number(value.version),
      fingerprint: value.fingerprint,
    };
  } catch {
    return null;
  }
}

export function setCloudCacheMeta(
  workspaceId: string,
  version: number,
  snapshot: WorkspaceSnapshot,
): void {
  const meta: CloudCacheMeta = {
    workspaceId,
    version,
    fingerprint: snapshotFingerprint(snapshot),
  };
  window.localStorage.setItem(CLOUD_CACHE_META_KEY, JSON.stringify(meta));
}

export function isLocalSnapshotSyncedForWorkspace(
  snapshot: WorkspaceSnapshot | null,
  workspaceId: string,
): boolean {
  if (!snapshot) return false;
  const meta = getCloudCacheMeta();
  return Boolean(
    meta &&
    meta.workspaceId === workspaceId &&
    meta.fingerprint === snapshotFingerprint(snapshot)
  );
}

export function downloadRawLocalWorkspaceBackup(): boolean {
  const operational = window.localStorage.getItem('abiedien.erp.app.v1');
  const accounting = window.localStorage.getItem('abiedien.erp.accounting.v1');
  if (operational === null && accounting === null) return false;
  const payload = {
    version: 'ERP_LOCAL_RAW_BACKUP_V1',
    timestamp: new Date().toISOString(),
    note: 'Cache JSON mentah karena parsing gagal. Perlu pemeriksaan sebelum impor. Lampiran IndexedDB tidak termasuk.',
    operationalRaw: operational,
    accountingRaw: accounting,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = \`erp-local-raw-backup-\${new Date().toISOString().slice(0, 10)}.json\`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
