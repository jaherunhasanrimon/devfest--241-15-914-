import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { buildPackage, packageFileName, FOOTER_STRIP, type PackageDoc } from './buildPackage';
import { parseTenderJson, sortRequirements } from './tender';

const root = join(__dirname, '../..');
const fonts = {
  regular: new Uint8Array(readFileSync(join(root, 'src/assets/fonts/NotoSans-Regular.ttf'))),
  bold: new Uint8Array(readFileSync(join(root, 'src/assets/fonts/NotoSans-Bold.ttf'))),
};
const tender = { tender_id: 'T/2026:01', title: 'Edge cases', procuring_entity: 'E', bidder: 'B', submission_deadline: '2026-10-20' };

async function edgePdf(): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const f = await d.embedFont(StandardFonts.Helvetica);
  const specs: [number, number, number][] = [[595, 842, 0], [595, 842, 90], [842, 595, 180], [612, 792, 270], [1191, 842, 0]];
  for (const [w, h, rot] of specs) {
    const p = d.addPage([w, h]);
    p.setRotation(degrees(rot));
    p.drawRectangle({ x: 0, y: 0, width: w, height: h, borderColor: undefined, color: undefined });
    p.drawText(`content-bottom rot=${rot}`, { x: 20, y: 2, size: 12, font: f }); // text touching the bottom edge
  }
  // page with an offset CropBox
  const c = d.addPage([600, 800]);
  c.setCropBox(50, 100, 500, 600);
  c.drawText('cropped', { x: 60, y: 110, size: 12, font: f });
  return d.save();
}

describe('buildPackage', () => {
  it('sanitizes the file name', () => {
    expect(packageFileName('T/2026:01*?')).toBe('T_2026_01___Package.pdf');
    expect(packageFileName('T-2026-0417')).toBe('T-2026-0417_Package.pdf');
    expect(packageFileName('...')).toBe('Tender_Package.pdf');
  });

  it('handles rotation, mixed sizes and crop boxes; adds a strip on the visual bottom', async () => {
    const bytes = await edgePdf();
    const res = await buildPackage({ tender, docs: [{ reqId: 'R', title_en: 'Edge', fileName: 'e.pdf', bytes }], fonts, madeOn: '2026-10-06' });
    expect(res.pageCount).toBe(7);
    const out = await PDFDocument.load(res.bytes);
    expect(out.getPageCount()).toBe(7);
    const src = await PDFDocument.load(bytes);
    out.getPages().slice(1).forEach((p, i) => {
      const s = src.getPage(i);
      const sb = s.getCropBox();
      const ob = p.getCropBox();
      const rot = p.getRotation().angle;
      expect(rot).toBe(s.getRotation().angle);
      // the extra space is added only on the edge that is visually at the bottom
      const grow = { 0: [0, -FOOTER_STRIP, 0, FOOTER_STRIP], 90: [0, 0, FOOTER_STRIP, 0], 180: [0, 0, 0, FOOTER_STRIP], 270: [-FOOTER_STRIP, 0, FOOTER_STRIP, 0] }[rot]!;
      expect(ob.x).toBeCloseTo(sb.x + grow[0]);
      expect(ob.y).toBeCloseTo(sb.y + grow[1]);
      if (rot === 0) expect(ob.height).toBeCloseTo(sb.height + FOOTER_STRIP);
      if (rot === 90 || rot === 270) expect(ob.width).toBeCloseTo(sb.width + FOOTER_STRIP);
      if (rot === 180) expect(ob.height).toBeCloseTo(sb.height + FOOTER_STRIP);
    });
    mkdirSync(join(root, 'output/test'), { recursive: true });
    writeFileSync(join(root, 'output/test/edge_cases.pdf'), res.bytes);
  });

  it('fits a cover for 30 documents with long titles on exactly one page', async () => {
    const one = await PDFDocument.create();
    one.addPage([595, 842]);
    const b = await one.save();
    const docs: PackageDoc[] = Array.from({ length: 30 }, (_, i) => ({
      reqId: `R${i}`,
      title_en: `Requirement number ${i + 1} with a deliberately very long English title that goes on and on to test wrapping — Ünïcödé ✓ বাংলা`,
      fileName: `f${i}.pdf`,
      bytes: b,
    }));
    const res = await buildPackage({ tender, docs, fonts, madeOn: '2026-10-06' });
    expect(res.pageCount).toBe(31);
    writeFileSync(join(root, 'output/test/cover_30_docs.pdf'), res.bytes);
  });

  const pack = join(root, 'sample-pack');
  it.skipIf(!existsSync(pack))('builds the sample-pack package (16 pages)', async () => {
    const parsed = parseTenderJson(readFileSync(join(pack, 'requirements.json'), 'utf8'));
    if (!parsed.ok) throw new Error('bad json');
    const map: Record<string, string> = {
      R01: 'trade_license_2026.pdf', R02: '03_tin_certificate.pdf', R03: '04_vat_certificate.pdf', R04: 'bank_solvency.pdf',
      R05: 'experience_cert.pdf', R08: '02_technical_proposal.pdf', R09: '01_financial_proposal.pdf', R10: 'scan_0042.pdf',
    };
    const docs = sortRequirements(parsed.data.requirements)
      .filter((r) => map[r.id])
      .map((r) => ({ reqId: r.id, title_en: r.title_en, fileName: map[r.id], bytes: new Uint8Array(readFileSync(join(pack, 'documents', map[r.id]))) }));
    const res = await buildPackage({ tender: parsed.data.tender, docs, fonts, madeOn: '2026-10-06' });
    expect(res.pageCount).toBe(16);
    mkdirSync(join(root, 'output'), { recursive: true });
    writeFileSync(join(root, 'output', packageFileName(parsed.data.tender.tender_id)), res.bytes);
  });
});
