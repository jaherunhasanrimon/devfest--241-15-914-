import { describe, expect, it } from 'vitest';
import { isIsoDate, parseTenderJson, sortRequirements } from './tender';

const base = {
  tender: { tender_id: 'T-1', title: 'X', procuring_entity: 'E', bidder: 'B', submission_deadline: '2026-10-20' },
  requirements: [
    { id: 'R2', order: 10, title_en: 'Ten', title_bn: '', mandatory: true, has_expiry: false },
    { id: 'R1', order: 2, title_en: 'Two', title_bn: 'দুই', mandatory: false, has_expiry: true },
    { id: 'R3', order: 2, title_en: 'Two-b', title_bn: '', mandatory: true, has_expiry: false },
  ],
};

describe('parseTenderJson', () => {
  it('rejects malformed JSON without throwing', () => {
    expect(parseTenderJson('{oops')).toEqual({ ok: false, error: { code: 'notJson' } });
  });
  it('rejects bad deadline and missing fields', () => {
    const bad = structuredClone(base);
    bad.tender.submission_deadline = '2026-02-30';
    expect(parseTenderJson(JSON.stringify(bad))).toMatchObject({ ok: false, error: { code: 'badDeadline' } });
    const noBidder = structuredClone(base) as Record<string, any>;
    delete noBidder.tender.bidder;
    expect(parseTenderJson(JSON.stringify(noBidder))).toMatchObject({ ok: false, error: { field: 'bidder' } });
  });
  it('accepts valid file and sorts numerically + stably', () => {
    const r = parseTenderJson(JSON.stringify(base));
    expect(r.ok).toBe(true);
    if (r.ok) expect(sortRequirements(r.data.requirements).map((x) => x.id)).toEqual(['R1', 'R3', 'R2']);
  });
  it('validates ISO dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('20-10-2026')).toBe(false);
  });
});
