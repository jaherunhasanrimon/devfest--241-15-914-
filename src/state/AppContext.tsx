import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { reducer, initialState, initialLang, persistLang, type Action, type AppState } from './reducer';
import { dicts, type Dict } from '../i18n';
import { sortRequirements } from '../core/tender';
import type { Requirement } from '../core/types';
import { computeStatuses, summarize, type StatusRow } from '../core/status';

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
  t: Dict;
  sortedReqs: Requirement[];
  rows: StatusRow[];
  summary: ReturnType<typeof summarize>;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(initialLang()));

  useEffect(() => {
    persistLang(state.lang);
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  // Revoke blob URL of a package once it is invalidated.
  const lastUrl = useRef<string | null>(null);
  useEffect(() => {
    const url = state.generated?.url ?? null;
    if (lastUrl.current && lastUrl.current !== url) URL.revokeObjectURL(lastUrl.current);
    lastUrl.current = url;
  }, [state.generated]);

  const sortedReqs = useMemo(() => sortRequirements(state.requirements), [state.requirements]);
  const rows = useMemo(
    () => computeStatuses(sortedReqs, state.matches, state.expiries, state.tender?.submission_deadline ?? ''),
    [sortedReqs, state.matches, state.expiries, state.tender],
  );
  const summary = useMemo(() => summarize(rows), [rows]);
  const value = useMemo(
    () => ({ state, dispatch, t: dicts[state.lang], sortedReqs, rows, summary }),
    [state, sortedReqs, rows, summary],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
