# Phases (memory — re-read at every phase start)

Loop: implement ONLY current phase → build + tests green → commit (+push) → Phase report (✅ tasks · 3-click check · ⚠ gaps · next) → STOP until "approved". Commits ≤25 min apart, format `<type>: <what> | AI prompt: "<task prompt>"`, log TASK lines in `.prompts.log`.
Priority when short: correct main tasks > live deploy > UX polish > bonus. Hard stop T+90 (start ≈ 18:11 → stop ≈ 19:41).

| Phase | Scope (spec §) | Status |
|---|---|---|
| P1 | Foundation + Load (4.1, 4.10 shell): scaffold, tokens, i18n, load/validate JSON (picker + drag-drop), tender card, sorted localized checklist, GitHub Pages auto-deploy | ✅ done |
| P2 | Upload + Duplicates (4.2, 4.6): multi-upload, ext+magic validation, page counts, preview, remove, bad-file messages, limits, duplicate badges | ✅ done |
| P3 | Match + Expiry + Status (4.3–4.5): reducer-enforced 1:1 + dup-group rule, unmatch/change, date input (cleared on change), status engine + Vitest, summary counts | ✅ done |
| P4 | Generate + Download (4.7, 4.8, Sec. 6): blocker gating, buildPackage, one-page cover, footer strip, filename, success card; verify script on sample-pack | ✅ done |
| P5 | QA + Submission: Bangla pass, edge cases, output/<id>_Package.pdf, screenshots/, README, deploy check | ✅ done |
| P6 | Bonus (≥10 min left): CSV → index toggle (default OFF) → auto-match → IndexedDB → BN cover → seal | |

## Sample-pack test cases (tender T-2026-0417, deadline 2026-10-20)
| File | Pages | Finding / hidden problem | Expected handling |
|---|---|---|---|
| company_logo.png | – | **Non-PDF** (no `%PDF-` magic) | Rejected with clear message |
| experience_cert.pdf + `experience_cert (1).pdf` | 2 | **Duplicate** (same SHA-256 91cb4a…) | Both badged "Duplicate of …"; group usable for ONE requirement (R05) |
| trade_license_2025.pdf | 1 | **Expired** (valid until 2025-06-30) | If matched to R01 → Expired, blocks |
| trade_license_2026.pdf | 1 | Valid until 2027-06-30 | R01 → OK |
| bank_solvency.pdf | 1 | Valid until 2026-12-31 | R04 → OK |
| 03_tin_certificate.pdf / 04_vat_certificate.pdf | 1 / 1 | No expiry | R02 / R03 |
| 02_technical_proposal.pdf | 6 | Multi-page | R08 |
| 01_financial_proposal.pdf | 2 | – | R09 |
| scan_0042.pdf | 1 | **Unhelpful name, image-only scan** = Signed Declaration | R10 (user must Preview to identify) |
| (none) | – | R06 Audited Financial, R07 Manufacturer's Auth (optional) | Not provided, no block |

No rotated/mixed-size/encrypted files in the pack (all 595×842) → must craft our own edge-case PDFs in P4/P5.
Edge cases to test anyway: expiry == deadline (OK), expiry 2026-10-19 (Expired), unsorted/string `order`, long titles, 30 docs on cover, damaged + password PDF, >30 files / >50 MB.

**Expected package:** 1 cover + R01 1 + R02 1 + R03 1 + R04 1 + R05 2 + R08 6 + R09 2 + R10 1 = **16 pages**, file `T-2026-0417_Package.pdf`.
