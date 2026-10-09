import { useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { parseTenderJson, type ParseError } from '../core/tender';
import type { Dict } from '../i18n';

export function parseErrorText(t: Dict, e: ParseError): string {
  switch (e.code) {
    case 'notJson': return t.parseErrors.notJson;
    case 'noTender': return t.parseErrors.noTender;
    case 'tenderField': return t.parseErrors.tenderField(e.field);
    case 'badDeadline': return t.parseErrors.badDeadline;
    case 'noRequirements': return t.parseErrors.noRequirements;
    case 'reqField': return t.parseErrors.reqField(e.index, e.field);
    case 'dupReqId': return t.parseErrors.dupReqId(e.id);
  }
}

type LoadErr = { kind: 'parse'; e: ParseError } | { kind: 'notJsonFile' } | { kind: 'readFail' };

/** Shared loader: returns open() for the picker, a drop handler, input element and current error. */
export function useTenderLoader() {
  const { dispatch, t } = useApp();
  const [err, setErr] = useState<LoadErr | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
      setErr({ kind: 'notJsonFile' });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setErr({ kind: 'readFail' });
      return;
    }
    const res = parseTenderJson(text);
    if (!res.ok) {
      setErr({ kind: 'parse', e: res.error });
      return;
    }
    setErr(null);
    dispatch({ type: 'loadTender', tender: res.data.tender, requirements: res.data.requirements });
  }

  const errText = !err
    ? null
    : err.kind === 'parse'
      ? parseErrorText(t, err.e)
      : err.kind === 'notJsonFile'
        ? t.load.notJsonFile
        : t.load.readFail;

  const input = (
    <input
      ref={inputRef}
      id="tender-file-input"
      type="file"
      accept=".json,application/json"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        void handle(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );
  return { open: () => inputRef.current?.click(), handle, input, errText };
}

export function LoadTender() {
  const { t } = useApp();
  const { open, handle, input, errText } = useTenderLoader();
  const [over, setOver] = useState(false);

  return (
    <section
      aria-labelledby="load-heading"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void handle(e.dataTransfer.files?.[0]);
      }}
      className={`card animate-rise mx-auto max-w-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${over ? 'border-primary-600 bg-primary-50' : 'border-slate-300'
        }`}
    >
      <div aria-hidden className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-primary-100 text-primary-700">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
          <path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 id="load-heading" className="text-2xl font-bold text-slate-900">{t.load.heading}</h2>
      <p className="mx-auto mt-3 max-w-lg text-slate-600">{t.load.body}</p>
      <button id="open-tender-btn" onClick={open} className="btn-primary mt-8 min-h-14 px-8 text-lg">
        {t.load.button}
      </button>
      <p className="mt-3 text-sm text-slate-500">{over ? t.load.dropActive : t.load.drop}</p>
      {input}
      {errText && (
        <div role="alert" className="mx-auto mt-6 max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-left text-red-800">
          <p className="font-semibold">{t.load.errorTitle}</p>
          <p className="mt-1 text-sm">{errText}</p>
        </div>
      )}
    </section>
  );
}
