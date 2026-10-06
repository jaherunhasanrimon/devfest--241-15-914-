import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { reducer, initialState, initialLang, persistLang, type Action, type AppState } from './reducer';
import { dicts, type Dict } from '../i18n';
import { sortRequirements } from '../core/tender';
import type { Requirement } from '../core/types';

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
  t: Dict;
  sortedReqs: Requirement[];
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
  const value = useMemo(
    () => ({ state, dispatch, t: dicts[state.lang], sortedReqs }),
    [state, sortedReqs],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
