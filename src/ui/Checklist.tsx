import { useApp } from '../state/AppContext';
import { useToast } from './Toasts';
import { RequirementRow } from './RequirementRow';
import { autoMatchFiles, generateCsv } from '../core/bonus';
import { reqName } from '../i18n';

export function Checklist() {
  const { state, dispatch, t, rows, sortedReqs, summary } = useApp();
  const toast = useToast();

  const handleAutoMatch = () => {
    const { matches, matchedCount } = autoMatchFiles(state.requirements, state.files, state.matches);
    if (matchedCount > 0) {
      dispatch({ type: 'batchMatch', matches });
      toast('success', (tt) => tt.bonus.autoMatchedToast(matchedCount));
    } else {
      toast('info', (tt) => tt.bonus.noAutoMatchesToast);
    }
  };

  const handleExportCsv = () => {
    if (!state.tender) return;
    const csvContent = generateCsv(rows, state.files, {
      headers: t.bonus.csvHeaders,
      statusLabels: t.status,
      titleAccessor: (r) => reqName(r, state.lang),
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.tender.tender_id || 'Tender'}_Summary.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const canAutoMatch = state.files.length > 0 && sortedReqs.some((r) => !state.matches[r.id]);
  const pct = summary.total > 0 ? Math.round((summary.ready / summary.total) * 100) : 0;

  return (
    <section aria-labelledby="checklist-heading" className="space-y-4">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="checklist-heading" className="text-[22px] font-bold text-[var(--ink)]">
              {t.list.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span aria-live="polite" className="text-base font-semibold text-[var(--ink)]">
              {t.list.ready(summary.ready, summary.total)}
            </span>

            <div className="flex items-center gap-2">
              <button
                id="auto-match-btn"
                type="button"
                onClick={handleAutoMatch}
                disabled={!canAutoMatch}
                aria-label={t.bonus.autoMatchLabel}
                className="btn-base btn-secondary min-h-[38px] px-3 py-1.5 text-xs sm:text-sm"
              >
                <span>⚡</span> {t.bonus.autoMatch}
              </button>
              <button
                id="export-csv-btn"
                type="button"
                onClick={handleExportCsv}
                aria-label={t.bonus.exportCsvLabel}
                className="btn-base btn-secondary min-h-[38px] px-3 py-1.5 text-xs sm:text-sm"
              >
                <span>📊</span> {t.bonus.exportCsv}
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full bg-[var(--primary)] progress-bar-fill"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={summary.ready}
            aria-valuemin={0}
            aria-valuemax={summary.total}
            aria-label={t.list.ready(summary.ready, summary.total)}
          />
        </div>
      </div>

      <ol className="space-y-3" aria-label={t.list.title}>
        {rows.map((row, i) => (
          <RequirementRow key={row.req.id} row={row} index={i} lang={state.lang} />
        ))}
      </ol>
    </section>
  );
}
