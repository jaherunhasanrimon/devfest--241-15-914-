import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { reqName } from '../i18n';
import { buildPackage, packageFileName, PackageError } from '../core/buildPackage';
import { todayLocalIso } from '../core/tender';
import regularUrl from '../assets/fonts/NotoSans-Regular.ttf?url';
import boldUrl from '../assets/fonts/NotoSans-Bold.ttf?url';

let fontCache: Promise<{ regular: Uint8Array; bold: Uint8Array }> | null = null;
function loadFonts() {
  fontCache ??= Promise.all([regularUrl, boldUrl].map(async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer())))
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((e) => { fontCache = null; throw e; });
  return fontCache;
}

type Err = { kind: 'file'; name: string } | { kind: 'generic' } | null;

export function GenerateBar() {
  const { state, dispatch, t, summary, rows } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Err>(null);
  const [hadPackage, setHadPackage] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const n = summary.blockers.length;
  const lang = state.lang;

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
    <div
      role="region"
      aria-label="Action bar"
      className="action-bar-shadow fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {/* Outdated Stale Notice */}
        {outdated && !busy && (
          <div
            role="status"
            className="mb-2 flex items-center gap-2 rounded-[6px] border border-[var(--needs)] bg-[var(--needs-soft)] px-3 py-2 text-sm font-medium text-[var(--needs)]"
          >
            <span>⚠️</span>
            <span>{t.package.stale}</span>
          </div>
        )}

        {/* Error Notice */}
        {err && (
          <div
            role="alert"
            className="mb-2 rounded-[6px] border border-[var(--missing)] bg-[var(--missing-soft)] px-3 py-2 text-sm font-medium text-[var(--missing)]"
          >
            {err.kind === 'file' ? t.package.failed(err.name) : t.package.failedGeneric}
          </div>
        )}

        {/* Package Result Panel (when ready and not outdated) */}
        {g && !outdated ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--ok)] text-xs text-white font-bold"
              >
                ✓
              </span>
              <div>
                <p className="font-semibold text-[var(--ink)]">
                  {t.package.ready(g.pageCount, Object.keys(state.matches).length)}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">{g.fileName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                id="preview-package-link"
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-base btn-secondary min-h-[44px] text-sm"
              >
                {t.action.preview}
              </a>
              <a
                id="download-package-btn"
                href={g.url}
                download={g.fileName}
                className="btn-base btn-primary min-h-[44px] text-base"
              >
                {t.action.download(g.fileName)}
              </a>
            </div>
          </div>
        ) : (
          /* Normal State: Blocked or Ready */
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {/* Left side: Status summary and clickable blocker links */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2" aria-live="polite">
                {n > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="flex items-center gap-1.5 text-left font-bold text-[var(--missing)] hover:underline md:cursor-default md:no-underline"
                  >
                    <span aria-hidden="true">▲</span>
                    <span>{t.action.fix(n)}</span>
                    <span className="text-xs font-normal md:hidden">({expanded ? 'hide' : 'show'})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 font-semibold text-[var(--ok)]">
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 place-items-center rounded-full bg-[var(--ok)] text-xs text-white"
                    >
                      ✓
                    </span>
                    <span>{t.action.ready}</span>
                  </div>
                )}
              </div>

              {/* Reasons list */}
              {n > 0 && (
                <div
                  id="action-bar-reasons"
                  className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${
                    expanded ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  {summary.blockers.map((b) => {
                    const reqTitle = reqName(b.req, lang);
                    const statusText = t.status[b.status === 'expiryNeeded' ? 'expiry_needed' : b.status === 'notProvided' ? 'not_provided' : b.status];
                    return (
                      <button
                        key={b.req.id}
                        type="button"
                        id={`reason-${b.req.id}`}
                        onClick={() => goTo(b.req.id)}
                        className="inline-flex items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:underline"
                      >
                        <span aria-hidden="true">•</span>
                        <span>{t.action.reason(reqTitle, statusText)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right side: Create package button */}
            <div className="flex items-center justify-end shrink-0">
              <button
                id="generate-btn"
                type="button"
                onClick={generate}
                disabled={busy}
                aria-disabled={n > 0 || busy}
                aria-describedby={n > 0 ? 'action-bar-reasons' : undefined}
                className="btn-base btn-primary min-h-[44px] px-6 text-base"
              >
                {busy ? (
                  <>
                    <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{t.action.creating}</span>
                  </>
                ) : (
                  <span>{t.action.create}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
