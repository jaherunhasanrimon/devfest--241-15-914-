import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { reqName } from '../i18n';
import { buildPackage, packageFileName, PackageError } from '../core/buildPackage';
import { todayLocalIso } from '../core/tender';
import regularUrl from '../assets/fonts/NotoSans-Regular.ttf?url';
import boldUrl from '../assets/fonts/NotoSans-Bold.ttf?url';

let fontCache: Promise<{ regular: Uint8Array; bold: Uint8Array }> | null = null;
function loadFonts() {
  // Bundled same-origin assets (no CDN).
  fontCache ??= Promise.all([regularUrl, boldUrl].map(async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer())))
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((e) => { fontCache = null; throw e; });
  return fontCache;
}

type Err = { kind: 'file'; name: string } | { kind: 'generic' } | null;

/** Sticky bottom bar: summary, blocking reasons (click → row), Generate, progress, success / outdated card. */
export function GenerateBar() {
  const { state, dispatch, t, summary, rows } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Err>(null);
  const [hadPackage, setHadPackage] = useState(false);
  const n = summary.blockers.length;
  const lang = state.lang;

  // Inputs that define the package; if any changes while building, the result is discarded.
  const inputs = { tender: state.tender, files: state.files, matches: state.matches, expiries: state.expiries };
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  useEffect(() => { setErr(null); }, [state.files, state.matches, state.expiries, state.tender]);

  function goTo(reqId: string) {
    const row = document.getElementById(`req-${reqId}`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = (document.getElementById(`expiry-${reqId}`) ?? document.getElementById(`file-select-${reqId}`)) as HTMLElement | null;
    setTimeout(() => focusable?.focus({ preventScroll: true }), 350);
  }

  async function generate() {
    if (n > 0 || busy || !state.tender) return;
    const start = inputsRef.current;
    setBusy(true);
    setErr(null);
    try {
      const docs = rows
        .filter((r) => r.fileId)
        .map((r) => {
          const f = state.files.find((x) => x.id === r.fileId)!;
          return { reqId: r.req.id, title_en: r.req.title_en, fileName: f.name, bytes: f.bytes };
        });
      const res = await buildPackage({ tender: state.tender, docs, fonts: await loadFonts(), madeOn: todayLocalIso() });
      const cur = inputsRef.current;
      if (cur.tender !== start.tender || cur.files !== start.files || cur.matches !== start.matches || cur.expiries !== start.expiries) return;
      const url = URL.createObjectURL(new Blob([res.bytes as BlobPart], { type: 'application/pdf' }));
      dispatch({ type: 'setGenerated', generated: { url, pageCount: res.pageCount, fileName: packageFileName(state.tender.tender_id) } });
      setHadPackage(true);
    } catch (e) {
      setErr(e instanceof PackageError ? { kind: 'file', name: e.fileName } : { kind: 'generic' });
    } finally {
      setBusy(false);
    }
  }

  const g = state.generated;
  const outdated = !g && hadPackage;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgb(15_23_42/0.06)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {g && (
          <div role="status" className="animate-rise mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-lg text-white">✓</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-emerald-900">{t.generate.successTitle}</p>
              <p className="break-all text-sm text-emerald-800">{t.generate.successBody(g.pageCount, g.fileName)}</p>
            </div>
            <a id="preview-package-link" href={g.url} target="_blank" rel="noopener" className="btn-ghost text-sm">
              {t.generate.preview}
            </a>
            <a id="download-package-btn" href={g.url} download={g.fileName} className="btn-primary min-h-12 bg-emerald-600 px-6 text-base hover:bg-emerald-700">
              <span aria-hidden>⬇</span> {t.generate.download}
            </a>
          </div>
        )}
        {outdated && !busy && (
          <p role="status" className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            <span aria-hidden>↻ </span>{t.generate.outdated}
          </p>
        )}
        {err && (
          <p role="alert" className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {err.kind === 'file' ? t.generate.failed(err.name) : t.generate.failedGeneric}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3" aria-live="polite">
            <span className="text-base font-semibold text-slate-900">{t.summary.ready(summary.ready, summary.total)}</span>
            <span aria-hidden className="text-slate-300">·</span>
            <span className={`chip ring-1 ${n ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'}`}>
              <span aria-hidden>{n ? '!' : '✓'}</span> {t.summary.problems(n)}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2" id="generate-reasons">
            {n > 0 ? (
              <>
                <span className="text-sm text-slate-600">{t.generate.blockedTitle}</span>
                {summary.blockers.map((b) => {
                  const name = reqName(b.req, lang);
                  return (
                    <button
                      key={b.req.id}
                      id={`reason-${b.req.id}`}
                      onClick={() => goTo(b.req.id)}
                      aria-label={`${t.generate.goTo(name)} — ${t.status[b.status]}`}
                      className={`min-h-9 max-w-full truncate rounded-lg px-2.5 text-sm font-medium underline-offset-2 hover:underline ${
                        b.status === 'expiryNeeded' ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-red-50 text-red-800 ring-1 ring-red-200'
                      }`}
                    >
                      {t.generate.reason(name, t.status[b.status])}
                    </button>
                  );
                })}
              </>
            ) : (
              !g && <span className="text-sm text-emerald-800">{t.generate.readyHint}</span>
            )}
          </div>

          <button
            id="generate-btn"
            onClick={generate}
            disabled={n > 0 || busy}
            aria-describedby="generate-reasons"
            className="btn-primary ml-auto min-h-12 px-6 text-base"
          >
            {busy ? (
              <>
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t.generate.working}
              </>
            ) : g || outdated ? (
              t.generate.again
            ) : (
              t.generate.button
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
