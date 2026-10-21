import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { BukuKas, ArsipBukti, PosKewajiban, AuditLog, Tanah, Beko, NotaMaterial, StokBarang, Produksi, Penjualan, Pembelian, Penggajian, Anggaran, ArusKas, OCRResult, WhatsAppLog, MenuItem } from './types';
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
  | { type: 'ADD_AUDIT_LOG'; payload: AuditLog };

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
};

const APP_STORAGE_KEY = 'abiedien.erp.app.v1';

function loadAppState(): AppState {
  if (typeof window === 'undefined') return seedState;
  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return seedState;
    const saved = JSON.parse(raw) as Partial<AppState>;
    const arrays = [
      'bukuKas', 'arsipBukti', 'posKewajiban', 'auditLog', 'tanah', 'beko',
      'notaMaterial', 'stok', 'produksi', 'penjualan', 'pembelian', 'penggajian',
      'anggaran', 'arusKas', 'ocr', 'whatsapp', 'menuConfig'
    ] as const;

    const result = { ...seedState } as AppState;
    for (const key of arrays) {
      const value = saved[key];
      if (Array.isArray(value)) (result as any)[key] = value;
    }
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
