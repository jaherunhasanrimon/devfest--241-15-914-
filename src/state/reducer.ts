import type { FileEntry, Lang, Requirement, Tender } from '../core/types';
import { canMatch } from '../core/matching';
import { isIsoDate } from '../core/tender';

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
  | { type: 'setLang'; lang: Lang }
  | { type: 'addFiles'; files: FileEntry[] }
  | { type: 'removeFile'; fileId: string }
  | { type: 'match'; reqId: string; fileId: string | null }
  | { type: 'setExpiry'; reqId: string; date: string };

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
    case 'addFiles':
      if (action.files.length === 0) return state;
      return invalidate({ ...state, files: [...state.files, ...action.files] });
    case 'removeFile': {
      if (!state.files.some((f) => f.id === action.fileId)) return state;
      const matches = { ...state.matches };
      const expiries = { ...state.expiries };
      for (const [reqId, fid] of Object.entries(matches)) {
        if (fid === action.fileId) {
          delete matches[reqId];
          delete expiries[reqId];
        }
      }
      return invalidate({
        ...state,
        files: state.files.filter((f) => f.id !== action.fileId),
        matches,
        expiries,
      });
    }
    case 'match': {
      const { reqId, fileId } = action;
      const current = state.matches[reqId];
      if ((current ?? null) === fileId) return state; // unchanged: keep the date
      const matches = { ...state.matches };
      const expiries = { ...state.expiries };
      if (fileId === null) {
        delete matches[reqId];
      } else {
        const check = canMatch(reqId, fileId, state.files, state.matches, state.requirements.map((r) => r.id));
        if (!check.ok) return state; // rule enforced here, not only in the UI
        matches[reqId] = fileId;
      }
      delete expiries[reqId]; // any change of match clears the expiry date
      return invalidate({ ...state, matches, expiries });
    }
    case 'setExpiry': {
      const req = state.requirements.find((r) => r.id === action.reqId);
      if (!req || !req.has_expiry || !state.matches[action.reqId]) return state;
      const expiries = { ...state.expiries };
      if (action.date && isIsoDate(action.date)) expiries[action.reqId] = action.date;
      else delete expiries[action.reqId];
      if (expiries[action.reqId] === state.expiries[action.reqId]) return state;
      return invalidate({ ...state, expiries });
    }
    default:
      return state;
  }
}
