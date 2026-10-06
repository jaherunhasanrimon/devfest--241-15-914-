import { describe, expect, it } from 'vitest';
import { generateCsv, autoMatchFiles } from './bonus';
import type { FileEntry, Requirement } from './types';
import type { StatusRow } from './status';

describe('generateCsv', () => {
  it('generates properly formatted and escaped CSV with BOM', () => {
    const rows: StatusRow[] = [
      {
        req: { id: 'R01', order: 1, title_en: 'Trade License, "Special"', title_bn: '', mandatory: true, has_expiry: true },
        status: 'ok',
        fileId: 'f1',
        expiry: '2027-06-30',
      },
      {
        req: { id: 'R02', order: 2, title_en: 'TIN Certificate', title_bn: '', mandatory: true, has_expiry: false },
        status: 'missing',
      },
    ];

    const files: FileEntry[] = [
      { id: 'f1', name: 'trade_license.pdf', size: 100, pageCount: 1, hash: 'h1', bytes: new Uint8Array() },
    ];

    const csv = generateCsv(rows, files, {
      statusLabels: { ok: 'OK', missing: 'Missing' },
    });

    expect(csv.startsWith('\uFEFFDocument,File,Pages,Expiry,Status\r\n')).toBe(true);
    expect(csv).toContain('"Trade License, ""Special""",trade_license.pdf,1,2027-06-30,OK');
    expect(csv).toContain('TIN Certificate,—,0,—,Missing');
  });
});

describe('autoMatch with sample pack', () => {
  it('matches sample pack documents accurately using global best score', () => {
    const reqs: Requirement[] = [
      { id: 'R01', order: 1, title_en: 'Trade License', title_bn: '', mandatory: true, has_expiry: true },
      { id: 'R02', order: 2, title_en: 'TIN Certificate', title_bn: '', mandatory: true, has_expiry: false },
      { id: 'R03', order: 3, title_en: 'VAT Registration Certificate', title_bn: '', mandatory: true, has_expiry: false },
      { id: 'R04', order: 4, title_en: 'Bank Solvency Certificate', title_bn: '', mandatory: true, has_expiry: true },
      { id: 'R05', order: 5, title_en: 'Experience Certificate', title_bn: '', mandatory: true, has_expiry: false },
      { id: 'R06', order: 6, title_en: 'Audited Financial Statement', title_bn: '', mandatory: false, has_expiry: false },
      { id: 'R07', order: 7, title_en: "Manufacturer's Authorization", title_bn: '', mandatory: false, has_expiry: true },
      { id: 'R08', order: 8, title_en: 'Technical Proposal', title_bn: '', mandatory: true, has_expiry: false },
      { id: 'R09', order: 9, title_en: 'Financial Proposal', title_bn: '', mandatory: true, has_expiry: false },
      { id: 'R10', order: 10, title_en: 'Signed Declaration', title_bn: '', mandatory: true, has_expiry: false },
    ];

    const names = [
      '01_financial_proposal.pdf',
      '02_technical_proposal.pdf',
      '03_tin_certificate.pdf',
      '04_vat_certificate.pdf',
      'bank_solvency.pdf',
      'experience_cert.pdf',
      'scan_0042.pdf',
      'trade_license_2026.pdf',
    ];

    const files: FileEntry[] = names.map((name, i) => ({
      id: 'f' + i,
      name,
      size: 100,
      pageCount: 1,
      hash: 'hash_' + i,
      bytes: new Uint8Array(),
    }));

    const res = autoMatchFiles(reqs, files, {});
    expect(res.matchedCount).toBe(7);
    expect(res.matches.R08).toBe('f1'); // Technical Proposal -> 02_technical_proposal.pdf
    expect(res.matches.R09).toBe('f0'); // Financial Proposal -> 01_financial_proposal.pdf
    expect(res.matches.R01).toBe('f7'); // Trade License -> trade_license_2026.pdf
  });
});
