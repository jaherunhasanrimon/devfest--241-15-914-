import { useApp } from '../state/AppContext';
import { RequirementRow } from './RequirementRow';

export function Checklist() {
  const { state, t, rows } = useApp();
  return (
    <section aria-labelledby="checklist-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="checklist-heading" className="text-xl font-bold text-slate-900">{t.checklist.heading}</h2>
        <span className="text-sm text-slate-500">{t.checklist.count(rows.length)}</span>
      </div>
      <ol className="space-y-3">
        {rows.map((row, i) => (
          <RequirementRow key={row.req.id} row={row} index={i} lang={state.lang} />
        ))}
      </ol>
    </section>
  );
}
