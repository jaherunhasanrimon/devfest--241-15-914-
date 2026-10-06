// Verifies a generated package with pdfjs (no text dumped):
//  - page count (optionally == expected)
//  - footer "<id> | Page X of Y" on EVERY page, >= 10pt, upright, inside the bottom 30pt strip
//  - no other text inside the footer strip (no overlap)
//  - optional: document order by matching a snippet from each page's first text
// Usage: node scripts/verify-package.mjs <package.pdf> [tenderId] [expectedPages]
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [file, tenderIdArg, expectedArg] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/verify-package.mjs <package.pdf> [tenderId] [expectedPages]');
  process.exit(2);
}
const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
const N = doc.numPages;
let fails = 0;
const fail = (m) => { fails++; console.log('  ✗ ' + m); };

if (expectedArg && Number(expectedArg) !== N) fail(`page count ${N} != expected ${expectedArg}`);
console.log(`${file}: ${N} pages`);

for (let i = 1; i <= N; i++) {
  const page = await doc.getPage(i);
  const vp = page.getViewport({ scale: 1 }); // honors /Rotate
  const tc = await page.getTextContent();
  const items = tc.items.filter((it) => it.str && it.str.trim());
  const re = new RegExp(`\\| Page ${i} of ${N}$`);
  const footer = items.find((it) => re.test(it.str) && (!tenderIdArg || it.str.startsWith(tenderIdArg + ' |')));
  if (!footer) { fail(`p${i}: footer missing`); continue; }
  // footer geometry in visual (viewport) coordinates
  const [a, b] = footer.transform;
  const size = Math.hypot(a, b);
  const m = pdfjsMul(vp.transform, footer.transform);
  const angle = Math.round((Math.atan2(m[1], m[0]) * 180) / Math.PI);
  const [, vy] = [m[4], m[5]]; // baseline point in viewport space (y grows downward)
  const fromBottom = vp.height - vy;
  if (size < 9.95) fail(`p${i}: footer size ${size.toFixed(1)}pt < 10`);
  if (Math.abs(angle) > 1) fail(`p${i}: footer not upright (angle ${angle})`);
  if (fromBottom < 0 || fromBottom > 30) fail(`p${i}: footer baseline ${fromBottom.toFixed(1)}pt from bottom (not in strip)`);
  // overlap: any other text whose baseline lies in the bottom 30pt strip
  for (const it of items) {
    if (it === footer) continue;
    const mm = pdfjsMul(vp.transform, it.transform);
    const fb = vp.height - mm[5];
    if (fb >= -1 && fb < 30) fail(`p${i}: other text in footer strip: "${it.str.slice(0, 30)}"`);
  }
  const first = items.find((it) => it !== footer)?.str.slice(0, 40) ?? '(image only)';
  console.log(`  p${String(i).padStart(2)} ${Math.round(vp.width)}x${Math.round(vp.height)} rot=${page.rotate} footer="${footer.str}" | ${first}`);
}
console.log(fails ? `FAILED (${fails})` : 'ALL CHECKS PASSED');
process.exit(fails ? 1 : 0);

function pdfjsMul(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}
