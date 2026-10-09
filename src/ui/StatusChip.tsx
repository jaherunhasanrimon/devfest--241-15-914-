import type { StatusKind } from '../core/types';
import { useApp } from '../state/AppContext';

interface StatusConfig {
  labelKey: 'ok' | 'missing' | 'expiry_needed' | 'expired' | 'not_provided';
  bg: string;
  fg: string;
  border: string;
  icon: (cls: string) => React.ReactNode;
}

const CONFIG: Record<StatusKind, StatusConfig> = {
  ok: {
    labelKey: 'ok',
    bg: 'var(--ok-soft)',
    fg: 'var(--ok)',
    border: 'rgba(23, 121, 74, 0.25)',
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="10" cy="10" r="8" strokeWidth="1.8" />
        <path d="m6.5 10 2.5 2.5 4.5-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  missing: {
    labelKey: 'missing',
    bg: 'var(--missing-soft)',
    fg: 'var(--missing)',
    border: 'rgba(179, 38, 30, 0.25)',
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M12 2.5H5.5A1.5 1.5 0 0 0 4 4v12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 16V6.5L12 2.5z" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 2.5v4h4" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7.5 12h5" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  expiryNeeded: {
    labelKey: 'expiry_needed',
    bg: 'var(--needs-soft)',
    fg: 'var(--needs)',
    border: 'rgba(138, 97, 0, 0.3)',
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="3" y="4" width="14" height="13" rx="2" strokeWidth="1.8" />
        <path d="M13.5 2.5V5M6.5 2.5V5M3 8h14" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 11.5a1.5 1.5 0 0 1 2.2-.4.9.9 0 0 1 .3.7c0 .5-.5.7-.7.9v.4M10 15v.1" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  expired: {
    labelKey: 'expired',
    bg: 'var(--expired-soft)',
    fg: 'var(--expired)',
    border: 'rgba(165, 66, 15, 0.3)',
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="3" y="4" width="14" height="13" rx="2" strokeWidth="1.8" />
        <path d="M13.5 2.5V5M6.5 2.5V5M3 8h14" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m8 11 4 4m0-4-4 4" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  notProvided: {
    labelKey: 'not_provided',
    bg: 'var(--none-soft)',
    fg: 'var(--none)',
    border: 'rgba(91, 101, 115, 0.25)',
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" strokeWidth="1.8" strokeDasharray="3 2" />
      </svg>
    ),
  },
};

export function StatusChip({ status }: { status: StatusKind }) {
  const { t } = useApp();
  const cfg = CONFIG[status];

  return (
    <span
      className="status-pill shrink-0 select-none"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.fg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.icon('h-4 w-4 shrink-0')}
      <span>{t.status[cfg.labelKey]}</span>
    </span>
  );
}

export function getStatusBorderColor(status: StatusKind): string {
  switch (status) {
    case 'ok': return 'var(--ok)';
    case 'missing': return 'var(--missing)';
    case 'expiryNeeded': return 'var(--needs)';
    case 'expired': return 'var(--expired)';
    case 'notProvided': return 'var(--none)';
  }
}
