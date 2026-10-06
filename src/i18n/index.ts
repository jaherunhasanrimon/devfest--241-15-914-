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

export type { Dict };
