import { PDFDocument } from 'pdf-lib';
import type { FileEntry } from './types';

export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export type FileRejectReason = 'notPdfExt' | 'notPdfMagic' | 'encrypted' | 'damaged' | 'tooMany' | 'tooBig' | 'readFail';

/** True if the bytes carry the "%PDF-" signature (at the start, tolerating up to 1 KB of leading junk as readers do). */
export function hasPdfMagic(bytes: Uint8Array): boolean {
  const sig = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  const end = Math.min(bytes.length - sig.length, 1024);
  for (let i = 0; i <= end; i++) {
    let ok = true;
    for (let j = 0; j < sig.length; j++) if (bytes[i + j] !== sig[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

export const hasPdfExt = (name: string) => /\.pdf$/i.test(name.trim());

/** Load with pdf-lib to count pages. Encrypted / unparsable / zero-page → rejected. Never throws. */
export async function inspectPdf(
  bytes: Uint8Array,
): Promise<{ ok: true; pageCount: number } | { ok: false; reason: 'encrypted' | 'damaged' }> {
  if (looksEncrypted(bytes)) return { ok: false, reason: 'encrypted' };
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const n = doc.getPageCount();
    if (n < 1) return { ok: false, reason: 'damaged' };
    return { ok: true, pageCount: n };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    return { ok: false, reason: /encrypt/i.test(msg) ? 'encrypted' : 'damaged' };
  }
}

/** Cheap check for an /Encrypt entry in the trailer area (pdf-lib cannot decrypt). */
function looksEncrypted(bytes: Uint8Array): boolean {
  const tail = bytes.subarray(Math.max(0, bytes.length - 4096));
  const head = bytes.subarray(0, Math.min(bytes.length, 4096));
  const re = /\/Encrypt\s*(\d+\s+\d+\s+R|<<)/;
  const dec = (b: Uint8Array) => {
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return s;
  };
  return re.test(dec(tail)) || re.test(dec(head));
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Pre-read limit check: how many of the incoming files fit (count + total size), in order. */
export function checkLimits(
  existing: { size: number }[],
  incoming: { size: number }[],
): ('ok' | 'tooMany' | 'tooBig')[] {
  let count = existing.length;
  let total = existing.reduce((a, f) => a + f.size, 0);
  return incoming.map((f) => {
    if (count + 1 > MAX_FILES) return 'tooMany';
    if (total + f.size > MAX_TOTAL_BYTES) return 'tooBig';
    count++;
    total += f.size;
    return 'ok';
  });
}

/** hash → file ids, only for hashes shared by ≥2 files. */
export function duplicateGroups(files: Pick<FileEntry, 'id' | 'hash'>[]): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const f of files) by.set(f.hash, [...(by.get(f.hash) ?? []), f.id]);
  for (const [h, ids] of by) if (ids.length < 2) by.delete(h);
  return by;
}

/** fileId → the other file ids with identical bytes. */
export function duplicatesOf(files: Pick<FileEntry, 'id' | 'hash'>[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const ids of duplicateGroups(files).values()) for (const id of ids) out.set(id, ids.filter((x) => x !== id));
  return out;
}
