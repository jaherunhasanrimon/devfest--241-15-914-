import type { FileEntry, Lang, Requirement, Tender } from '../core/types';

export interface Generated {
  url: string;
  pageCount: number;
  fileName: string;
}

export interface AppState {
  tender: Tender | null;
  requirements: Requirement[];
  files: FileEntry[];
  matches: Record<string, string>; // reqId -> fileId
  expiries: Record<string, string>; // reqId -> YYYY-MM-DD
  lang: Lang;
  generated: Generated | null;
}

export type Action =
  | { type: 'loadTender'; tender: Tender; requirements: Requirement[] }
  | { type: 'setLang'; lang: Lang };

const LANG_KEY = 'tpb.lang';

export function initialLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}

export function persistLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable: ignore */
  }
}

export const initialState = (lang: Lang = 'en'): AppState => ({
  tender: null,
  requirements: [],
  files: [],
  matches: {},
  expiries: {},
  lang,
  generated: null,
});

/** Drops the generated package; caller should revoke its URL. */
function invalidate(s: AppState): AppState {
  return s.generated ? { ...s, generated: null } : s;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'loadTender':
      // A new tender resets matches and dates (requirement IDs may differ); files are kept.
      return invalidate({
        ...state,
        tender: action.tender,
        requirements: action.requirements,
        matches: {},
        expiries: {},
      });
    case 'setLang':
      return { ...state, lang: action.lang };
    default:
      return state;
  }
}
