import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { BukuKas, ArsipBukti, PosKewajiban, AuditLog, Tanah, Beko, NotaMaterial } from './types';
import {
  initialBukuKas, initialArsipBukti, initialPosKewajiban,
  initialAuditLog, initialTanah, initialBeko, initialNotaMaterial
} from './data';

interface AppState {
  bukuKas: BukuKas[];
  arsipBukti: ArsipBukti[];
  posKewajiban: PosKewajiban[];
  auditLog: AuditLog[];
  tanah: Tanah[];
  beko: Beko[];
  notaMaterial: NotaMaterial[];
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
  | { type: 'ADD_AUDIT_LOG'; payload: AuditLog };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_BUKU_KAS':
      return { ...state, bukuKas: [...state.bukuKas, action.payload] };
    case 'UPDATE_BUKU_KAS':
      return { ...state, bukuKas: state.bukuKas.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_ARSIP_BUKTI':
      return { ...state, arsipBukti: [...state.arsipBukti, action.payload] };
    case 'UPDATE_ARSIP_BUKTI':
      return { ...state, arsipBukti: state.arsipBukti.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_POS_KEWAJIBAN':
      return { ...state, posKewajiban: [...state.posKewajiban, action.payload] };
    case 'UPDATE_POS_KEWAJIBAN':
      return { ...state, posKewajiban: state.posKewajiban.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_TANAH':
      return { ...state, tanah: [...state.tanah, action.payload] };
    case 'UPDATE_TANAH':
      return { ...state, tanah: state.tanah.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_BEKO':
      return { ...state, beko: [...state.beko, action.payload] };
    case 'UPDATE_BEKO':
      return { ...state, beko: state.beko.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_NOTA':
      return { ...state, notaMaterial: [...state.notaMaterial, action.payload] };
    case 'UPDATE_NOTA':
      return { ...state, notaMaterial: state.notaMaterial.map(item => item.id === action.payload.id ? action.payload : item) };
    case 'ADD_AUDIT_LOG':
      return { ...state, auditLog: [...state.auditLog, action.payload] };
    default:
      return state;
  }
}

const initialState: AppState = {
  bukuKas: initialBukuKas,
  arsipBukti: initialArsipBukti,
  posKewajiban: initialPosKewajiban,
  auditLog: initialAuditLog,
  tanah: initialTanah,
  beko: initialBeko,
  notaMaterial: initialNotaMaterial,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
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
