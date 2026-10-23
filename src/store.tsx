import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { BukuKas, ArsipBukti, PosKewajiban, AuditLog, Tanah, Beko, NotaMaterial, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas, OCRResult, WhatsAppLog, MenuItem, QCRecord, AssetRecord, TaxRecord, HousingUnit } from './types';
import {
  initialBukuKas, initialArsipBukti, initialPosKewajiban,
  initialAuditLog, initialTanah, initialBeko, initialNotaMaterial,
  initialStok, initialProduksi, initialPenjualan, initialPembelian,
  initialPenggajian, initialAnggaran, initialArusKas, initialOCR,
  initialWhatsApp, initialMenuConfig
} from './data';

interface AppState {
  bukuKas: BukuKas[];
  arsipBukti: ArsipBukti[];
  posKewajiban: PosKewajiban[];
  auditLog: AuditLog[];
  tanah: Tanah[];
  beko: Beko[];
  notaMaterial: NotaMaterial[];
  stok: StokBarang[];
  produksi: Produksi[];
  penjualan: Penjualan[];
  pembelian: Pembelian[];
  penggajian: Penggajian[];
  anggaran: Anggaran[];
  arusKas: ArusKas[];
  ocr: OCRResult[];
  whatsapp: WhatsAppLog[];
  menuConfig: MenuItem[];
  qcRecords: QCRecord[];
  assets: AssetRecord[];
  taxRecords: TaxRecord[];
  housingUnits: HousingUnit[];
}

type Action =
  | { type: 'ADD_BUKU_KAS'; payload: BukuKas }
  | { type: 'UPDATE_BUKU_KAS'; payload: BukuKas }
  | { type: 'ADD_ARSIP_BUKTI'; payload: ArsipBukti }
  | { type: 'UPDATE_ARSIP_BUKTI'; payload: ArsipBukti }
  | { type: 'ADD_POS_KEWAJIBAN'; payload: PosKewajiban }
  | { type: 'UPDATE_POS_KEWAJIBAN'; payload: PosKewajiban }
  | { type: 'ADD_TANAH'; payload: Tanah }
  | { type: 'UPDATE_TANAH'; payload: Tanah }
  | { type: 'ADD_BEKO'; payload: Beko }
  | { type: 'UPDATE_BEKO'; payload: Beko }
  | { type: 'ADD_NOTA'; payload: NotaMaterial }
  | { type: 'UPDATE_NOTA'; payload: NotaMaterial }
  | { type: 'ADD_STOK'; payload: StokBarang }
  | { type: 'UPDATE_STOK'; payload: StokBarang }
  | { type: 'ADD_PRODUKSI'; payload: Produksi }
  | { type: 'UPDATE_PRODUKSI'; payload: Produksi }
  | { type: 'ADD_PENJUALAN'; payload: Penjualan }
  | { type: 'UPDATE_PENJUALAN'; payload: Penjualan }
  | { type: 'ADD_PEMBELIAN'; payload: Pembelian }
  | { type: 'UPDATE_PEMBELIAN'; payload: Pembelian }
  | { type: 'ADD_PENGGAJIAN'; payload: Penggajian }
  | { type: 'UPDATE_PENGGAJIAN'; payload: Penggajian }
  | { type: 'ADD_ANGGARAN'; payload: Anggaran }
  | { type: 'UPDATE_ANGGARAN'; payload: Anggaran }
  | { type: 'ADD_ARUS_KAS'; payload: ArusKas }
  | { type: 'ADD_OCR'; payload: OCRResult }
  | { type: 'UPDATE_OCR'; payload: OCRResult }
  | { type: 'ADD_WHATSAPP'; payload: WhatsAppLog }
  | { type: 'UPDATE_MENU'; payload: MenuItem }
  | { type: 'ADD_AUDIT_LOG'; payload: AuditLog }
  | { type: 'ADD_QC_RECORD'; payload: QCRecord }
  | { type: 'UPDATE_QC_RECORD'; payload: QCRecord }
  | { type: 'ADD_ASSET'; payload: AssetRecord }
  | { type: 'UPDATE_ASSET'; payload: AssetRecord }
  | { type: 'ADD_TAX_RECORD'; payload: TaxRecord }
  | { type: 'UPDATE_TAX_RECORD'; payload: TaxRecord }
  | { type: 'ADD_HOUSING_UNIT'; payload: HousingUnit }
  | { type: 'UPDATE_HOUSING_UNIT'; payload: HousingUnit };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_BUKU_KAS': return { ...state, bukuKas: [...state.bukuKas, action.payload] };
    case 'UPDATE_BUKU_KAS': return { ...state, bukuKas: state.bukuKas.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_ARSIP_BUKTI': return { ...state, arsipBukti: [...state.arsipBukti, action.payload] };
    case 'UPDATE_ARSIP_BUKTI': return { ...state, arsipBukti: state.arsipBukti.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_POS_KEWAJIBAN': return { ...state, posKewajiban: [...state.posKewajiban, action.payload] };
    case 'UPDATE_POS_KEWAJIBAN': return { ...state, posKewajiban: state.posKewajiban.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_TANAH': return { ...state, tanah: [...state.tanah, action.payload] };
    case 'UPDATE_TANAH': return { ...state, tanah: state.tanah.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_BEKO': return { ...state, beko: [...state.beko, action.payload] };
    case 'UPDATE_BEKO': return { ...state, beko: state.beko.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_NOTA': return { ...state, notaMaterial: [...state.notaMaterial, action.payload] };
    case 'UPDATE_NOTA': return { ...state, notaMaterial: state.notaMaterial.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_STOK': return { ...state, stok: [...state.stok, action.payload] };
    case 'UPDATE_STOK': return { ...state, stok: state.stok.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_PRODUKSI': return { ...state, produksi: [...state.produksi, action.payload] };
    case 'UPDATE_PRODUKSI': return { ...state, produksi: state.produksi.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_PENJUALAN': return { ...state, penjualan: [...state.penjualan, action.payload] };
    case 'UPDATE_PENJUALAN': return { ...state, penjualan: state.penjualan.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_PEMBELIAN': return { ...state, pembelian: [...state.pembelian, action.payload] };
    case 'UPDATE_PEMBELIAN': return { ...state, pembelian: state.pembelian.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_PENGGAJIAN': return { ...state, penggajian: [...state.penggajian, action.payload] };
    case 'UPDATE_PENGGAJIAN': return { ...state, penggajian: state.penggajian.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_ANGGARAN': return { ...state, anggaran: [...state.anggaran, action.payload] };
    case 'UPDATE_ANGGARAN': return { ...state, anggaran: state.anggaran.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_ARUS_KAS': return { ...state, arusKas: [...state.arusKas, action.payload] };
    case 'ADD_OCR': return { ...state, ocr: [...state.ocr, action.payload] };
    case 'UPDATE_OCR': return { ...state, ocr: state.ocr.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_WHATSAPP': return { ...state, whatsapp: [...state.whatsapp, action.payload] };
    case 'UPDATE_MENU': return { ...state, menuConfig: state.menuConfig.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_AUDIT_LOG': return { ...state, auditLog: [...state.auditLog, action.payload] };
    case 'ADD_QC_RECORD': return { ...state, qcRecords: [...state.qcRecords, action.payload] };
    case 'UPDATE_QC_RECORD': return { ...state, qcRecords: state.qcRecords.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_ASSET': return { ...state, assets: [...state.assets, action.payload] };
    case 'UPDATE_ASSET': return { ...state, assets: state.assets.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_TAX_RECORD': return { ...state, taxRecords: [...state.taxRecords, action.payload] };
    case 'UPDATE_TAX_RECORD': return { ...state, taxRecords: state.taxRecords.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_HOUSING_UNIT': return { ...state, housingUnits: [...state.housingUnits, action.payload] };
    case 'UPDATE_HOUSING_UNIT': return { ...state, housingUnits: state.housingUnits.map(item => item.id === action.payload.id ? action.payload : item) };
    default: return state;
  }
}

const seedState: AppState = {
  bukuKas: initialBukuKas,
  arsipBukti: initialArsipBukti,
  posKewajiban: initialPosKewajiban,
  auditLog: initialAuditLog,
  tanah: initialTanah,
  beko: initialBeko,
  notaMaterial: initialNotaMaterial,
  stok: initialStok,
  produksi: initialProduksi,
  penjualan: initialPenjualan,
  pembelian: initialPembelian,
  penggajian: initialPenggajian,
  anggaran: initialAnggaran,
  arusKas: initialArusKas,
  ocr: initialOCR,
  whatsapp: initialWhatsApp,
  menuConfig: initialMenuConfig,
  qcRecords: [],
  assets: [],
  taxRecords: [],
  housingUnits: [],
};

const APP_STORAGE_KEY = 'abiedien.erp.app.v1';

function hasEvidenceDocument(document: ArsipBukti): boolean {
  return Boolean(
    document.local_file_key ||
    (document.link_drive && /^https?:\/\//i.test(document.link_drive))
  );
}

function loadAppState(): AppState {
  if (typeof window === 'undefined') return seedState;
  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return seedState;
    const saved = JSON.parse(raw) as Partial<AppState>;
    const arrays = [
      'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
      'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
      'anggaran', 'arusKas', 'ocr', 'whatsapp', 'menuConfig', 'qcRecords', 'assets', 'taxRecords', 'housingUnits'
    ] as const;

    const result = { ...seedState } as AppState;
    for (const key of arrays) {
      const value = saved[key];
      if (Array.isArray(value)) (result as any)[key] = value;
    }

    // Migrate old localStorage seeds that claimed proof/status without an attached file or URL.
    // Remove only unchanged demo records from older browser storage. If a user altered a row,
    // keep it for review rather than deleting their work. Fresh installs no longer seed these records.
    result.stok = result.stok.filter(item => !(
      (item.id === 'STK-001' && item.kode === 'BB-001' && item.nama === 'Semen Portland 50kg' && item.stok_awal === 100 && item.masuk === 50 && item.keluar === 80 && item.harga_pokok === 65000) ||
      (item.id === 'STK-002' && item.kode === 'BB-002' && item.nama === 'Pasir Pasang' && item.stok_awal === 10 && item.masuk === 5 && item.keluar === 8 && item.harga_pokok === 800000) ||
      (item.id === 'STK-003' && item.kode === 'BB-003' && item.nama === 'Besi Beton 10mm' && item.stok_awal === 200 && item.masuk === 100 && item.keluar === 150 && item.harga_pokok === 85000) ||
      (item.id === 'STK-004' && item.kode === 'BJ-001' && item.nama === 'Rumah Type 36' && item.stok_awal === 0 && item.masuk === 2 && item.keluar === 1 && item.harga_pokok === 250000000) ||
      (item.id === 'STK-005' && item.kode === 'BD-001' && item.nama === 'Keramik 40x40' && item.stok_awal === 50 && item.masuk === 30 && item.keluar === 40 && item.harga_pokok === 120000)
    ));
    result.produksi = result.produksi.filter(item => !(
      (item.id === 'PRD-001' && item.no_produksi === 'SPK-2024-001' && item.tanggal === '2024-01-10' && item.produk === 'Rumah Type 36') ||
      (item.id === 'PRD-002' && item.no_produksi === 'SPK-2024-002' && item.tanggal === '2024-02-01' && item.produk === 'Rumah Type 36')
    ));
    result.penjualan = result.penjualan.filter(item => !(
      (item.id === 'PJ-001' && item.no_invoice === 'INV-2024-001' && item.pelanggan === 'Budi Santoso' && item.tanggal === '2024-02-15') ||
      (item.id === 'PJ-002' && item.no_invoice === 'INV-2024-002' && item.pelanggan === 'Ahmad Wijaya' && item.tanggal === '2024-03-01')
    ));
    result.pembelian = result.pembelian.filter(item => !(
      (item.id === 'PB-001' && item.no_po === 'PO-2024-001' && item.supplier === 'PT Semen Indonesia' && item.tanggal === '2024-01-05') ||
      (item.id === 'PB-002' && item.no_po === 'PO-2024-002' && item.supplier === 'Toko Besi Jaya' && item.tanggal === '2024-01-20')
    ));
    result.penggajian = result.penggajian.filter(item => !(
      (item.id === 'GJ-001' && item.nip === 'EMP-001' && item.nama === 'Budi Hermawan' && item.periode === '2024-03') ||
      (item.id === 'GJ-002' && item.nip === 'EMP-002' && item.nama === 'Sri Wahyuni' && item.periode === '2024-03') ||
      (item.id === 'GJ-003' && item.nip === 'EMP-003' && item.nama === 'Agus Prasetyo' && item.periode === '2024-03')
    ));
    result.anggaran = result.anggaran.filter(item => !(
      (item.id === 'AG-001' && item.periode === '2024' && item.kategori === 'Pembebasan Tanah' && item.anggaran === 500000000 && item.realisasi === 309400000) ||
      (item.id === 'AG-002' && item.periode === '2024' && item.kategori === 'Cut & Fill (Beko)' && item.anggaran === 200000000 && item.realisasi === 71350000) ||
      (item.id === 'AG-003' && item.periode === '2024' && item.kategori === 'Material & Perlengkapan' && item.anggaran === 150000000 && item.realisasi === 13596000) ||
      (item.id === 'AG-004' && item.periode === '2024' && item.kategori === 'Tenaga Kerja' && item.anggaran === 120000000 && item.realisasi === 22820000)
    ));
    result.ocr = result.ocr.filter(item => !(
      (item.id === 'OCR-001' && /drive\.google\.com\/file\/d\/xxx1/.test(item.image_url)) ||
      (item.id === 'OCR-002' && /drive\.google\.com\/file\/d\/xxx2/.test(item.image_url)) ||
      (item.id === 'OCR-003' && item.confidence === 45 && item.status === 'Pending')
    ));
    result.whatsapp = result.whatsapp.filter(item => !(
      item.id === 'WA-001' || item.id === 'WA-002' || item.id === 'WA-003'
    ));
    result.auditLog = result.auditLog.filter(item => !(item.id === 'LOG-001' && item.record_id === 'AR-001' && item.aksi === 'CREATE'));

    result.arsipBukti = result.arsipBukti.map(document => {
      const hasExternalEvidence = Boolean(document.link_drive && /^https?:\/\//i.test(document.link_drive));
      const hasRealLocalEvidence = Boolean(
        document.local_file_key &&
        !String(document.mime_type || '').toLowerCase().startsWith('text/html') &&
        !String(document.nama_file || '').toLowerCase().endsWith('.html')
      );
      const hasEvidence = hasExternalEvidence || hasRealLocalEvidence;
      const oldBekoStage = /^DBK-0[1-6]$/.test(document.id) && !hasEvidence;
      const stageNumber = oldBekoStage ? document.id.slice(-2) : '';
      return {
        ...document,
        ...(oldBekoStage ? {
          jenis: 'Tidak_Ada' as const,
          judul_dokumen: 'Rekap biaya beko tahap ' + Number(stageNumber) + ' (bukti asli belum dilampirkan)',
          modul_terkait: 'Beko' as const,
          id_terkait: 'BK-' + stageNumber,
          catatan_audit: 'Metadata rekap lama; bukan kuitansi asli. Bukti belum dilampirkan.'
        } : {}),
        ...(document.terverifikasi === 'Ya' && !hasEvidence ? { terverifikasi: 'Perlu_Konfirmasi' as const } : {})
      };
    });
    result.notaMaterial = result.notaMaterial.map(note =>
      note.status === 'Terverifikasi' && !note.url_bukti
        ? { ...note, status: 'Belum_Verifikasi' }
        : note
    );
    result.posKewajiban = result.posKewajiban.map(item => {
      const linkedId = item.tanah_id || (
        item.id === 'UT-01' ? 'T-07' :
        item.id === 'UT-02' ? 'T-11' :
        item.id === 'UT-03' ? 'T-13' : ''
      );
      return linkedId && result.tanah.some(land => land.id === linkedId)
        ? { ...item, tanah_id: linkedId }
        : item;
    });
    result.tanah = result.tanah.map(land => {
      // Seed v1 stored the 23-BT Pak Dede lot at 750,000/BT but the recorded paid
      // amount and old audited contract total point to 500,000/BT. Migrate only
      // this unchanged legacy row; never overwrite a later user edit.
      if (land.id === 'T-03' && land.pemilik === 'Pak Dede' && land.luas_bt === 23 &&
          land.harga_per_bt === 750000 && land.dp === 11500000 && land.catatan === 'Bidang 3') {
        return { ...land, harga_per_bt: 500000 };
      }
      if (land.luas_bt === 0 && land.harga_per_bt === 0 && !land.nilai_total_manual) {
        return {
          ...land,
          status: land.dp > 0 ? 'DP' : 'Belum_Bayar',
          catatan: (land.catatan || '') + (land.catatan?.includes('nilai kesepakatan harus dicek') ? '' : ' — nilai kontrak belum diketahui; cek perjanjian asli')
        };
      }
      return land;
    });
    result.beko = result.beko.map(item => {
      const legacyScope = /^BK-0[1-8]$/.test(item.id) && item.termasuk_rekap === undefined;
      const legacyUnit = item.id === 'BK-01' ? 'ls'
        : item.id === 'BK-02' ? 'unit'
          : /^BK-0[3-8]$/.test(item.id) ? 'm3'
            : undefined;
      return {
        ...item,
        ...(item.id === 'BK-01' && item.item === 'Mobilisasi' && item.panjang === 0 &&
          item.lebar === 0 && item.tinggi === 0 && item.tarif === 0
          ? { tarif: 4500000 }
          : {}),
        ...(legacyScope ? { termasuk_rekap: !['BK-07', 'BK-08'].includes(item.id) } : {}),
        ...(item.satuan_volume === undefined && legacyUnit ? { satuan_volume: legacyUnit as 'm3' | 'unit' | 'ls' } : {}),
        ...(item.status_pembayaran === undefined
          ? { status_pembayaran: item.status === 'Lunas' ? 'Lunas' as const : 'Belum_Dikonfirmasi' as const }
          : {})
      };
    });
    // The former arusKas array duplicated bukuKas; the cashbook is now the only source.
    if (result.arusKas.every((item, index) => item.id === 'AK-0' + (index + 1))) result.arusKas = [];
    result.bukuKas = result.bukuKas.map(transaction => {
      const matchingDocument = result.arsipBukti.some(document =>
        hasEvidenceDocument(document) &&
        document.terverifikasi === 'Ya' &&
        (document.id_terkait === transaction.id ||
          (Boolean(transaction.kode_bukti) && document.kode_bukti === transaction.kode_bukti))
      );
      return transaction.status_verifikasi === 'LENGKAP' && !matchingDocument
        ? { ...transaction, status_verifikasi: 'PERLU_KONFIRMASI' }
        : transaction;
    });
    return result;
  } catch (error) {
    console.error('Data ERP lokal tidak dapat dibaca; menggunakan data awal yang tersedia.', error);
    return seedState;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadAppState);

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Gagal menyimpan data ERP ke browser. Buat backup JSON sesegera mungkin.', error);
    }
  }, [state]);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
