import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, LoaderCircle, RefreshCw, XCircle } from 'lucide-react';
import { CloudStatus, getCloudStatus, retryFailedCloudWrites, subscribeCloudStatus } from '../lib/gasBridge';

export default function CloudStatusIndicator() {
  const [status, setStatus] = useState<CloudStatus>(getCloudStatus());
  const [retrying, setRetrying] = useState(false);

  useEffect(() => subscribeCloudStatus(setStatus), []);

  const retry = async () => {
    setRetrying(true);
    try {
      await retryFailedCloudWrites();
    } catch {
      // The current status retains the real error; never show a false success.
    } finally {
      setRetrying(false);
    }
  };

  const reload = () => {
    const confirmed = window.confirm(
      'Muat ulang data terbaru dari cloud? Perubahan di browser yang belum berhasil disinkronkan akan diganti. Buat backup lokal terlebih dahulu jika masih dibutuhkan.'
    );
    if (confirmed) window.location.reload();
  };

  const Icon = status.state === 'saved' ? CheckCircle2
    : status.state === 'saving' || status.state === 'loading' ? LoaderCircle
      : status.state === 'conflict' ? AlertTriangle
        : status.state === 'error' ? XCircle : Cloud;
  const style = status.state === 'saved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : status.state === 'error' || status.state === 'conflict' ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-slate-200 bg-white text-slate-700';

  return (
    <div className={`mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${style}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon size={17} className={status.state === 'saving' || status.state === 'loading' ? 'animate-spin shrink-0' : 'shrink-0'} />
        <span>{status.message}</span>
      </div>
      {(status.state === 'error' || status.state === 'conflict') && (
        <div className="flex shrink-0 gap-2">
          {status.state === 'error' && (
            <button onClick={() => void retry()} disabled={retrying} className="inline-flex items-center gap-1 rounded border border-current px-2 py-1 disabled:opacity-50">
              <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} /> {retrying ? 'Mencoba…' : 'Coba lagi'}
            </button>
          )}
          <button onClick={reload} className="rounded bg-white/70 px-2 py-1 text-current border border-current">Muat ulang cloud</button>
        </div>
      )}
    </div>
  );
}
