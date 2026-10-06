import { PDFDocument, PDFName, PDFPage, rgb, degrees, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Tender } from './types';

export const FOOTER_STRIP = 30; // pt of blank white space added below each page's visual bottom
export const FOOTER_SIZE = 10; // pt (spec: >= 10pt)
const FOOTER_BASELINE = 11; // pt above the visual bottom edge
const DARK = rgb(0.1, 0.12, 0.16);

export interface PackageDoc {
  reqId: string;
  title_en: string;
  fileName: string;
  bytes: Uint8Array;
}

export interface BuildInput {
  tender: Tender;
  docs: PackageDoc[]; // already in requirement order, unmatched optional ones skipped
  fonts: { regular: Uint8Array; bold: Uint8Array };
  madeOn: string; // local YYYY-MM-DD
}

export interface BuildResult {
  bytes: Uint8Array;
  pageCount: number;
}

export class PackageError extends Error {
  constructor(public fileName: string, cause: unknown) {
    super(`Could not read ${fileName}: ${String((cause as Error)?.message ?? cause)}`);
  }
}

export const footerText = (tenderId: string, x: number, y: number) => `${tenderId} | Page ${x} of ${y}`;

/** Removes characters illegal in file names on Windows/macOS/Linux. */
export function packageFileName(tenderId: string): string {
  const safe = tenderId
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
  return `${safe || 'Tender'}_Package.pdf`;
}

/** Builds the single package: one-page English cover, then every document's pages in order, footer on every page. */
export async function buildPackage(input: BuildInput): Promise<BuildResult> {
  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  const regular = await out.embedFont(input.fonts.regular, { subset: true });
  const bold = await out.embedFont(input.fonts.bold, { subset: true });

  // Load sources first so we know the total page count (Y) and each document's page range.
  const sources: { doc: PDFDocument; meta: PackageDoc }[] = [];
  for (const meta of input.docs) {
    try {
      sources.push({ doc: await PDFDocument.load(meta.bytes, { updateMetadata: false }), meta });
    } catch (e) {
      throw new PackageError(meta.fileName, e);
    }
  }
  const total = 1 + sources.reduce((a, s) => a + s.doc.getPageCount(), 0);

  const entries: CoverEntry[] = [];
  let next = 2;
  for (const s of sources) {
    const n = s.doc.getPageCount();
    entries.push({ title: s.meta.title_en, from: next, to: next + n - 1 });
    next += n;
  }

  const cover = out.addPage([595.28, 841.89]); // A4 portrait
  drawCover(cover, input, entries, total, regular, bold);
  drawFooter(cover, footerText(input.tender.tender_id, 1, total), regular);

  let pageNo = 2;
  for (const s of sources) {
    let copied: PDFPage[];
    try {
      copied = await out.copyPages(s.doc, s.doc.getPageIndices());
    } catch (e) {
      throw new PackageError(s.meta.fileName, e);
    }
    for (const p of copied) {
      out.addPage(p);
      addFooterStrip(p, footerText(input.tender.tender_id, pageNo, total), regular);
      pageNo++;
    }
  }

  out.setTitle(`${input.tender.tender_id} – Tender Submission Package`);
  out.setProducer('Tender Package Builder');
  out.setCreator('Tender Package Builder');
  const bytes = await out.save();
  return { bytes, pageCount: total };
}

/* ------------------------------------------------------------------ footer */

function normRotation(angle: number): 0 | 90 | 180 | 270 {
  const r = (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

/** Footer on the cover (which already reserves its bottom 30pt). */
function drawFooter(page: PDFPage, text: string, font: PDFFont) {
  const { width } = page.getSize();
  const w = font.widthOfTextAtSize(text, FOOTER_SIZE);
  page.drawText(text, { x: (width - w) / 2, y: FOOTER_BASELINE, size: FOOTER_SIZE, font, color: DARK });
}

/**
 * Extends the visible page box by FOOTER_STRIP on the page's *visual* bottom (honoring /Rotate),
 * paints that strip white and writes the footer upright in it. Original content is never covered.
 */
function addFooterStrip(page: PDFPage, text: string, font: PDFFont) {
  const rot = normRotation(page.getRotation().angle);
  const media = page.getMediaBox();
  const crop = page.getCropBox();
  // Visible area = crop ∩ media.
  let l = Math.max(crop.x, media.x);
  let b = Math.max(crop.y, media.y);
  let r = Math.min(crop.x + crop.width, media.x + media.width);
  let t = Math.min(crop.y + crop.height, media.y + media.height);
  if (r - l < 1 || t - b < 1) ({ x: l, y: b } = media), (r = media.x + media.width), (t = media.y + media.height);

  const S = FOOTER_STRIP;
  const tw = font.widthOfTextAtSize(text, FOOTER_SIZE);
  let strip: { x: number; y: number; w: number; h: number };
  let txt: { x: number; y: number; rotate: number };
  switch (rot) {
    case 0:
      b -= S;
      strip = { x: l, y: b, w: r - l, h: S };
      txt = { x: l + (r - l - tw) / 2, y: b + FOOTER_BASELINE, rotate: 0 };
      break;
    case 90: // displayed rotated clockwise: visual bottom = right edge
      r += S;
      strip = { x: r - S, y: b, w: S, h: t - b };
      txt = { x: r - FOOTER_BASELINE, y: b + (t - b - tw) / 2, rotate: 90 };
      break;
    case 180: // visual bottom = top edge
      t += S;
      strip = { x: l, y: t - S, w: r - l, h: S };
      txt = { x: l + (r - l + tw) / 2, y: t - FOOTER_BASELINE, rotate: 180 };
      break;
    case 270: // visual bottom = left edge
      l -= S;
      strip = { x: l, y: b, w: S, h: t - b };
      txt = { x: l + FOOTER_BASELINE, y: b + (t - b + tw) / 2, rotate: 270 };
      break;
  }

  isolateExistingContent(page);
  page.setMediaBox(l, b, r - l, t - b);
  page.setCropBox(l, b, r - l, t - b);
  for (const key of ['TrimBox', 'BleedBox', 'ArtBox']) page.node.delete(PDFName.of(key));

  page.drawRectangle({ x: strip.x, y: strip.y, width: strip.w, height: strip.h, color: rgb(1, 1, 1) });
  page.drawText(text, { x: txt.x, y: txt.y, size: FOOTER_SIZE, font, color: DARK, rotate: degrees(txt.rotate) });
}

/** Wrap original content in q/Q so an unbalanced CTM in the source can't move our footer. */
function isolateExistingContent(page: PDFPage) {
  const ctx = page.doc.context;
  const q = ctx.register(ctx.stream('q\n'));
  const Q = ctx.register(ctx.stream('\nQ\n'));
  page.node.wrapContentStreams(q, Q);
}

/* ------------------------------------------------------------------- cover */

interface CoverEntry { title: string; from: number; to: number }

const MARGIN = 56;
const COVER_BOTTOM = FOOTER_STRIP + 18; // keep cover content clear of the footer zone

function sanitizeForFont(s: string, font: PDFFont): string {
  // Replace characters the font can't encode so drawing never throws.
  const set = new Set(font.getCharacterSet());
  return Array.from(s.replace(/[\r\n\t]+/g, ' '))
    .map((ch) => (set.has(ch.codePointAt(0)!) ? ch : '?'))
    .join('');
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  const push = (w: string) => {
    // hard-break words longer than the line
    while (font.widthOfTextAtSize(w, size) > maxW && w.length > 1) {
      let i = w.length - 1;
      while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > maxW) i--;
      lines.push(w.slice(0, i));
      w = w.slice(i);
    }
    return w;
  };
  for (const word of words) {
    const tryLine = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(tryLine, size) <= maxW) cur = tryLine;
    else {
      if (cur) lines.push(cur);
      cur = push(word);
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function drawCover(page: PDFPage, input: BuildInput, entries: CoverEntry[], total: number, regular: PDFFont, bold: PDFFont) {
  const { width, height } = page.getSize();
  const T = input.tender;
  const S = (s: string, f: PDFFont) => sanitizeForFont(s, f);
  const contentW = width - MARGIN * 2;
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.32, 0.36, 0.42);
  const blue = rgb(0.15, 0.39, 0.92);

  // Header band
  page.drawRectangle({ x: 0, y: height - 10, width, height: 10, color: blue });
  let y = height - MARGIN - 6;
  page.drawText('TENDER SUBMISSION PACKAGE', { x: MARGIN, y, size: 11, font: bold, color: blue });
  y -= 30;
  for (const line of wrap(S(T.title, bold), bold, 22, contentW).slice(0, 3)) {
    page.drawText(line, { x: MARGIN, y, size: 22, font: bold, color: ink });
    y -= 27;
  }
  y -= 6;

  // Details table
  const rows: [string, string][] = [
    ['Tender ID', T.tender_id],
    ['Procuring entity', T.procuring_entity],
    ['Bidder', T.bidder],
    ['Submission deadline', T.submission_deadline],
    ['Date prepared', input.madeOn],
    ['Total pages', String(total)],
  ];
  const labelW = 130;
  for (const [k, v] of rows) {
    const lines = wrap(S(v, regular), regular, 11, contentW - labelW).slice(0, 2);
    page.drawText(k, { x: MARGIN, y, size: 10, font: bold, color: muted });
    lines.forEach((ln, i) => page.drawText(ln, { x: MARGIN + labelW, y: y - i * 14, size: 11, font: regular, color: ink }));
    y -= 14 * lines.length + 6;
  }
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.8, color: rgb(0.85, 0.87, 0.9) });
  y -= 24;
  page.drawText(`Included documents (${entries.length})`, { x: MARGIN, y, size: 13, font: bold, color: ink });
  y -= 20;

  drawDocList(page, entries.map((e) => ({ ...e, title: S(e.title, regular) })), { top: y, bottom: COVER_BOTTOM, left: MARGIN, width: contentW }, regular, bold, ink, muted);
}

/** Fits the document list into the box: 1 column, then 2 columns, shrinking the font; truncates as a last resort. */
function drawDocList(
  page: PDFPage,
  entries: CoverEntry[],
  box: { top: number; bottom: number; left: number; width: number },
  regular: PDFFont,
  bold: PDFFont,
  ink: ReturnType<typeof rgb>,
  muted: ReturnType<typeof rgb>,
) {
  const avail = box.top - box.bottom;
  const gutter = 18;
  type Layout = { cols: number; size: number; items: { num: string; lines: string[]; range: string }[]; colH: number[] } | null;

  const layout = (cols: number, size: number, maxLines: number): Layout => {
    const colW = (box.width - gutter * (cols - 1)) / cols;
    const lh = size * 1.3;
    const numW = bold.widthOfTextAtSize('30.', size) + 6;
    const rangeW = regular.widthOfTextAtSize('pp. 000–000', size * 0.9) + 8;
    const items = entries.map((e, i) => {
      const range = e.from === e.to ? `p. ${e.from}` : `pp. ${e.from}–${e.to}`;
      let lines = wrap(e.title, regular, size, colW - numW - rangeW);
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        let last = lines[maxLines - 1];
        while (last.length > 1 && regular.widthOfTextAtSize(last + '…', size) > colW - numW - rangeW) last = last.slice(0, -1);
        lines[maxLines - 1] = last + '…';
      }
      return { num: `${i + 1}.`, lines, range, h: lines.length * lh + size * 0.45 };
    });
    // Fill columns in order (column-major) so reading order stays top-to-bottom, left-to-right.
    const colH: number[] = new Array(cols).fill(0);
    let c = 0;
    for (const it of items) {
      if (colH[c] + it.h > avail) {
        c++;
        if (c >= cols) return null;
      }
      colH[c] += it.h;
    }
    return { cols, size, items, colH };
  };

  let chosen: Layout = null;
  outer: for (const maxLines of [3, 2, 1]) {
    for (let size = 11; size >= 6; size -= 0.5) {
      for (const cols of [1, 2]) {
        chosen = layout(cols, size, maxLines);
        if (chosen) break outer;
      }
    }
  }
  if (!chosen) chosen = layout(2, 6, 1) ?? { cols: 2, size: 6, items: [], colH: [] }; // practically unreachable

  const { cols, size } = chosen;
  const colW = (box.width - gutter * (cols - 1)) / cols;
  const lh = size * 1.3;
  const numW = bold.widthOfTextAtSize('30.', size) + 6;
  let c = 0;
  let y = box.top;
  for (const it of chosen.items) {
    const h = it.lines.length * lh + size * 0.45;
    if (box.top - y + h > avail + 0.01) {
      c++;
      y = box.top;
    }
    const x = box.left + c * (colW + gutter);
    page.drawText(it.num, { x, y, size, font: bold, color: muted });
    it.lines.forEach((ln, i) => page.drawText(ln, { x: x + numW, y: y - i * lh, size, font: regular, color: ink }));
    const rw = regular.widthOfTextAtSize(it.range, size * 0.9);
    page.drawText(it.range, { x: x + colW - rw, y, size: size * 0.9, font: regular, color: muted });
    y -= h;
  }
}
