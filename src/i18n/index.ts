import { en, type Dict } from './en';
import { bn, toBnDigits } from './bn';
import type { Lang, Requirement } from '../core/types';

export const dicts: Record<Lang, Dict> = { en, bn };

/** Localized document name: title_bn in Bangla (fallback title_en). */
export function reqName(r: Requirement, lang: Lang): string {
  return lang === 'bn' && r.title_bn ? r.title_bn : r.title_en;
}

/** Localize digits (e.g. dates, counts) for display only. */
export function num(n: number | string, lang: Lang): string {
  return lang === 'bn' ? toBnDigits(n) : String(n);
}

/** Formats an ISO YYYY-MM-DD date into long form via Intl.DateTimeFormat in UTC. */
export function formatDateLong(isoDate: string, lang: Lang): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export type { Dict };
