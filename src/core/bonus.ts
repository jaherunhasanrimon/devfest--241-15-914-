import type { FileEntry, Requirement } from './types';
import type { StatusRow } from './status';
import { canMatch } from './matching';

function escapeCsv(val: string | number): string {
  const s = String(val);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface CsvOptions {
  headers?: {
    document: string;
    file: string;
    pages: string;
    expiry: string;
    status: string;
  };
  statusLabels: Record<string, string>;
  titleAccessor?: (r: Requirement) => string;
}

export function generateCsv(
  rows: StatusRow[],
  files: FileEntry[],
  options: CsvOptions,
): string {
  const fileMap = new Map(files.map((f) => [f.id, f]));
  const h = options.headers ?? {
    document: 'Document',
    file: 'File',
    pages: 'Pages',
    expiry: 'Expiry',
    status: 'Status',
  };

  const headerLine = [h.document, h.file, h.pages, h.expiry, h.status]
    .map(escapeCsv)
    .join(',');

  const dataLines = rows.map((r) => {
    const f = r.fileId ? fileMap.get(r.fileId) : undefined;
    const docTitle = options.titleAccessor ? options.titleAccessor(r.req) : r.req.title_en;
    const fileName = f ? f.name : '—';
    const pages = f ? f.pageCount : 0;
    const expiry = r.expiry ?? '—';
    const statusText = options.statusLabels[r.status] ?? r.status;

    return [docTitle, fileName, pages, expiry, statusText]
      .map(escapeCsv)
      .join(',');
  });

  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Calculates a match score between a requirement and a filename.
 */
function scorePair(req: Requirement, fileName: string): number {
  const cName = normalize(fileName);
  const cTitle = normalize(req.title_en);
  const cId = req.id.toLowerCase();

  // Exact phrase match
  if (cName.includes(cTitle)) return 100 + cTitle.length;

  const reqTokens = cTitle.split(' ').filter((w) => w.length > 2 && w !== 'certificate' && w !== 'statement');
  const fileTokens = cName.split(' ').filter((w) => w.length > 2 && w !== 'certificate' && w !== 'statement');

  let tokenScore = 0;
  for (const t of reqTokens) {
    if (fileTokens.some((ft) => ft === t)) tokenScore += 20;
    else if (fileTokens.some((ft) => ft.includes(t) || t.includes(ft))) tokenScore += 10;
  }

  // Id match bonus (e.g., '01_financial_proposal' or 'r01')
  if (cName.includes(cId)) tokenScore += 15;

  return tokenScore;
}

/**
 * Automatically pairs unmatched requirements with available files by global best score.
 * Strictly obeys 1:1 matching and duplicate group rules.
 */
export function autoMatchFiles(
  requirements: Requirement[],
  files: FileEntry[],
  existingMatches: Record<string, string>,
): { matches: Record<string, string>; matchedCount: number } {
  const reqIds = requirements.map((r) => r.id);
  const updatedMatches = { ...existingMatches };
  let matchedCount = 0;

  // Generate candidate pairs with positive score
  interface Candidate {
    reqId: string;
    fileId: string;
    score: number;
  }
  const candidates: Candidate[] = [];

  for (const req of requirements) {
    if (updatedMatches[req.id]) continue;
    for (const f of files) {
      const s = scorePair(req, f.name);
      if (s >= 10) {
        candidates.push({ reqId: req.id, fileId: f.id, score: s });
      }
    }
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    if (updatedMatches[c.reqId]) continue; // already matched
    const check = canMatch(c.reqId, c.fileId, files, updatedMatches, reqIds);
    if (check.ok) {
      updatedMatches[c.reqId] = c.fileId;
      matchedCount++;
    }
  }

  return { matches: updatedMatches, matchedCount };
}
