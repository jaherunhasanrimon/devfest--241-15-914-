import type { Lang, Requirement } from '../core/types';
import { useApp } from '../state/AppContext';
import { num, reqName } from '../i18n';

export function RequirementRow({ req, index, lang }: { req: Requirement; index: number; lang: Lang }) {
  const { t } = useApp();
  const name = reqName(req, lang);
  const alt = lang === 'bn' ? req.title_en : req.title_bn;
  return (
    <li id={`req-${req.id}`} className="card scroll-mt-28 p-4 transition hover:shadow-lift sm:p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600"
        >
          {num(index + 1, lang)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold text-slate-900">{name}</h3>
          {alt && alt !== name && <p className="break-words text-sm text-slate-500">{alt}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`chip ${req.mandatory ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-100' : 'bg-slate-100 text-slate-600'}`}
            >
              {req.mandatory ? t.checklist.mandatory : t.checklist.optional}
            </span>
            {req.has_expiry && (
              <span className="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                <span aria-hidden>📅</span> {t.checklist.hasExpiry}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
