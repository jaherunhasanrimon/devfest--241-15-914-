import type { Lang } from '../core/types';
import type { StatusRow } from '../core/status';
import { isBlocking } from '../core/status';
import { canMatch } from '../core/matching';
import { useApp } from '../state/AppContext';
import { num, reqName } from '../i18n';
import { StatusChip } from './StatusChip';

export function RequirementRow({ row, index, lang }: { row: StatusRow; index: number; lang: Lang }) {
  const { state, dispatch, t, sortedReqs } = useApp();
  const { req, status, fileId, expiry } = row;
  const name = reqName(req, lang);
  const alt = lang === 'bn' ? req.title_en : req.title_bn;
  const deadline = state.tender!.submission_deadline;
  const reqIds = state.requirements.map((r) => r.id);
  const nameOfReq = (id: string) => {
    const r = sortedReqs.find((x) => x.id === id);
    return r ? reqName(r, lang) : id;
  };
  const blocking = isBlocking(status);
  const selId = `file-select-${req.id}`;
  const dateId = `expiry-${req.id}`;
  const hintId = `hint-${req.id}`;
  const hint =
    status === 'expired' ? t.statusHint.expired(num(deadline, lang)) : t.statusHint[status];

  return (
    <li
      id={`req-${req.id}`}
      className={`card scroll-mt-28 p-4 transition hover:shadow-lift sm:p-5 ${
        blocking ? 'border-l-4 border-l-red-400' : status === 'ok' ? 'border-l-4 border-l-emerald-400' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
          {num(index + 1, lang)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words text-base font-semibold text-slate-900">{name}</h3>
              {alt && alt !== name && <p className="break-words text-sm text-slate-500">{alt}</p>}
            </div>
            <div aria-live="polite">
              <StatusChip status={status} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`chip ${req.mandatory ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-100' : 'bg-slate-100 text-slate-600'}`}>
              {req.mandatory ? t.checklist.mandatory : t.checklist.optional}
            </span>
            {req.has_expiry && (
              <span className="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                <span aria-hidden>📅</span> {t.checklist.hasExpiry}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={selId} className="mb-1 block text-sm font-medium text-slate-700">{t.checklist.fileLabel}</label>
              <select
                id={selId}
                value={fileId ?? ''}
                aria-describedby={hintId}
                onChange={(e) => dispatch({ type: 'match', reqId: req.id, fileId: e.target.value || null })}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm hover:border-slate-400"
              >
                <option value="">{t.checklist.noFile}</option>
                {state.files.map((f) => {
                  const c = canMatch(req.id, f.id, state.files, state.matches, reqIds);
                  const why = c.ok
                    ? ''
                    : c.reason === 'fileUsed'
                      ? ` — ${t.checklist.usedFor(nameOfReq(c.byReqId))}`
                      : c.reason === 'dupUsed'
                        ? ` — ${t.checklist.dupUsedFor(nameOfReq(c.byReqId))}`
                        : '';
                  return (
                    <option key={f.id} value={f.id} disabled={!c.ok}>
                      {f.name} ({t.files.pages(f.pageCount)}){why}
                    </option>
                  );
                })}
              </select>
              {state.files.length === 0 && <p className="mt-1 text-xs text-slate-500">{t.checklist.noFilesYet}</p>}
            </div>

            {req.has_expiry && fileId && (
              <div>
                <label htmlFor={dateId} className="mb-1 block text-sm font-medium text-slate-700">{t.checklist.expiryLabel}</label>
                <div className="flex gap-2">
                  <input
                    id={dateId}
                    type="date"
                    value={expiry ?? ''}
                    aria-describedby={`${dateId}-help`}
                    aria-invalid={status === 'expired' || status === 'expiryNeeded'}
                    onChange={(e) => dispatch({ type: 'setExpiry', reqId: req.id, date: e.target.value })}
                    className={`min-h-11 w-full rounded-xl border bg-white px-3 text-sm shadow-sm ${
                      status === 'expired' ? 'border-red-400' : status === 'expiryNeeded' ? 'border-amber-400' : 'border-slate-300'
                    }`}
                  />
                  {expiry && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'setExpiry', reqId: req.id, date: '' })}
                      className="btn-ghost shrink-0 px-3 text-sm"
                      aria-label={`${t.checklist.clearDate}: ${name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p id={`${dateId}-help`} className="mt-1 text-xs text-slate-500">{t.checklist.expiryHelp(num(deadline, lang))}</p>
              </div>
            )}
          </div>

          <p
            id={hintId}
            className={`mt-3 text-sm ${blocking ? 'font-medium text-red-700' : status === 'ok' ? 'text-emerald-700' : 'text-slate-500'} ${
              status === 'expiryNeeded' ? '!text-amber-800' : ''
            }`}
          >
            {hint}
          </p>
        </div>
      </div>
    </li>
  );
}
