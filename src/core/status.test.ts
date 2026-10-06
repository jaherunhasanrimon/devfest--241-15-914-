import { describe, expect, it } from 'vitest';
import { requirementStatus, computeStatuses, summarize } from './status';
import { reducer, initialState, type AppState } from '../state/reducer';
import type { FileEntry, Requirement, Tender } from './types';

const D = '2026-10-20';
const req = (id: string, mandatory: boolean, has_expiry: boolean, order = 1): Requirement => ({
  id, order, title_en: id, title_bn: '', mandatory, has_expiry,
});

describe('requirementStatus', () => {
  it('Missing: mandatory, no file', () => expect(requirementStatus(req('a', true, false), false, undefined, D)).toBe('missing'));
  it('Not provided: optional, no file', () => expect(requirementStatus(req('a', false, true), false, undefined, D)).toBe('notProvided'));
  it('Expiry date needed: has_expiry + file, no date', () =>
    expect(requirementStatus(req('a', true, true), true, undefined, D)).toBe('expiryNeeded'));
  it('Expired: expiry before deadline (one day)', () => expect(requirementStatus(req('a', true, true), true, '2026-10-19', D)).toBe('expired'));
  it('OK: expiry equal to deadline (same-day edge)', () => expect(requirementStatus(req('a', true, true), true, D, D)).toBe('ok'));
  it('OK: expiry after deadline, and no-expiry doc with file', () => {
    expect(requirementStatus(req('a', true, true), true, '2027-06-30', D)).toBe('ok');
    expect(requirementStatus(req('a', true, false), true, undefined, D)).toBe('ok');
  });
  it('Optional with file but expired still blocks', () => expect(requirementStatus(req('a', false, true), true, '2025-06-30', D)).toBe('expired'));
});

const tender: Tender = { tender_id: 'T', title: 't', procuring_entity: 'e', bidder: 'b', submission_deadline: D };
const file = (id: string, hash: string): FileEntry => ({ id, name: id + '.pdf', size: 1, pageCount: 1, hash, bytes: new Uint8Array() });

function setup(): AppState {
  let s = initialState();
  s = reducer(s, { type: 'loadTender', tender, requirements: [req('R1', true, true, 1), req('R2', true, false, 2), req('R3', false, false, 3)] });
  s = reducer(s, { type: 'addFiles', files: [file('f1', 'h1'), file('f2', 'h2'), file('d1', 'hd'), file('d2', 'hd')] });
  return s;
}

describe('reducer matching rules', () => {
  it('enforces 1:1 file↔requirement', () => {
    let s = setup();
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'f1' });
    const before = s;
    s = reducer(s, { type: 'match', reqId: 'R2', fileId: 'f1' });
    expect(s).toBe(before);
    expect(s.matches).toEqual({ R1: 'f1' });
  });
  it('a duplicate group may be matched to at most one requirement', () => {
    let s = setup();
    s = reducer(s, { type: 'match', reqId: 'R2', fileId: 'd1' });
    s = reducer(s, { type: 'match', reqId: 'R3', fileId: 'd2' });
    expect(s.matches).toEqual({ R2: 'd1' });
    // switching the same requirement to the other copy is allowed
    s = reducer(s, { type: 'match', reqId: 'R2', fileId: 'd2' });
    expect(s.matches).toEqual({ R2: 'd2' });
  });
  it('rejects unknown file or requirement', () => {
    const s = setup();
    expect(reducer(s, { type: 'match', reqId: 'R1', fileId: 'nope' })).toBe(s);
    expect(reducer(s, { type: 'match', reqId: 'RX', fileId: 'f1' })).toBe(s);
  });
  it('clears expiry when match changes, is removed, or file is removed', () => {
    let s = setup();
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'f1' });
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2027-01-01' });
    expect(s.expiries.R1).toBe('2027-01-01');
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'f1' }); // same file: keep
    expect(s.expiries.R1).toBe('2027-01-01');
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'f2' });
    expect(s.expiries.R1).toBeUndefined();
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2027-01-01' });
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: null });
    expect(s.expiries.R1).toBeUndefined();
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'f1' });
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2027-01-01' });
    s = reducer(s, { type: 'removeFile', fileId: 'f1' });
    expect(s.matches.R1).toBeUndefined();
    expect(s.expiries.R1).toBeUndefined();
  });
  it('ignores expiry for unmatched or no-expiry requirements and invalid dates', () => {
    let s = setup();
    expect(reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2027-01-01' })).toBe(s);
    s = reducer(s, { type: 'match', reqId: 'R2', fileId: 'f2' });
    expect(reducer(s, { type: 'setExpiry', reqId: 'R2', date: '2027-01-01' })).toBe(s);
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'f1' });
    expect(reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2027-02-30' }).expiries.R1).toBeUndefined();
  });
  it('summary counts blockers', () => {
    let s = setup();
    const rows = () => computeStatuses(s.requirements, s.matches, s.expiries, D);
    expect(summarize(rows()).blockers.map((r) => r.status)).toEqual(['missing', 'missing']);
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'f1' });
    s = reducer(s, { type: 'match', reqId: 'R2', fileId: 'f2' });
    expect(summarize(rows()).blockers.map((r) => r.status)).toEqual(['expiryNeeded']);
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: D });
    expect(summarize(rows())).toMatchObject({ ready: 3, total: 3, blockers: [] });
  });
});
