import { useApp } from '../state/AppContext';
import { useToast } from './Toasts';
import { RequirementRow } from './RequirementRow';
import { autoMatchFiles, generateCsv } from '../core/bonus';
import { reqName } from '../i18n';

export function Checklist() {
  const { state, dispatch, t, rows, sortedReqs } = useApp();
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

  return (
    <section aria-labelledby="checklist-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 id="checklist-heading" className="text-xl font-bold text-slate-900">{t.checklist.heading}</h2>
          <span className="text-sm text-slate-500">{t.checklist.count(rows.length)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="auto-match-btn"
            type="button"
            onClick={handleAutoMatch}
            disabled={!canAutoMatch}
            aria-label={t.bonus.autoMatchLabel}
            className="btn-ghost min-h-9 px-3 text-xs sm:text-sm"
          >
            <span aria-hidden>⚡</span> {t.bonus.autoMatch}
          </button>
          <button
            id="export-csv-btn"
            type="button"
            onClick={handleExportCsv}
            aria-label={t.bonus.exportCsvLabel}
            className="btn-ghost min-h-9 px-3 text-xs sm:text-sm text-slate-700 hover:text-slate-900"
          >
            <span aria-hidden>📊</span> {t.bonus.exportCsv}
          </button>
        </div>
      </div>
      <ol className="space-y-3">
        {rows.map((row, i) => (
          <RequirementRow key={row.req.id} row={row} index={i} lang={state.lang} />
        ))}
      </ol>
    </section>
  );
}
