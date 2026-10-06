import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { MAX_FILES, MAX_TOTAL_BYTES, checkLimits, duplicatesOf, hasPdfExt, hasPdfMagic, inspectPdf, sha256Hex } from './files';

async function makePdf(pages: number): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) d.addPage([595, 842]);
  return d.save();
}
const enc = (s: string) => new TextEncoder().encode(s);

describe('file validation', () => {
  it('checks extension and magic bytes', () => {
    expect(hasPdfExt('a.PDF')).toBe(true);
    expect(hasPdfExt('logo.png')).toBe(false);
    expect(hasPdfMagic(enc('%PDF-1.7 ...'))).toBe(true);
    expect(hasPdfMagic(enc('\x89PNG....'))).toBe(false);
    expect(hasPdfMagic(new Uint8Array())).toBe(false);
  });
  it('counts pages of a valid PDF', async () => {
    expect(await inspectPdf(await makePdf(3))).toEqual({ ok: true, pageCount: 3 });
  });
  it('reports damaged and encrypted PDFs without throwing', async () => {
    expect(await inspectPdf(enc('%PDF-1.4\n garbage garbage'))).toEqual({ ok: false, reason: 'damaged' });
    const good = await makePdf(1);
    const withEnc = new Uint8Array([...good, ...enc('\ntrailer\n<< /Encrypt 9 0 R >>\n%%EOF')]);
    expect(await inspectPdf(withEnc)).toEqual({ ok: false, reason: 'encrypted' });
  });
});

describe('duplicates and limits', () => {
  it('groups identical hashes, marking every copy', async () => {
    const a = await sha256Hex(enc('same'));
    const b = await sha256Hex(enc('other'));
    const m = duplicatesOf([{ id: '1', hash: a }, { id: '2', hash: b }, { id: '3', hash: a }]);
    expect(m.get('1')).toEqual(['3']);
    expect(m.get('3')).toEqual(['1']);
    expect(m.has('2')).toBe(false);
  });
  it('enforces 30 files and 50 MB', () => {
    const existing = Array.from({ length: MAX_FILES - 1 }, () => ({ size: 1 }));
    expect(checkLimits(existing, [{ size: 1 }, { size: 1 }])).toEqual(['ok', 'tooMany']);
    expect(checkLimits([], [{ size: MAX_TOTAL_BYTES }, { size: 1 }])).toEqual(['ok', 'tooBig']);
  });
});
