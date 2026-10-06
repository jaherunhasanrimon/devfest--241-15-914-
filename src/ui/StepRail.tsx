import { useApp } from '../state/AppContext';
import { num } from '../i18n';

export function StepRail() {
  const { state, t } = useApp();
  const matched = Object.keys(state.matches).length > 0;
  const done = [!!state.tender, state.files.length > 0, matched, !!state.generated];
  const current = done.indexOf(false) === -1 ? 3 : done.indexOf(false);
  const labels = [t.steps.load, t.steps.files, t.steps.match, t.steps.generate];
  return (
    <nav aria-label={t.steps.label} className="my-6">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {labels.map((label, i) => {
          const isDone = done[i];
          const isCur = i === current && !isDone;
          return (
            <li
              key={i}
              aria-current={isCur ? 'step' : undefined}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                isDone
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : isCur
                    ? 'border-primary-600 bg-white text-primary-800 shadow-card'
                    : 'border-slate-200 bg-white/60 text-slate-500'
              }`}
            >
              <span
                aria-hidden
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  isDone ? 'bg-emerald-600 text-white' : isCur ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isDone ? '✓' : num(i + 1, state.lang)}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
