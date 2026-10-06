import type { Requirement, TenderData } from './types';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates an ISO calendar date string (YYYY-MM-DD) without using timezones. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  const dim = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= dim[m - 1];
}

/** Local calendar date as YYYY-MM-DD. */
export function todayLocalIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export type ParseError =
  | { code: 'notJson' }
  | { code: 'noTender' }
  | { code: 'tenderField'; field: string }
  | { code: 'badDeadline' }
  | { code: 'noRequirements' }
  | { code: 'reqField'; index: number; field: string }
  | { code: 'dupReqId'; id: string };

export type ParseResult = { ok: true; data: TenderData } | { ok: false; error: ParseError };

const str = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

/** Parse + validate requirements.json text. Never throws. */
export function parseTenderJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, error: { code: 'notJson' } };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: { code: 'notJson' } };
  const r = raw as Record<string, unknown>;
  const t = r.tender as Record<string, unknown> | undefined;
  if (!t || typeof t !== 'object') return { ok: false, error: { code: 'noTender' } };
  for (const f of ['tender_id', 'title', 'procuring_entity', 'bidder', 'submission_deadline']) {
    if (!str(t[f])) return { ok: false, error: { code: 'tenderField', field: f } };
  }
  const deadline = String(t.submission_deadline).trim();
  if (!isIsoDate(deadline)) return { ok: false, error: { code: 'badDeadline' } };
  if (!Array.isArray(r.requirements) || r.requirements.length === 0)
    return { ok: false, error: { code: 'noRequirements' } };

  const seen = new Set<string>();
  const reqs: Requirement[] = [];
  for (let i = 0; i < r.requirements.length; i++) {
    const q = r.requirements[i] as Record<string, unknown>;
    if (!q || typeof q !== 'object') return { ok: false, error: { code: 'reqField', index: i, field: 'object' } };
    const id = typeof q.id === 'number' ? String(q.id) : q.id;
    if (!str(id)) return { ok: false, error: { code: 'reqField', index: i, field: 'id' } };
    const order = typeof q.order === 'string' && q.order.trim() !== '' ? Number(q.order) : q.order;
    if (typeof order !== 'number' || !Number.isFinite(order))
      return { ok: false, error: { code: 'reqField', index: i, field: 'order' } };
    if (!str(q.title_en)) return { ok: false, error: { code: 'reqField', index: i, field: 'title_en' } };
    if (typeof q.mandatory !== 'boolean') return { ok: false, error: { code: 'reqField', index: i, field: 'mandatory' } };
    if (typeof q.has_expiry !== 'boolean') return { ok: false, error: { code: 'reqField', index: i, field: 'has_expiry' } };
    const sid = String(id).trim();
    if (seen.has(sid)) return { ok: false, error: { code: 'dupReqId', id: sid } };
    seen.add(sid);
    reqs.push({
      id: sid,
      order,
      title_en: String(q.title_en).trim(),
      title_bn: typeof q.title_bn === 'string' ? q.title_bn.trim() : '',
      mandatory: q.mandatory,
      has_expiry: q.has_expiry,
    });
  }
  return {
    ok: true,
    data: {
      tender: {
        tender_id: String(t.tender_id).trim(),
        title: String(t.title).trim(),
        procuring_entity: String(t.procuring_entity).trim(),
        bidder: String(t.bidder).trim(),
        submission_deadline: deadline,
      },
      requirements: reqs,
    },
  };
}

/** Numeric, stable sort by `order` (ties keep file order). */
export function sortRequirements(reqs: Requirement[]): Requirement[] {
  return reqs
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.order - b.r.order || a.i - b.i)
    .map((x) => x.r);
}
