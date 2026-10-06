import type { StatusKind } from '../core/types';
import { useApp } from '../state/AppContext';

const STYLE: Record<StatusKind, { icon: string; cls: string }> = {
  missing: { icon: '✕', cls: 'bg-red-50 text-red-800 ring-red-200' },
  expiryNeeded: { icon: '⚠', cls: 'bg-amber-50 text-amber-900 ring-amber-300' },
  expired: { icon: '⏱', cls: 'bg-red-50 text-red-800 ring-red-200' },
  notProvided: { icon: '–', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
  ok: { icon: '✓', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
};

/** Status chip = icon + text + color (never color alone). */
export function StatusChip({ status }: { status: StatusKind }) {
  const { t } = useApp();
  const s = STYLE[status];
  return (
    <span className={`chip shrink-0 px-3 py-1 font-semibold ring-1 ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {t.status[status]}
    </span>
  );
}
