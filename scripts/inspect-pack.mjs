// Inspect PDFs without dumping content: hash, magic, page count, sizes, rotation, encryption.
// Usage: node scripts/inspect-pack.mjs [dir]
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';

const dir = process.argv[2] || 'sample-pack/documents';
for (const name of readdirSync(dir).sort()) {
  if (name.startsWith('.')) continue;
  const bytes = readFileSync(join(dir, name));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const magic = bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  const encryptedHint = bytes.includes(Buffer.from('/Encrypt'));
  let info = '';
  if (magic) {
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
      const pages = doc.getPages().map((p) => {
        const { width, height } = p.getSize();
        const rot = p.getRotation().angle;
        return `${Math.round(width)}x${Math.round(height)}${rot ? '@' + rot : ''}`;
      });
      info = `pages=${pages.length} [${[...new Set(pages)].join(', ')}]`;
    } catch (e) {
      info = `LOAD ERROR: ${String(e.message).slice(0, 80)}`;
    }
  }
  console.log(`${name.padEnd(28)} ${String(bytes.length).padStart(7)}B sha=${hash} pdfMagic=${magic} encrypt=${encryptedHint} ${info}`);
}
