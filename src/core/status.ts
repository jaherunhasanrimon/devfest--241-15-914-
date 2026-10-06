import { BLOCKING, type Requirement, type StatusKind } from './types';

/**
 * Exactly one status per requirement. ISO strings (YYYY-MM-DD) compare lexicographically = chronologically,
 * so no Date objects or timezones are involved. Expiry equal to the deadline is OK.
 */
export function requirementStatus(
  req: Pick<Requirement, 'mandatory' | 'has_expiry'>,
  hasFile: boolean,
  expiry: string | undefined,
  deadline: string,
): StatusKind {
  if (!hasFile) return req.mandatory ? 'missing' : 'notProvided';
  if (!req.has_expiry) return 'ok';
  if (!expiry) return 'expiryNeeded';
  return expiry < deadline ? 'expired' : 'ok';
}

export interface StatusRow {
  req: Requirement;
  status: StatusKind;
  fileId?: string;
  expiry?: string;
}

export function computeStatuses(
  sortedReqs: Requirement[],
  matches: Record<string, string>,
  expiries: Record<string, string>,
  deadline: string,
): StatusRow[] {
  return sortedReqs.map((req) => {
    const fileId = matches[req.id];
    const expiry = req.has_expiry && fileId ? expiries[req.id] : undefined;
    return { req, fileId, expiry, status: requirementStatus(req, !!fileId, expiry, deadline) };
  });
}

export const isBlocking = (s: StatusKind) => BLOCKING.has(s);

export function summarize(rows: StatusRow[]) {
  const blockers = rows.filter((r) => isBlocking(r.status));
  return {
    total: rows.length,
    ready: rows.filter((r) => r.status === 'ok' || r.status === 'notProvided').length,
    blockers,
  };
}
