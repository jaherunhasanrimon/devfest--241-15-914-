// Prints a short title snippet + any expiry/validity lines per PDF (no full text dump).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const dir = process.argv[2] || 'sample-pack/documents';
for (const name of readdirSync(dir).sort()) {
  if (!name.endsWith('.pdf')) continue;
  const doc = await getDocument({ data: new Uint8Array(readFileSync(join(dir, name))), verbosity: 0 }).promise;
  const p = await doc.getPage(1);
  const txt = (await p.getTextContent()).items.map((i) => i.str).join(' ').replace(/\s+/g, ' ');
  const hits = (txt.match(/[^.]{0,40}(valid|expir|until)[^.]{0,40}/gi) || []).slice(0, 2);
  console.log(`${name}: "${txt.slice(0, 70)}" ${hits.length ? '|| ' + hits.join(' ;; ') : ''} ${txt.length === 0 ? '(no text layer - image scan)' : ''}`);
}
