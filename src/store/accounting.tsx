import React, { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from 'react';
import { persistWorkspaceSlice } from '../lib/googleBackend';
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

function loadInitialState(saved?: Partial<AccountingState>): AccountingState {
  const emptyState: AccountingState = { akun: initialAkun, jurnal: [], invoice: [], purchaseOrder: [], rab: [], schedule: [] };
  if (saved) {
    return {
      akun: Array.isArray(saved.akun) ? saved.akun : initialAkun,
      jurnal: Array.isArray(saved.jurnal) ? saved.jurnal : [],
      invoice: Array.isArray(saved.invoice) ? saved.invoice : [],
      purchaseOrder: Array.isArray(saved.purchaseOrder) ? saved.purchaseOrder : [],
      rab: Array.isArray(saved.rab) ? saved.rab : [],
      schedule: Array.isArray(saved.schedule) ? saved.schedule : [],
    };
  }
  // Development fallback only. Production authentication always passes the cloud snapshot.
  if (typeof window === 'undefined') return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const local = JSON.parse(raw) as Partial<AccountingState>;
    const validAccounts = Array.isArray(local.akun) && local.akun.every(a => a && typeof a.kode === 'string' && typeof a.tipe === 'string');
    return {
      akun: validAccounts && local.akun!.length > 0 ? local.akun! : initialAkun,
      jurnal: Array.isArray(local.jurnal) ? local.jurnal : [],
      invoice: Array.isArray(local.invoice) ? local.invoice : [],
      purchaseOrder: Array.isArray(local.purchaseOrder) ? local.purchaseOrder : [],
      rab: Array.isArray(local.rab) ? local.rab : [],
      schedule: Array.isArray(local.schedule) ? local.schedule : [],
    };
  } catch (error) {
    console.error('Data akuntansi lokal lama tidak terbaca; pulihkan dari backup jika masih diperlukan.', error);
    return emptyState;
  }
}

const AccountingContext = createContext<{
  state: AccountingState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AccountingProvider({ children, initialState }: { children: ReactNode; initialState?: Partial<AccountingState> }) {
  const [state, dispatch] = useReducer(accountingReducer, initialState, initial => loadInitialState(initial));
  const previousSerialized = useRef<string | null>(null);

  useEffect(() => {
    const serialized = JSON.stringify(state);
    if (previousSerialized.current === null) {
      previousSerialized.current = serialized;
      return;
    }
    if (previousSerialized.current === serialized) return;
    previousSerialized.current = serialized;
    void persistWorkspaceSlice('accounting', state).catch(() => undefined);
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
