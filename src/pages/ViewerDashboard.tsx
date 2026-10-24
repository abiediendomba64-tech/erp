import { useMemo } from 'react';
import { useAppContext } from '../store';
import { CheckCircle2, Clock3, Construction, LandPlot, ShieldCheck } from 'lucide-react';

export default function ViewerDashboard() {
  const { state } = useAppContext();

  const landSummary = useMemo(() => ({
    total: state.tanah.length,
    settled: state.tanah.filter((item) => item.status === 'Lunas').length,
    inProgress: state.tanah.filter((item) => item.status === 'DP').length,
    waiting: state.tanah.filter((item) => item.status === 'Belum_Bayar').length,
    area: state.tanah.reduce((sum, item) => sum + Math.max(0, Number(item.luas_bt) || 0), 0),
  }), [state.tanah]);

  const bekoSummary = useMemo(() => ({
    total: state.beko.length,
    ready: state.beko.filter((item) => item.status === 'Lunas').length,
    waiting: state.beko.filter((item) => item.status !== 'Lunas').length,
  }), [state.beko]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Ringkasan Progres Proyek</h1>
        <p className="mt-1 text-sm text-slate-500">Tampilan baca saja. Data pemilik, nilai kesepakatan, pembayaran, tarif, dan dokumen keuangan tidak ditampilkan.</p>
      </header>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <div className="flex items-start gap-3">
          <ShieldCheck size={21} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Akses Viewer</p>
            <p>Ringkasan ini memuat angka progres non-keuangan dari data cloud yang telah disaring oleh backend. Perubahan data dan dokumen tidak dapat disimpan oleh akun Viewer.</p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><LandPlot size={19} /> Pembebasan tanah</div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{landSummary.total}</p>
          <p className="mt-1 text-xs text-slate-500">Bidang terdaftar · {landSummary.area.toLocaleString('id-ID')} BT tercatat</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Lunas</span><span className="font-semibold">{landSummary.settled}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">DP</span><span className="font-semibold">{landSummary.inProgress}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Belum bayar</span><span className="font-semibold">{landSummary.waiting}</span></div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Construction size={19} /> Pekerjaan beko</div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{bekoSummary.total}</p>
          <p className="mt-1 text-xs text-slate-500">Item pekerjaan terdaftar</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-slate-500"><CheckCircle2 size={15} /> Tercatat lunas</span>
              <span className="font-semibold">{bekoSummary.ready}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-slate-500"><Clock3 size={15} /> Perlu tindak lanjut</span>
              <span className="font-semibold">{bekoSummary.waiting}</span>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">Status progres berasal dari register yang tersimpan; ini bukan verifikasi legal atas kepemilikan tanah, pelunasan, ataupun pemeriksaan lapangan independen.</p>
    </div>
  );
}
