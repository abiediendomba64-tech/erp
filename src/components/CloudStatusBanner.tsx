import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react';
import { CloudStatus, getCloudStatus, subscribeCloudStatus } from '../lib/googleErpApi';

export default function CloudStatusBanner() {
  const [state, setState] = useState<CloudStatus>(getCloudStatus());

  useEffect(() => subscribeCloudStatus(setState), []);

  const color = state.status === 'saved'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : state.status === 'saving'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : state.status === 'conflict' || state.status === 'error'
        ? 'border-amber-300 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  const Icon = state.status === 'saved' ? CheckCircle2
    : state.status === 'saving' ? LoaderCircle
      : state.status === 'error' || state.status === 'conflict' ? AlertTriangle
        : CloudOff;

  return (
    <div className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${color}`} role="status" aria-live="polite">
      <Icon size={18} className={state.status === 'saving' ? 'animate-spin shrink-0' : 'shrink-0'} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{state.status === 'saved' ? 'Cloud tersimpan' : state.status === 'saving' ? 'Menyimpan cloud' : state.status === 'conflict' ? 'Konflik data' : state.status === 'error' ? 'Periksa penyimpanan' : 'Status cloud'}</div>
        <div>{state.message}{state.version !== null ? ` (versi ${state.version})` : ''}</div>
        {(state.status === 'error' || state.status === 'conflict') && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs">Sebelum memuat ulang, unduh backup JSON lokal di Pengaturan bila perlu menyimpan perubahan yang belum tersinkron.</span>
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-1 rounded border border-current px-2 py-1 text-xs font-semibold hover:bg-white/60"><RefreshCw size={13} />Muat ulang dari cloud</button>
          </div>
        )}
      </div>
    </div>
  );
}
