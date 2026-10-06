import { useApp } from '../state/AppContext';
import { useTenderLoader } from './LoadTender';
import { num } from '../i18n';

export function TenderCard() {
  const { state, t } = useApp();
  const { open, input, errText } = useTenderLoader();
  const td = state.tender!;
  const rows: [string, string][] = [
    [t.tender.title, td.title],
    [t.tender.entity, td.procuring_entity],
    [t.tender.bidder, td.bidder],
  ];
  return (
    <section aria-labelledby="tender-heading" className="card animate-rise overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-primary-600 to-indigo-600 px-6 py-5 text-white">
        <div className="min-w-0">
          <p className="text-sm font-medium text-blue-100">{t.tender.heading} · {t.tender.id}</p>
          <h2 id="tender-heading" className="mt-0.5 break-words text-2xl font-bold">{td.tender_id}</h2>
        </div>
        <div className="rounded-xl bg-white/15 px-4 py-2 text-right ring-1 ring-white/25">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-100">{t.tender.deadline}</p>
          <p className="text-lg font-bold tabular-nums">{num(td.submission_deadline, state.lang)}</p>
        </div>
      </div>
      <dl className="grid gap-4 px-6 py-5 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-sm text-slate-500">{k}</dt>
            <dd className="mt-0.5 break-words font-semibold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-slate-100 px-6 py-3">
        <button id="replace-tender-btn" onClick={open} className="text-sm font-semibold text-primary-700 hover:underline">
          {t.load.replace}
        </button>
        {input}
        {errText && <p role="alert" className="mt-2 text-sm text-red-700">{errText}</p>}
      </div>
    </section>
  );
}
