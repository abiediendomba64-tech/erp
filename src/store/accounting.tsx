import React, { createContext, useContext, useEffect, useReducer, useEffect, useRef, ReactNode } from 'react';
import { persistWorkspaceSnapshot } from '../lib/workspaceBackend';
import { Akun, JurnalUmum, Invoice, PurchaseOrder, RAB, Schedule } from '../types/accounting';
import { initialAkun } from '../data/accounting';

interface AccountingState {
  akun: Akun[];
  jurnal: JurnalUmum[];
  invoice: Invoice[];
  purchaseOrder: PurchaseOrder[];
  rab: RAB[];
  schedule: Schedule[];
}

type Action =
  | { type: 'ADD_JURNAL'; payload: JurnalUmum }
  | { type: 'UPDATE_JURNAL'; payload: JurnalUmum }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'UPDATE_INVOICE'; payload: Invoice }
  | { type: 'ADD_PO'; payload: PurchaseOrder }
  | { type: 'UPDATE_PO'; payload: PurchaseOrder }
  | { type: 'ADD_RAB'; payload: RAB }
  | { type: 'UPDATE_RAB'; payload: RAB }
  | { type: 'ADD_SCHEDULE'; payload: Schedule }
  | { type: 'UPDATE_SCHEDULE'; payload: Schedule }
  | { type: 'UPDATE_AKUN_SALDO'; payload: { kode: string; saldo: number } };

function accountingReducer(state: AccountingState, action: Action): AccountingState {
  switch (action.type) {
    case 'ADD_JURNAL':
      return { ...state, jurnal: [...state.jurnal, action.payload] };
    case 'UPDATE_JURNAL':
      return { ...state, jurnal: state.jurnal.map(j => j.id === action.payload.id ? action.payload : j) };
    case 'ADD_INVOICE':
      return { ...state, invoice: [...state.invoice, action.payload] };
    case 'UPDATE_INVOICE':
      return { ...state, invoice: state.invoice.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_PO':
      return { ...state, purchaseOrder: [...state.purchaseOrder, action.payload] };
    case 'UPDATE_PO':
      return { ...state, purchaseOrder: state.purchaseOrder.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'ADD_RAB':
      return { ...state, rab: [...state.rab, action.payload] };
    case 'UPDATE_RAB':
      return { ...state, rab: state.rab.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'ADD_SCHEDULE':
      return { ...state, schedule: [...state.schedule, action.payload] };
    case 'UPDATE_SCHEDULE':
      return { ...state, schedule: state.schedule.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'UPDATE_AKUN_SALDO':
      return {
        ...state,
        akun: state.akun.map(a => a.kode === action.payload.kode ? { ...a, saldo: action.payload.saldo } : a)
      };
    default:
      return state;
  }
}

const STORAGE_KEY = 'abiedien.erp.accounting.v1';

function loadInitialState(): AccountingState {
  const emptyState: AccountingState = {
    akun: initialAkun,
    jurnal: [],
    invoice: [],
    purchaseOrder: [],
    rab: [],
    schedule: [],
  };

  if (typeof window === 'undefined') return emptyState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const saved = JSON.parse(raw) as Partial<AccountingState>;
    const accountsAreValid = Array.isArray(saved.akun) &&
      saved.akun.every((account) => account && typeof account.kode === 'string' && typeof account.tipe === 'string');

    return {
      akun: accountsAreValid && saved.akun!.length > 0 ? saved.akun! : initialAkun,
      jurnal: Array.isArray(saved.jurnal) ? saved.jurnal : [],
      invoice: Array.isArray(saved.invoice) ? saved.invoice : [],
      purchaseOrder: Array.isArray(saved.purchaseOrder) ? saved.purchaseOrder : [],
      rab: Array.isArray(saved.rab) ? saved.rab.filter((record: RAB) => !(
        record.id === 'RAB-001' &&
        record.nama_proyek === 'Pembangunan Gudang' &&
        record.tanggal === '2026-01-01' &&
        record.total_biaya === 23000000 &&
        record.items?.length === 5 &&
        record.items[0]?.deskripsi === 'Semen'
      )) : [],
      schedule: Array.isArray(saved.schedule) ? saved.schedule : [],
    };
  } catch (error) {
    console.error('Tidak dapat membaca data akuntansi tersimpan; menggunakan data kosong.', error);
    return emptyState;
  }
}



const AccountingContext = createContext<{
  state: AccountingState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(accountingReducer, undefined, loadInitialState);

  const previousSerialized = useRef<string | null>(null);

  useEffect(() => {
    const serialized = JSON.stringify(state);
    let previousCache: string | null = null;
    try {
      previousCache = window.localStorage.getItem(STORAGE_KEY);
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Cache browser akuntansi tidak dapat ditulis. Data cloud tetap menjadi sumber utama.', error);
    }

    if (previousSerialized.current === null) {
      previousSerialized.current = serialized;
      if (previousCache !== serialized) {
        void persistWorkspaceSnapshot('accounting', state).catch(() => undefined);
      }
      return;
    }
    if (previousSerialized.current === serialized) return;
    previousSerialized.current = serialized;
    void persistWorkspaceSnapshot('accounting', state).catch(() => undefined);
  }, [state]);
  return (
    <AccountingContext.Provider value={{ state, dispatch }}>
      {children}
    </AccountingContext.Provider>
  );
}

export function useAccounting() {
  const context = useContext(AccountingContext);
  if (!context) throw new Error('useAccounting must be used within AccountingProvider');
  return context;
}
