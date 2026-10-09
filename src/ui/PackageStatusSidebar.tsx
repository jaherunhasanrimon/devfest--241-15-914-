import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { reqName, num } from '../i18n';
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

export function PackageStatusSidebar({ onNavigateToReq }: { onNavigateToReq?: (reqId: string) => void } = {}) {
  const { state, dispatch, t, summary, rows } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Err>(null);
  const [hadPackage, setHadPackage] = useState(false);
  const n = summary.blockers.length;
  const lang = state.lang;

  const inputs = { tender: state.tender, files: state.files, matches: state.matches, expiries: state.expiries };
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  useEffect(() => { setErr(null); }, [state.files, state.matches, state.expiries, state.tender]);

  function goTo(reqId: string) {
    if (onNavigateToReq) {
      onNavigateToReq(reqId);
    }
    setTimeout(() => {
      const row = document.getElementById(`req-${reqId}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('ring-2', 'ring-[var(--primary)]');
        setTimeout(() => row.classList.remove('ring-2', 'ring-[var(--primary)]'), 1200);
      }
      const focusable = (document.getElementById(`expiry-${reqId}`) ?? document.getElementById(`file-select-${reqId}`)) as HTMLElement | null;
      focusable?.focus({ preventScroll: true });
    }, 100);
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

  // Breakdown statistics
  const missingCount = rows.filter((r) => r.status === 'missing').length;
  const expiryCount = rows.filter((r) => r.status === 'expiryNeeded').length;
  const expiredCount = rows.filter((r) => r.status === 'expired').length;
  const okCount = rows.filter((r) => r.status === 'ok').length;
  const pct = summary.total > 0 ? Math.round((summary.ready / summary.total) * 100) : 0;

  return (
    <div className="panel p-5 space-y-4">
      {/* Header: Title and Overall Percentage */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ink)]">
            {t.sidebar.title}
          </h2>
          <p className="text-xs text-[var(--ink-muted)]">
            {t.summary.ready(summary.ready, summary.total)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            n === 0
              ? 'bg-[var(--ok-soft)] text-[var(--ok)]'
              : 'bg-[var(--missing-soft)] text-[var(--missing)]'
          }`}
        >
          {num(pct, lang)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className={`h-full progress-bar-fill ${n === 0 ? 'bg-[var(--ok)]' : 'bg-[var(--primary)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Status Breakdown Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {missingCount > 0 && (
          <span className="rounded-full bg-[var(--missing-soft)] px-2 py-0.5 font-semibold text-[var(--missing)]">
            ✕ {num(missingCount, lang)} {t.status.missing}
          </span>
        )}
        {expiryCount > 0 && (
          <span className="rounded-full bg-[var(--needs-soft)] px-2 py-0.5 font-semibold text-[var(--needs)]">
            ⏳ {num(expiryCount, lang)} {t.status.expiry_needed}
          </span>
        )}
        {expiredCount > 0 && (
          <span className="rounded-full bg-[var(--expired-soft)] px-2 py-0.5 font-semibold text-[var(--expired)]">
            ⏱ {num(expiredCount, lang)} {t.status.expired}
          </span>
        )}
        {okCount > 0 && (
          <span className="rounded-full bg-[var(--ok-soft)] px-2 py-0.5 font-semibold text-[var(--ok)]">
            ✓ {num(okCount, lang)} {t.status.ok}
          </span>
        )}
      </div>

      {/* Outdated Notice */}
      {outdated && !busy && (
        <div
          role="status"
          className="rounded-[6px] border border-[var(--needs)] bg-[var(--needs-soft)] p-3 text-xs font-medium text-[var(--needs)]"
        >
          <span className="font-bold">⚠️ {t.package.stale}</span>
        </div>
      )}

      {/* Error Alert */}
      {err && (
        <div
          role="alert"
          className="rounded-[6px] border border-[var(--missing)] bg-[var(--missing-soft)] p-3 text-xs font-medium text-[var(--missing)]"
        >
          {err.kind === 'file' ? t.package.failed(err.name) : t.package.failedGeneric}
        </div>
      )}

      {/* Package Ready Panel (When created and not stale) */}
      {g && !outdated ? (
        <div className="rounded-[8px] border border-[var(--ok)] bg-[var(--ok-soft)] p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 place-items-center rounded-full bg-[var(--ok)] text-xs text-white font-bold"
            >
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--ok)]">
                {t.package.ready(g.pageCount, Object.keys(state.matches).length)}
              </p>
              <p className="truncate text-xs text-[var(--ink-muted)]">{g.fileName}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <a
              id="download-package-btn"
              href={g.url}
              download={g.fileName}
              className="btn-base btn-primary w-full text-center text-sm font-semibold"
            >
              {t.action.download(g.fileName)}
            </a>
            <a
              id="preview-package-link"
              href={g.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base btn-secondary w-full text-center text-sm"
            >
              {t.action.preview}
            </a>
          </div>
        </div>
      ) : (
        /* Action & Interactive Blocker Area */
        <div className="space-y-3">
          {/* Interactive Blockers List */}
          {n > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--missing)]">
                <span>▲ {t.action.fix(n)}</span>
              </div>

              <div
                id="sidebar-reasons"
                className="space-y-1.5 max-h-[calc(100vh-16rem)] overflow-y-auto pr-0.5"
                role="list"
                aria-label={t.sidebar.blockersTitle}
              >
                {summary.blockers.map((b) => {
                  const reqTitle = reqName(b.req, lang);
                  const isExp = b.status === 'expiryNeeded' || b.status === 'expired';
                  const statusLabel =
                    t.status[
                      b.status === 'expiryNeeded'
                        ? 'expiry_needed'
                        : b.status === 'notProvided'
                          ? 'not_provided'
                          : b.status
                    ];

                  return (
                    <button
                      key={b.req.id}
                      type="button"
                      id={`reason-${b.req.id}`}
                      onClick={() => goTo(b.req.id)}
                      className={`group flex w-full items-start justify-between gap-2 rounded-[6px] border p-2 text-left text-xs transition ${
                        isExp
                          ? 'border-[var(--needs)]/30 bg-[var(--needs-soft)]/60 hover:bg-[var(--needs-soft)]'
                          : 'border-[var(--missing)]/30 bg-[var(--missing-soft)]/60 hover:bg-[var(--missing-soft)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--ink)] group-hover:underline">
                          {b.req.order}. {reqTitle}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${isExp ? 'text-[var(--needs)]' : 'text-[var(--missing)]'}`}>
                          {statusLabel}
                        </p>
                      </div>
                      <span className="shrink-0 text-[var(--primary)] text-[11px] font-medium opacity-80 group-hover:opacity-100">
                        {t.sidebar.clickToFix} →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[6px] border border-[var(--ok)]/30 bg-[var(--ok-soft)]/60 p-3 text-xs text-[var(--ok)]">
              <p className="font-bold flex items-center gap-1.5">
                <span>✓</span> {t.action.ready}
              </p>
              <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                {t.sidebar.allReady}
              </p>
            </div>
          )}

          {/* Create Button */}
          <button
            id="generate-btn"
            type="button"
            onClick={generate}
            disabled={busy || n > 0}
            aria-disabled={n > 0 || busy}
            aria-describedby={n > 0 ? 'sidebar-reasons' : undefined}
            className="btn-base btn-primary w-full text-center text-sm font-semibold shadow-none"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                <span>{t.action.creating}</span>
              </span>
            ) : (
              <span>{t.action.create}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
