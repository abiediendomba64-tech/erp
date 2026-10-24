import { FormEvent, useEffect, useState } from 'react';
import { Cloud, Database, LoaderCircle, LogIn, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import {
  FirebaseSession, UserWorkspace, getSavedSession, isFirebaseConfigured, listUserWorkspaces,
  sendPasswordReset, signIn, signOut, signUp,
} from '../lib/firebaseRest';
import { ACCOUNTING_MODULES, OPERATIONAL_MODULES, createEmptyWorkspaceSnapshot, readLocalWorkspaceSnapshot } from '../lib/initialWorkspace';
import { clearWorkspaceSession, getCloudStatus, subscribeCloudStatus, switchToWorkspace, createWorkspace } from '../lib/workspaceBackend';
import type { CloudStatus } from '../lib/workspaceBackend';
import App from '../App';

const ALL_MODULES = [...OPERATIONAL_MODULES, ...ACCOUNTING_MODULES] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Permintaan gagal. Periksa koneksi atau konfigurasi Firebase.';
}

function ConfigurationHelp() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <section className="max-w-xl w-full rounded-2xl border border-amber-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Database size={28} className="text-amber-600" />
          <h1 className="text-xl font-bold text-slate-900">Backend Firebase belum dikonfigurasi</h1>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Aplikasi tidak membuka data browser sebagai pengganti database cloud. Siapkan Firebase project aktif,
          aktifkan Email/Password Authentication, buat Firestore Database, dan publikasikan firestore.rules.
        </p>
        <pre className="text-xs bg-slate-900 text-white p-4 rounded-lg overflow-x-auto">{'VITE_FIREBASE_API_KEY=your_web_api_key\nVITE_FIREBASE_PROJECT_ID=your_project_id'}</pre>
        <p className="text-xs text-slate-500 mt-4">Langkah lengkap: docs/ERP_FIREBASE_SETUP.md. Jangan simpan private key Admin SDK dalam frontend.</p>
      </section>
    </div>
  );
}

function AuthForm({ onAuthenticated }: { onAuthenticated: (session: FirebaseSession) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const normalized = email.trim().toLowerCase();
      if (!normalized) throw new Error('Email wajib diisi.');
      if (mode !== 'reset' && password.length < 8) throw new Error('Kata sandi minimal 8 karakter.');
      if (mode === 'reset') {
        await sendPasswordReset(normalized);
        setNotice('Jika email terdaftar, instruksi pemulihan akan dikirim.');
        setMode('login');
        return;
      }
      const session = mode === 'signup'
        ? await signUp(normalized, password)
        : await signIn(normalized, password);
      await onAuthenticated(session);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <section className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-7">
          <div className="rounded-xl bg-indigo-600 p-3 text-white"><ShieldCheck size={25} /></div>
          <div><h1 className="text-xl font-bold text-slate-900">ERP Operasional</h1><p className="text-sm text-slate-500">Login cloud Firebase</p></div>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === 'login' ? 'Masuk ke akun' : mode === 'signup' ? 'Buat akun' : 'Pulihkan kata sandi'}
        </h2>
        <p className="text-sm text-slate-500 mt-1 mb-5">Data hanya dimuat dari workspace cloud yang memperbolehkan akun ini.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Email
            <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="nama@perusahaan.co.id" />
          </label>
          {mode !== 'reset' && <label className="block text-sm font-medium text-slate-700">Kata sandi
            <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8}
              required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Minimal 8 karakter" />
          </label>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          <button disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
            {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : mode === 'signup' ? 'Daftar' : 'Kirim instruksi reset'}
          </button>
        </form>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {mode !== 'login' && <button onClick={() => { setMode('login'); setError(''); setNotice(''); }} className="text-indigo-700 hover:underline">Kembali ke login</button>}
          {mode === 'login' && <button onClick={() => { setMode('signup'); setError(''); setNotice(''); }} className="text-indigo-700 hover:underline">Buat akun</button>}
          {mode === 'login' && <button onClick={() => { setMode('reset'); setError(''); setNotice(''); }} className="text-slate-600 hover:underline">Lupa kata sandi?</button>}
        </div>
      </section>
    </div>
  );
}

function CreateWorkspacePanel({ session, localDataExists, busy, error, onCreate, onLogout, onRefreshMembership }: {
  session: FirebaseSession;
  localDataExists: boolean;
  busy: boolean;
  error: string;
  onCreate: (name: string, mode: 'empty' | 'import') => Promise<void>;
  onLogout: () => void;
  onRefreshMembership: () => Promise<void>;
}) {
  const [name, setName] = useState('ERP Proyek');
  const [mode, setMode] = useState<'empty' | 'import'>('empty');
  const [formError, setFormError] = useState('');
  const submit = async () => {
    setFormError('');
    if (name.trim().length < 2 || name.trim().length > 100) {
      setFormError('Nama workspace harus 2-100 karakter.');
      return;
    }
    try { await onCreate(name, mode); } catch (e) { setFormError(errorMessage(e)); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <section className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-5"><Cloud size={28} className="text-indigo-600" /><h1 className="text-xl font-bold text-slate-900">Siapkan workspace cloud</h1></div>
        <p className="text-sm text-slate-600 mb-5">Login sebagai {session.email}. Pilih membuat database ERP baru atau mengimpor data browser secara eksplisit.</p>
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">Firebase UID akun Anda</p>
          <code className="mt-1 block break-all text-xs text-slate-600">{session.localId}</code>
          <p className="mt-1 text-xs text-slate-500">Bagikan UID ini kepada pemilik workspace jika Anda perlu ditambahkan ke workspace yang sudah ada.</p>
          <button onClick={() => void navigator.clipboard?.writeText(session.localId)} className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs">Salin UID</button>
          <button disabled={busy} onClick={() => void onRefreshMembership()} className="ml-2 mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50">Periksa akses workspace</button>
        </div>
        <label className="block text-sm font-medium text-slate-700">Nama workspace
          <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <div className="mt-5 space-y-3">
          <label className={`flex gap-3 rounded-xl border p-3 ${mode === 'empty' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
            <input type="radio" checked={mode === 'empty'} onChange={() => setMode('empty')} />
            <span><strong className="block text-sm">Workspace kosong</strong><span className="text-xs text-slate-600">Tidak mengunggah transaksi browser. Master akun dan menu standar tetap disiapkan.</span></span>
          </label>
          <label className={`flex gap-3 rounded-xl border p-3 ${localDataExists ? 'cursor-pointer' : 'opacity-50'} ${mode === 'import' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
            <input type="radio" disabled={!localDataExists} checked={mode === 'import'} onChange={() => setMode('import')} />
            <span><strong className="block text-sm">Impor localStorage browser ini</strong><span className="text-xs text-slate-600">Periksa backup sebelum impor: snapshot lama mungkin memuat data demo/legacy dan lampiran IndexedDB tidak ikut diunggah.</span></span>
          </label>
        </div>
        {(error || formError) && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || formError}</p>}
        <button disabled={busy || (mode === 'import' && !localDataExists)} onClick={() => void submit()} className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Menyiapkan workspace…' : mode === 'empty' ? 'Buat workspace kosong' : 'Impor snapshot ke cloud'}
        </button>
        <button disabled={busy} onClick={onLogout} className="mt-3 w-full text-sm text-slate-600 hover:underline">Keluar dari akun</button>
      </section>
    </div>
  );
}

function WorkspaceChooser({ workspaces, busy, error, onOpen, onLogout }: {
  workspaces: UserWorkspace[];
  busy: boolean;
  error: string;
  onOpen: (workspace: UserWorkspace) => Promise<void>;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <section className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-5"><Users size={27} className="text-indigo-600" /><h1 className="text-xl font-bold text-slate-900">Pilih workspace</h1></div>
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="space-y-3">
          {workspaces.map(workspace => (
            <button key={workspace.id} disabled={busy || workspace.status !== 'active'} onClick={() => void onOpen(workspace)}
              className="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">
              <span className="block font-semibold text-slate-900">{workspace.name}</span>
              <span className="block text-xs text-slate-500 mt-1">Role: {workspace.role} · Status: {workspace.status}</span>
              {workspace.status !== 'active' && <span className="block text-xs text-amber-700 mt-2">Workspace belum selesai diinisialisasi; tidak dibuka untuk mencegah data parsial.</span>}
            </button>
          ))}
        </div>
        {busy && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />Memuat data cloud…</p>}
        <button onClick={onLogout} className="mt-5 w-full text-sm text-slate-600 hover:underline">Keluar dari akun</button>
      </section>
    </div>
  );
}

function CloudStatusBadge({ status, onReload }: { status: CloudStatus; onReload: () => void }) {
  if (status.status === 'saved' || status.status === 'ready') return null;
  const isConflict = status.status === 'conflict';
  return (
    <div className={`fixed right-3 top-3 z-[100] max-w-sm rounded-xl border p-3 shadow-lg ${isConflict ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-red-300 bg-red-50 text-red-950'}`}>
      <div className="flex items-start gap-2"><Cloud size={18} className="mt-0.5 shrink-0" /><div className="min-w-0"><p className="text-sm font-semibold">{isConflict ? 'Konflik versi cloud' : status.status === 'saving' ? 'Menyimpan data' : 'Penyimpanan cloud gagal'}</p><p className="mt-1 text-xs break-words">{status.message}</p>
        {isConflict && <button onClick={onReload} className="mt-2 inline-flex items-center gap-1 rounded bg-amber-800 px-2 py-1 text-xs font-semibold text-white"><RefreshCw size={13} /> Muat ulang dari cloud</button>}
      </div></div>
    </div>
  );
}

export default function AuthGate() {
  const [session, setSession] = useState<FirebaseSession | null>(null);
  const [ready, setReady] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<UserWorkspace | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(getCloudStatus());
  const [localDataExists] = useState(() => typeof window !== 'undefined' && Boolean(
    window.localStorage.getItem('abiedien.erp.app.v1') ||
    window.localStorage.getItem('abiedien.erp.accounting.v1')
  ));

  useEffect(() => subscribeCloudStatus(setCloudStatus), []);

  async function loadAvailableWorkspaces(activeSession: FirebaseSession) {
    setWorkspaceError('');
    const available = await listUserWorkspaces(activeSession.localId);
    const active = available.filter(item => item.status === 'active');
    setWorkspaces(available);
    if (active.length === 1) {
      await openWorkspace(active[0]);
    }
  }

  async function openWorkspace(workspace: UserWorkspace) {
    if (workspace.status !== 'active') return;
    setWorkspaceBusy(true);
    setWorkspaceError('');
    try {
      await switchToWorkspace(workspace, ALL_MODULES);
      setActiveWorkspace(workspace);
    } catch (e) {
      setWorkspaceError(errorMessage(e));
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function afterAuth(authSession: FirebaseSession) {
    setSession(authSession);
    setWorkspaceBusy(true);
    setWorkspaceError('');
    try {
      await loadAvailableWorkspaces(authSession);
    } catch (e) {
      setWorkspaceError(errorMessage(e));
    } finally {
      setWorkspaceBusy(false);
      setReady(true);
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setReady(true);
      return;
    }
    let cancelled = false;
    async function boot() {
      const saved = getSavedSession();
      if (!saved) { if (!cancelled) setReady(true); return; }
      if (!cancelled) setSession(saved);
      try {
        await loadAvailableWorkspaces(saved);
        if (!cancelled) setSession(getSavedSession());
      } catch (e) {
        await signOut();
        clearWorkspaceSession();
        if (!cancelled) {
          setSession(null);
          setWorkspaceError(errorMessage(e));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void boot();
    return () => { cancelled = true; };
  }, []);

  async function handleCreateWorkspace(name: string, mode: 'empty' | 'import') {
    if (!session) throw new Error('Sesi login tidak tersedia.');
    setWorkspaceBusy(true);
    setWorkspaceError('');
    try {
      const snapshot = mode === 'import'
        ? readLocalWorkspaceSnapshot()
        : createEmptyWorkspaceSnapshot();
      if (!snapshot) throw new Error('Tidak ada snapshot lokal untuk diimpor.');
      const created = await createWorkspace(session.localId, session.email, name, snapshot);
      const selected = { ...created, status: 'active' as const };
      await openWorkspace(selected);
      setWorkspaces([selected]);
    } finally {
      setWorkspaceBusy(false);
    }
  }

  function handleLogout() {
    clearWorkspaceSession();
    setActiveWorkspace(null);
    setWorkspaces([]);
    setSession(null);
    setWorkspaceError('');
    void signOut();
  }

  function reloadCloud() {
    if (!activeWorkspace) return;
    const confirmed = window.confirm('Data lokal yang belum tersimpan akan diganti dengan versi cloud terbaru. Lanjutkan?');
    if (!confirmed) return;
    window.location.reload();
  }

  if (!isFirebaseConfigured) return <ConfigurationHelp />;
  if (!ready || workspaceBusy && !session) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600"><LoaderCircle className="animate-spin mr-2" size={19} />Memeriksa sesi dan workspace cloud…</div>;
  }
  if (!session) return <AuthForm onAuthenticated={afterAuth} />;
  if (activeWorkspace) {
    return <><App workspaceRole={activeWorkspace.role} workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name}
      onSignOut={handleLogout} onSwitchWorkspace={() => { setWorkspaceError(''); setActiveWorkspace(null); }} />
      <CloudStatusBadge status={cloudStatus} onReload={reloadCloud} /></>;
  }
  if (workspaces.some(item => item.status === 'active')) {
    return <WorkspaceChooser workspaces={workspaces} busy={workspaceBusy} error={workspaceError} onOpen={openWorkspace} onLogout={handleLogout} />;
  }
  return <CreateWorkspacePanel session={session} localDataExists={localDataExists} busy={workspaceBusy} error={workspaceError} onCreate={handleCreateWorkspace} onLogout={handleLogout} onRefreshMembership={async () => {
    setWorkspaceBusy(true);
    setWorkspaceError('');
    try {
      await loadAvailableWorkspaces(session);
      setSession(getSavedSession());
    } catch (e) {
      setWorkspaceError(errorMessage(e));
    } finally {
      setWorkspaceBusy(false);
    }
  }} />;
}
