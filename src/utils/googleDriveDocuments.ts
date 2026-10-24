import { getActiveWorkspaceId, googleErpApi } from '../lib/googleErpApi';

export interface UploadedDriveDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export const MAX_DRIVE_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export async function uploadDocumentToDrive(file: File): Promise<UploadedDriveDocument> {
  if (!file || file.size <= 0) throw new Error('Pilih file yang tidak kosong.');
  if (file.size > MAX_DRIVE_UPLOAD_BYTES) {
    throw new Error('File maksimal 4 MB untuk upload melalui Apps Script. Untuk file lebih besar, upload langsung ke folder Drive bersama dan tautkan URL-nya.');
  }
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Jenis file yang didukung: foto JPEG/PNG/WebP atau PDF.');
  }
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) throw new Error('Workspace cloud belum aktif. Login dan pilih workspace dahulu.');

  const base64 = await fileToBase64(file);
  const result = await googleErpApi<{ file: UploadedDriveDocument }>('document.upload', {
    workspaceId,
    file: { name: file.name, mimeType: file.type.toLowerCase(), base64 },
  });
  if (!result.file || !result.file.id || !result.file.url) {
    throw new Error('Backend tidak mengembalikan ID/tautan file Drive yang valid.');
  }
  return result.file;
}

export function openDriveDocument(url: string) {
  if (!/^https:\/\/drive\.google\.com\//i.test(url)) {
    throw new Error('Tautan bukan URL Google Drive yang diizinkan.');
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
