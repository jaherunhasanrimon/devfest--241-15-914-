import { useApp } from '../state/AppContext';
import { num } from '../i18n';

export function StepRail() {
  const { state, t, summary } = useApp();

  const isTenderLoaded = !!state.tender;
  const hasFiles = state.files.length > 0;
  const noBlockers = isTenderLoaded && hasFiles && summary.blockers.length === 0;
  const isGenerated = !!state.generated;

  const done = [isTenderLoaded, hasFiles, noBlockers, isGenerated];

  let currentIdx = 0;
  if (!isTenderLoaded) currentIdx = 0;
  else if (!hasFiles) currentIdx = 1;
  else if (!noBlockers) currentIdx = 2;
  else if (!isGenerated) currentIdx = 3;
  else currentIdx = 3;

  const labels = [t.step.open, t.step.add, t.step.match, t.step.create];

  return (
    <nav aria-label={t.step.match} className="my-5">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {labels.map((label, i) => {
          const isDone = done[i];
          const isCurrent = i === currentIdx && !isDone;

          return (
            <li
              key={i}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-2.5 rounded-[6px] border px-3 py-2 text-sm font-medium transition ${
                isDone
                  ? 'border-[var(--ok)] bg-[var(--ok-soft)] text-[var(--ok)]'
                  : isCurrent
                    ? 'border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)] ring-2 ring-[var(--primary-soft)]'
                    : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-[var(--ok)] text-white'
                    : isCurrent
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--line)] text-[var(--ink-muted)]'
                }`}
              >
                {isDone ? '✓' : num(i + 1, state.lang)}
              </span>
              <span className="truncate">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
