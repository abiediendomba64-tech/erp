import { useEffect, useState } from 'react';
import { getCloudSyncState, subscribeCloudSync, type CloudSyncState } from '../lib/googleWorkspaceSync';

function styleFor(status: CloudSyncState['status']) {
  if (status === 'error' || status === 'conflict') return 'border-red-300 bg-red-50 text-red-900';
  if (status === 'warning') return 'border-amber-300 bg-amber-50 text-amber-900';
  if (status === 'saving') return 'border-blue-200 bg-blue-50 text-blue-900';
  if (status === 'saved') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function CloudSyncStatusBar() {
  const [state, setState] = useState<CloudSyncState>(getCloudSyncState());
  useEffect(() => subscribeCloudSync(setState), []);

  if (state.status === 'inactive') return null;
  const urgent = state.status === 'error' || state.status === 'conflict';

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      className={\`border-b px-4 py-2 text-sm \${styleFor(state.status)}\`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className={\`inline-block h-2 w-2 shrink-0 rounded-full \${state.status === 'saved' ? 'bg-emerald-500' : state.status === 'saving' ? 'animate-pulse bg-blue-500' : urgent ? 'bg-red-500' : 'bg-amber-500'}\`} />
          <span className="min-w-0">{state.message}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          {state.version !== null && <span>Versi cloud {state.version}</span>}
          {urgent && (
            <button
              onClick={() => window.location.reload()}
              className="rounded border border-current/30 px-2 py-1 font-semibold hover:bg-white/60"
            >
              Muat ulang data cloud
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
