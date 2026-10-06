# Design (memory — non-technical office staff; EN and Bangla equally polished)

## Layout
Header (title + EN | বাংলা toggle, persisted) → 4-step rail (Load tender · Add files · Match & dates · Generate) → main: checklist cards; side: files panel → sticky bottom bar: "X of Y ready · N problems" + Generate + reasons (clickable → scroll to row).

## Look
- Light, clean; slate neutrals + one blue primary; 8px grid; rounded cards; soft shadows.
- 16px base; Bangla line-height 1.6; Inter + Noto Sans Bengali (bundled, no CDN).
- Controls ≥44px; visible focus rings; WCAG AA contrast.

## Status chips (icon + text + color)
| Status | Icon | Color |
|---|---|---|
| Missing | ✕ | red |
| Expiry date needed | ⚠ | amber |
| Expired | ⏱ | red |
| Not provided | – | gray |
| OK | ✓ | green |

## Microcopy
Plain language that says what to do next. Friendly empty states. First screen = one big "Open requirements.json" button + drag-drop.

## Files
Dropzone + rows (name, pages, Preview [blob URL, new tab], ✕ remove, "Duplicate of X" badge). Per-requirement select with localized names; disabled options explain why (e.g. "used by R03", "duplicate already used"). Inline errors + toasts.

## Generate
Disabled while blockers exist, reasons beside it. Progress → success card: big Download button, preview link, page total. Flips to "outdated" when anything changes.

## a11y
Labelled inputs, aria-live for status changes, fully keyboard-usable.
