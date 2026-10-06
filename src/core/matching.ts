import type { FileEntry } from './types';

export type MatchBlock =
  | { ok: true }
  | { ok: false; reason: 'noFile' | 'noReq' }
  | { ok: false; reason: 'fileUsed'; byReqId: string }
  | { ok: false; reason: 'dupUsed'; byReqId: string; viaFileId: string };

/**
 * Can `fileId` be matched to `reqId`? Rules: 1:1 file↔requirement, and a duplicate group
 * (identical SHA-256) may be matched to at most ONE requirement in total.
 */
export function canMatch(
  reqId: string,
  fileId: string,
  files: Pick<FileEntry, 'id' | 'hash'>[],
  matches: Record<string, string>,
  reqIds: string[],
): MatchBlock {
  if (!reqIds.includes(reqId)) return { ok: false, reason: 'noReq' };
  const file = files.find((f) => f.id === fileId);
  if (!file) return { ok: false, reason: 'noFile' };
  for (const [rid, fid] of Object.entries(matches)) {
    if (rid === reqId) continue;
    if (fid === fileId) return { ok: false, reason: 'fileUsed', byReqId: rid };
    const other = files.find((f) => f.id === fid);
    if (other && other.hash === file.hash) return { ok: false, reason: 'dupUsed', byReqId: rid, viaFileId: fid };
  }
  return { ok: true };
}
