import { useApp } from '../state/AppContext';
import { RequirementRow } from './RequirementRow';

export function Checklist() {
  const { state, t, sortedReqs } = useApp();
  return (
    <section aria-labelledby="checklist-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="checklist-heading" className="text-xl font-bold text-slate-900">{t.checklist.heading}</h2>
        <span className="text-sm text-slate-500">{t.checklist.count(sortedReqs.length)}</span>
      </div>
      <ol className="space-y-3">
        {sortedReqs.map((r, i) => (
          <RequirementRow key={r.id} req={r} index={i} lang={state.lang} />
        ))}
      </ol>
    </section>
  );
}
