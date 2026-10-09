import { useApp } from '../state/AppContext';
import { useTenderLoader } from './LoadTender';
import { formatDateLong } from '../i18n';

export function TenderCard() {
  const { state, t } = useApp();
  const { open, input, errText } = useTenderLoader();
  const td = state.tender!;

  const formattedDeadline = formatDateLong(td.submission_deadline, state.lang);

  return (
    <section aria-labelledby="tender-title" className="panel p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 id="tender-title" className="break-words text-[28px] font-bold leading-tight text-[var(--ink)] sm:text-[30px]">
            {td.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-[var(--ink-muted)]">
            <span className="font-semibold text-[var(--ink)]">{td.tender_id}</span>
            <span aria-hidden="true">•</span>
            <span>{td.procuring_entity}</span>
          </div>
          <p className="text-base text-[var(--ink-muted)]">
            <span className="font-medium">{t.header.bidder}:</span> {td.bidder}
          </p>
        </div>

        <div className="shrink-0 rounded-[6px] border border-[var(--line)] bg-[var(--canvas)] p-3 text-left md:min-w-[190px] md:text-right">
          <p className="text-sm font-medium text-[var(--ink-muted)]">
            {t.header.deadline}
          </p>
          <p className="mt-0.5 text-lg font-bold text-[var(--ink)] sm:text-xl">
            {formattedDeadline}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <button
          id="replace-tender-btn"
          type="button"
          onClick={open}
          className="text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          {t.open.replace}
        </button>
        {input}
      </div>

      {errText && (
        <div
          role="alert"
          className="mt-3 rounded-[6px] border border-[var(--missing)] bg-[var(--missing-soft)] p-3 text-sm text-[var(--missing)]"
        >
          {errText}
        </div>
      )}
    </section>
  );
}
