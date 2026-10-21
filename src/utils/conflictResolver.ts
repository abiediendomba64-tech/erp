/**
 * Conflict Resolver - Menangani data konflik antar sumber
 * 
 * Masalah: Banyak angka yang berbeda antar versi
 * - Kas riil: Rp35.220.000 vs Rp20.220.000
 * - Utang tanah: Rp34.700.000 vs Rp37.200.000
 * - Pembayaran tanah: Rp309.400.000 vs Rp236.900.000
 * 
 * Solusi: Tandai konflik eksplisit, jangan pilih diam-diam
 */

export type ConflictStatus = 'RESOLVED' | 'UNRESOLVED' | 'PENDING_REVIEW';

export type DataSource = 'PDF_LAMA' | 'WORKBOOK_TERBARU' | 'KLARIFIKASI' | 'DOKUMEN_FISIK' | 'INPUT_MANUAL';

export interface DataVersion<T> {
  id: string;
  source: DataSource;
  timestamp: string;
  data: T;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ConflictRecord<T> {
  id: string;
  field: string;
  description: string;
  versions: DataVersion<T>[];
  status: ConflictStatus;
  resolvedValue?: T;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

/**
 * Buat conflict record baru
 */
export function createConflict<T>(
  field: string,
  description: string,
  versions: DataVersion<T>[]
): ConflictRecord<T> {
  return {
    id: `CONFLICT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    field,
    description,
    versions,
    status: 'UNRESOLVED',
    createdAt: new Date().toISOString()
  };
}

/**
 * Resolve conflict dengan memilih salah satu versi
 */
export function resolveConflict<T>(
  conflict: ConflictRecord<T>,
  selectedVersionId: string,
  resolvedBy: string,
  notes?: string
): ConflictRecord<T> {
  const selectedVersion = conflict.versions.find(v => v.id === selectedVersionId);
  
  if (!selectedVersion) {
    throw new Error(`Version ${selectedVersionId} not found in conflict ${conflict.id}`);
  }
  
  return {
    ...conflict,
    status: 'RESOLVED',
    resolvedValue: selectedVersion.data,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolutionNotes: notes || `Dipilih dari sumber ${selectedVersion.source}`
  };
}

/**
 * Resolve conflict dengan nilai custom
 */
export function resolveConflictWithCustomValue<T>(
  conflict: ConflictRecord<T>,
  customValue: T,
  resolvedBy: string,
  notes: string
): ConflictRecord<T> {
  return {
    ...conflict,
    status: 'RESOLVED',
    resolvedValue: customValue,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolutionNotes: notes
  };
}

/**
 * Mark conflict sebagai pending review
 */
export function markConflictAsPending<T>(
  conflict: ConflictRecord<T>,
  reviewer: string
): ConflictRecord<T> {
  return {
    ...conflict,
    status: 'PENDING_REVIEW',
    resolvedBy: reviewer,
    resolutionNotes: 'Ditandai untuk review lebih lanjut'
  };
}

/**
 * Hitung selisih antara dua versi
 */
export function calculateDifference(
  version1: number,
  version2: number
): { absolute: number; percentage: number } {
  const absolute = Math.abs(version1 - version2);
  const base = Math.max(Math.abs(version1), Math.abs(version2));
  const percentage = base > 0 ? (absolute / base) * 100 : 0;
  
  return { absolute, percentage };
}

/**
 * Deteksi konflik otomatis dari dua sumber
 */
export function detectConflict<T>(
  field: string,
  description: string,
  source1: DataSource,
  value1: T,
  source2: DataSource,
  value2: T,
  tolerance?: number
): ConflictRecord<T> | null {
  // Jika nilai sama, tidak ada konflik
  if (value1 === value2) return null;
  
  // Jika tolerance diberikan dan nilai adalah number
  if (tolerance !== undefined && typeof value1 === 'number' && typeof value2 === 'number') {
    const diff = Math.abs(value1 - value2);
    if (diff <= tolerance) return null;
  }
  
  const versions: DataVersion<T>[] = [
    {
      id: `V1-${Date.now()}`,
      source: source1,
      timestamp: new Date().toISOString(),
      data: value1
    },
    {
      id: `V2-${Date.now()}`,
      source: source2,
      timestamp: new Date().toISOString(),
      data: value2
    }
  ];
  
  return createConflict(field, description, versions);
}

// ============ CONTOH KASUS KONFLIK NYATA ============

/**
 * Contoh konflik dari audit:
 */
export const EXAMPLE_CONFLICTS = {
  kasRiil: {
    field: 'kas_riil',
    description: 'Kas riil berbeda antara ringkasan PDF dan catatan klarifikasi',
    versions: [
      {
        id: 'V1-KAS',
        source: 'PDF_LAMA' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 35220000,
        notes: 'Dari ringkasan PDF 13 Oktober'
      },
      {
        id: 'V2-KAS',
        source: 'KLARIFIKASI' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 20220000,
        notes: 'Dari catatan klarifikasi'
      }
    ]
  },
  
  utangTanah: {
    field: 'utang_tanah',
    description: 'Utang tanah berbeda antara PDF lama dan workbook terbaru',
    versions: [
      {
        id: 'V1-UTANG',
        source: 'PDF_LAMA' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 34700000,
        notes: 'PDF lama - DP Balong 15jt'
      },
      {
        id: 'V2-UTANG',
        source: 'WORKBOOK_TERBARU' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 37200000,
        notes: 'Workbook terbaru - DP Balong 12.5jt'
      }
    ]
  },
  
  pembayaranTanah: {
    field: 'pembayaran_tanah',
    description: 'Pembayaran tanah berbeda antara ringkasan dan jumlah kolom register',
    versions: [
      {
        id: 'V1-BAYAR',
        source: 'PDF_LAMA' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 309400000,
        notes: 'Dari ringkasan PDF lama'
      },
      {
        id: 'V2-BAYAR',
        source: 'WORKBOOK_TERBARU' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 236900000,
        notes: 'Jumlah kolom dibayar di workbook terbaru'
      }
    ]
  },
  
  danaBeko: {
    field: 'dana_beko',
    description: 'Dana beko berbeda antara rincian tahap dan angka buku',
    versions: [
      {
        id: 'V1-BEKO',
        source: 'WORKBOOK_TERBARU' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 61350000,
        notes: 'Hasil jumlah 6 tahap'
      },
      {
        id: 'V2-BEKO',
        source: 'WORKBOOK_TERBARU' as DataSource,
        timestamp: '2026-10-13T00:00:00Z',
        data: 55450000,
        notes: 'Angka tertulis di buku'
      }
    ]
  }
};

/**
 * Fungsi helper untuk membuat conflict dari contoh
 */
export function createExampleConflict(key: keyof typeof EXAMPLE_CONFLICTS): ConflictRecord<number> {
  const example = EXAMPLE_CONFLICTS[key];
  return createConflict(example.field, example.description, example.versions);
}

// ============ UI HELPER ============

/**
 * Format conflict untuk ditampilkan di UI
 */
export function formatConflictForUI<T>(conflict: ConflictRecord<T>): string {
  const statusEmoji = {
    'RESOLVED': '✅',
    'UNRESOLVED': '❌',
    'PENDING_REVIEW': '⏳'
  };
  
  let output = `${statusEmoji[conflict.status]} ${conflict.description}\n\n`;
  
  output += `Field: ${conflict.field}\n`;
  output += `Status: ${conflict.status}\n\n`;
  
  output += `Versi yang tersedia:\n`;
  conflict.versions.forEach((version, index) => {
    output += `  ${index + 1}. ${version.source}: ${JSON.stringify(version.data)}\n`;
    if (version.notes) {
      output += `     Catatan: ${version.notes}\n`;
    }
  });
  
  if (conflict.status === 'RESOLVED' && conflict.resolvedValue !== undefined) {
    output += `\n✅ Resolved: ${JSON.stringify(conflict.resolvedValue)}\n`;
    output += `   Oleh: ${conflict.resolvedBy}\n`;
    output += `   Tanggal: ${conflict.resolvedAt}\n`;
    if (conflict.resolutionNotes) {
      output += `   Catatan: ${conflict.resolutionNotes}\n`;
    }
  }
  
  return output;
}

// ============ EXAMPLE USAGE ============

/**
 * Contoh penggunaan:
 * 
 * // Deteksi konflik otomatis
 * const kasRiilConflict = detectConflict(
 *   'kas_riil',
 *   'Kas riil berbeda antara ringkasan PDF dan catatan klarifikasi',
 *   'PDF_LAMA',
 *   35220000,
 *   'KLARIFIKASI',
 *   20220000
 * );
 * 
 * if (kasRiilConflict) {
 *   console.log('Konflik terdeteksi:', kasRiilConflict);
 *   
 *   // Resolve dengan memilih salah satu versi
 *   const resolved = resolveConflict(
 *     kasRiilConflict,
 *     'V1-KAS', // Pilih versi dari PDF lama
 *     'Admin',
 *     'Dipilih karena lebih baru dan diverifikasi'
 *   );
 *   
 *   console.log('Resolved:', resolved);
 * }
 * 
 * // Atau resolve dengan nilai custom
 * const resolvedCustom = resolveConflictWithCustomValue(
 *   kasRiilConflict,
 *   27720000, // Nilai rata-rata
 *   'Admin',
 *   'Diambil rata-rata setelah klarifikasi ke lapangan'
 * );
 */
