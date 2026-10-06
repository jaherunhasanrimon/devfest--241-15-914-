export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string; // YYYY-MM-DD
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface TenderData {
  tender: Tender;
  requirements: Requirement[];
}

export interface FileEntry {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  hash: string; // SHA-256 hex
  bytes: Uint8Array;
}

export type Lang = 'en' | 'bn';

export type StatusKind = 'missing' | 'expiryNeeded' | 'expired' | 'notProvided' | 'ok';

export const BLOCKING: ReadonlySet<StatusKind> = new Set<StatusKind>(['missing', 'expiryNeeded', 'expired']);
