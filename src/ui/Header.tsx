import { useApp } from '../state/AppContext';
import type { Lang } from '../core/types';

export function Header() {
  const { state, dispatch, t } = useApp();
  const opts: { v: Lang; label: string }[] = [
    { v: 'en', label: 'EN' },
    { v: 'bn', label: 'বাংলা' },
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 text-white shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
              <path d="M14 3v5h5M10 13h6M10 17h6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-900">{t.appTitle}</h1>
            <p className="hidden text-sm text-slate-500 sm:block">{t.appTagline}</p>
          </div>
        </div>
        <div role="radiogroup" aria-label={t.langLabel} className="flex rounded-xl border border-slate-300 bg-slate-100 p-1">
          {opts.map((o) => (
            <button
              key={o.v}
              id={`lang-${o.v}`}
              role="radio"
              aria-checked={state.lang === o.v}
              onClick={() => dispatch({ type: 'setLang', lang: o.v })}
              className={`min-h-9 min-w-14 rounded-lg px-3 text-sm font-semibold transition ${state.lang === o.v ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
