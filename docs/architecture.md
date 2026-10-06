# Architecture (memory — re-read at every phase start)

**Product:** frontend-only Tender Document Package Builder. Latest Chrome, all in-browser. No backend, no runtime network/CDN, no tracking.

## Stack
Vite + React + TS + Tailwind · pdf-lib + @pdf-lib/fontkit (bundled Noto Sans TTF for cover) · @fontsource Inter + Noto Sans Bengali · useReducer + context · Vitest (core only) · pdfjs-dist devDep (verify script only) · `vite base:'./'`. No other deps.

## Layout
- `src/core` — pure TS, no DOM: `types`, `status` engine, `matching` rules, `duplicates` grouping, `dates`, `buildPackage()`.
- `src/state` — one reducer: `{tender, requirements, files, matches{reqId→fileId}, expiries{reqId→iso}, lang, generated}`.
- `src/i18n` — `en.ts`, `bn.ts`; zero hard-coded UI strings.
- `src/ui` — Header, LoadTender, TenderCard, FilesPanel, Checklist/RequirementRow, BlockersPanel, GenerateBar, Toasts.

## Data
requirements.json = `{tender:{tender_id,title,procuring_entity,bidder,submission_deadline:"YYYY-MM-DD"}, requirements:[{id,order,title_en,title_bn,mandatory,has_expiry}]}`

## Flow
file → validate (ext `.pdf` AND `%PDF-` magic) → read bytes once → pdf-lib page count (try/catch; encrypted/damaged → message) + SHA-256 → `FileEntry`.
**Derived, never stored:** sorted requirements (numeric `order`, stable), duplicate groups, statuses, blockers.
**Any state change invalidates `generated`.**

## Rules (enforced in reducer, not just UI)
- Match strictly 1:1 file↔requirement; change/unmatch anytime.
- Duplicate group (same SHA-256) may be matched to at most ONE requirement total.
- Match change/removal clears that requirement's expiry.
- Status (exactly one): Missing (mandatory, no file, BLOCK) · Expiry date needed (has_expiry+file, no date, BLOCK) · Expired (expiry < deadline, BLOCK) · Not provided (optional, no file) · OK. Compare ISO strings only; expiry == deadline is OK.

## buildPackage
1. Cover (page 1, English, title_en): tender ID, title, entity, bidder, deadline, date made (local YYYY-MM-DD), included docs in order. Exactly ONE page (shrink / 2-column).
2. Each matched doc's pages in original order, docs by `order`; skip unmatched optional.
3. Footer on EVERY page `<tender_id> | Page X of Y`, ≥10pt, dark, in a ~30pt white strip added BELOW the visual bottom (extend MediaBox/CropBox; honor /Rotate and mixed sizes) — never overlaps content.
4. Download `<tender_id>_Package.pdf` (sanitize illegal chars).

## Limits
≤30 files, ≤50 MB total. Damaged/password-protected → clear message, never crash.
