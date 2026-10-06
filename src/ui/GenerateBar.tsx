import { useApp } from '../state/AppContext';

/** Sticky bottom bar: "X of Y ready · N problems". Generate button + reasons are added in P4. */
export function GenerateBar() {
  const { t, summary } = useApp();
  const n = summary.blockers.length;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-slate-900">{t.summary.ready(summary.ready, summary.total)}</span>
          <span aria-hidden className="text-slate-300">·</span>
          <span className={`chip ring-1 ${n ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'}`}>
            <span aria-hidden>{n ? '!' : '✓'}</span> {t.summary.problems(n)}
          </span>
        </div>
      </div>
    </div>
  );
}
