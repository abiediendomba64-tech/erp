export interface StoredLocalDocument {
  key: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

const DATABASE_NAME = 'abiedien-erp-document-files';
const STORE_NAME = 'documents';
export const MAX_LOCAL_DOCUMENT_BYTES = 10 * 1024 * 1024;

function openDocumentDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Browser ini tidak mendukung IndexedDB untuk penyimpanan lampiran.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka penyimpanan lampiran lokal.'));
  });
}

function makeDocumentKey(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return 'DOC-' + Date.now().toString(36) + '-' + random;
}

export async function saveLocalDocumentFile(file: File): Promise<string> {
  if (!file || file.size <= 0) throw new Error('Pilih file dokumen yang tidak kosong.');
  if (file.size > MAX_LOCAL_DOCUMENT_BYTES) {
    throw new Error('Ukuran file melebihi batas lampiran lokal 10 MB. Gunakan tautan Drive yang memiliki akses terbatas.');
  }

  const database = await openDocumentDatabase();
  const key = makeDocumentKey();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({
        key,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        blob: file
      } satisfies StoredLocalDocument);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Lampiran gagal disimpan.'));
      transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan lampiran dibatalkan.'));
    });
    return key;
  } finally {
    database.close();
  }
}

export async function getLocalDocumentFile(key: string): Promise<StoredLocalDocument | null> {
  if (!key) return null;
  const database = await openDocumentDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as StoredLocalDocument | undefined) || null);
      request.onerror = () => reject(request.error || new Error('Lampiran tidak dapat dibaca.'));
    });
  } finally {
    database.close();
  }
}

export async function deleteLocalDocumentFile(key: string): Promise<void> {
  if (!key) return;
  const database = await openDocumentDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Lampiran lokal gagal dihapus.'));
    });
  } finally {
    database.close();
  }
}

export async function downloadLocalDocumentFile(key: string, fallbackName?: string): Promise<void> {
  const stored = await getLocalDocumentFile(key);
  if (!stored) throw new Error('File lokal tidak ditemukan pada browser ini. Periksa backup atau tautan penyimpanan dokumen.');
  const url = URL.createObjectURL(stored.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fallbackName || stored.name || 'dokumen';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function previewLocalDocumentFile(key: string): Promise<void> {
  const stored = await getLocalDocumentFile(key);
  if (!stored) throw new Error('File lokal tidak ditemukan pada browser ini. Periksa backup atau tautan penyimpanan dokumen.');
  const url = URL.createObjectURL(stored.blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = stored.name || 'dokumen';
    anchor.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
