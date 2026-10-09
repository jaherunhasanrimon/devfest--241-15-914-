import type { Lang } from '../core/types';
import type { StatusRow } from '../core/status';
import { canMatch } from '../core/matching';
import { useApp } from '../state/AppContext';
import { num, reqName, formatDateLong } from '../i18n';
import { StatusChip, getStatusBorderColor } from './StatusChip';

export function RequirementRow({ row, index, lang }: { row: StatusRow; index: number; lang: Lang }) {
  const { state, dispatch, t, sortedReqs } = useApp();
  const { req, status, fileId, expiry } = row;
  const name = reqName(req, lang);
  const deadline = state.tender!.submission_deadline;
  const reqIds = state.requirements.map((r) => r.id);

  const nameOfReq = (id: string) => {
    const r = sortedReqs.find((x) => x.id === id);
    return r ? reqName(r, lang) : id;
  };

  const selId = `file-select-${req.id}`;
  const dateId = `expiry-${req.id}`;
  const hintId = `hint-${req.id}`;

  // Helper line under the row (exact copy from Section 4 table)
  let helperLine: string | null = null;
  if (status === 'missing') {
    helperLine = t.helper.missing;
  } else if (status === 'expiryNeeded') {
    helperLine = t.helper.expiry_needed;
  } else if (status === 'expired') {
    const formattedExpiry = expiry ? formatDateLong(expiry, lang) : '';
    const formattedDeadline = formatDateLong(deadline, lang);
    helperLine = t.helper.expired(formattedExpiry, formattedDeadline);
  } else if (status === 'notProvided') {
    helperLine = t.helper.not_provided;
  }

  const borderColor = getStatusBorderColor(status);

  // Group files: available first, then unavailable
  const availableFiles: typeof state.files = [];
  const unavailableFiles: { file: (typeof state.files)[0]; why: string }[] = [];

  for (const f of state.files) {
    const c = canMatch(req.id, f.id, state.files, state.matches, reqIds);
    if (c.ok) {
      availableFiles.push(f);
    } else {
      const why =
        c.reason === 'fileUsed'
          ? ` (${t.row.usedFor(nameOfReq(c.byReqId))})`
          : c.reason === 'dupUsed'
            ? ` (${t.row.dupUsedFor(nameOfReq(c.byReqId))})`
            : '';
      unavailableFiles.push({ file: f, why });
    }
  }

  return (
    <li
      id={`req-${req.id}`}
      style={{ borderLeftColor: borderColor }}
      className="panel scroll-mt-28 border-l-4 p-4 transition-colors duration-150 sm:p-5"
    >
      <div className="flex flex-col gap-3">
        {/* Top: Order, Title, Tags, Status Pill */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--line)] text-sm font-bold text-[var(--ink)]"
            >
              {num(index + 1, lang)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-[18px] font-semibold text-[var(--ink)]">
                  {name}
                </h3>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    req.mandatory
                      ? 'bg-[var(--missing-soft)] text-[var(--missing)]'
                      : 'bg-[var(--none-soft)] text-[var(--none)]'
                  }`}
                >
                  {req.mandatory ? t.tag.required : t.tag.optional}
                </span>
                {req.has_expiry && (
                  <span className="rounded-full bg-[var(--needs-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--needs)]">
                    {t.tag.hasExpiry}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div aria-live="polite">
            <StatusChip status={status} />
          </div>
        </div>

        {/* Controls: Native select, Remove button, Expiry input */}
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={selId} className="sr-only">
              {t.row.chooseFile}
            </label>
            <div className="flex items-center gap-2">
              <select
                id={selId}
                value={fileId ?? ''}
                aria-describedby={hintId}
                onChange={(e) => dispatch({ type: 'match', reqId: req.id, fileId: e.target.value || null })}
                className="input-control min-h-[44px] w-full"
              >
                <option value="">{t.row.chooseFile}</option>
                {/* Available files first */}
                {availableFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({t.files.pages(f.pageCount)})
                  </option>
                ))}
                {/* Disabled files with reason */}
                {unavailableFiles.map(({ file: f, why }) => (
                  <option key={f.id} value={f.id} disabled>
                    {f.name} ({t.files.pages(f.pageCount)}){why}
                  </option>
                ))}
              </select>

              {fileId && (
                <button
                  type="button"
                  id={`remove-match-${req.id}`}
                  onClick={() => dispatch({ type: 'match', reqId: req.id, fileId: null })}
                  className="btn-base btn-secondary min-h-[44px] shrink-0 text-sm"
                >
                  {t.row.remove}
                </button>
              )}
            </div>
            {state.files.length === 0 && (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">{t.row.noFilesYet}</p>
            )}
          </div>

          {req.has_expiry && fileId && (
            <div>
              <label htmlFor={dateId} className="mb-1 block text-sm font-medium text-[var(--ink)]">
                {t.row.expiry}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={dateId}
                  type="date"
                  value={expiry ?? ''}
                  aria-describedby={`${dateId}-hint`}
                  aria-invalid={status === 'expired' || status === 'expiryNeeded'}
                  onChange={(e) => dispatch({ type: 'setExpiry', reqId: req.id, date: e.target.value })}
                  className={`input-control min-h-[44px] w-full ${
                    status === 'expired'
                      ? 'border-[var(--expired)]'
                      : status === 'expiryNeeded'
                        ? 'border-[var(--needs)]'
                        : 'border-[var(--line)]'
                  }`}
                />
                {expiry && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'setExpiry', reqId: req.id, date: '' })}
                    className="btn-base btn-secondary min-h-[44px] shrink-0 px-3 text-sm text-[var(--ink-muted)]"
                    aria-label={`${t.row.clearDate}: ${name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
              <p id={`${dateId}-hint`} className="mt-1 text-xs text-[var(--ink-muted)]">
                {t.row.expiryHint(formatDateLong(deadline, lang))}
              </p>
            </div>
          )}
        </div>

        {/* One-line helper under row */}
        {helperLine && (
          <p
            id={hintId}
            className={`mt-1 text-sm ${
              status === 'missing'
                ? 'font-medium text-[var(--missing)]'
                : status === 'expired'
                  ? 'font-medium text-[var(--expired)]'
                  : status === 'expiryNeeded'
                    ? 'font-medium text-[var(--needs)]'
                    : 'text-[var(--ink-muted)]'
            }`}
          >
            {helperLine}
          </p>
        )}
      </div>
    </li>
  );
}
