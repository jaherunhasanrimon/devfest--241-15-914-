import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useApp } from '../state/AppContext';
import type { Dict } from '../i18n';

type Tone = 'info' | 'success' | 'error';
interface Toast { id: number; tone: Tone; msg: (t: Dict) => string }

const ToastCtx = createContext<(tone: Tone, msg: (t: Dict) => string) => void>(() => {});
let seq = 0;

/** Toast messages are functions of the dictionary so they re-localize on language switch. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useApp();
  const push = useCallback((tone: Tone, msg: (t: Dict) => string) => {
    const id = ++seq;
    setToasts((ts) => [...ts.slice(-3), { id, tone, msg }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5000);
  }, []);
  const tones: Record<Tone, string> = {
    info: 'border-slate-200 bg-white text-slate-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-900',
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed right-4 top-20 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((x) => (
          <div key={x.id} className={`animate-rise pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-lift ${tones[x.tone]}`}>
            <span aria-hidden className="mt-0.5">{x.tone === 'success' ? '✓' : x.tone === 'error' ? '!' : 'i'}</span>
            <p className="flex-1 text-sm font-medium">{x.msg(t)}</p>
            <button
              aria-label={t.toast.close}
              onClick={() => setToasts((ts) => ts.filter((y) => y.id !== x.id))}
              className="-m-1 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
