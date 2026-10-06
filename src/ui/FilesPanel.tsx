import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useToast } from './Toasts';
import { num } from '../i18n';
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  checkLimits,
  duplicatesOf,
  hasPdfExt,
  hasPdfMagic,
  inspectPdf,
  sha256Hex,
  type FileRejectReason,
} from '../core/files';
import type { FileEntry } from '../core/types';

interface Rejected { key: number; name: string; reason: FileRejectReason }
let rejSeq = 0;

/** Blob URLs for previews, created lazily and revoked when the file is removed. */
const previewUrls = new Map<string, string>();
function previewUrl(f: FileEntry): string {
  let u = previewUrls.get(f.id);
  if (!u) {
    u = URL.createObjectURL(new Blob([f.bytes as BlobPart], { type: 'application/pdf' }));
    previewUrls.set(f.id, u);
  }
  return u;
}

const MB = 1024 * 1024;

export function FilesPanel() {
  const { state, dispatch, t } = useApp();
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lang = state.lang;

  // Revoke preview URLs of files that are gone.
  useEffect(() => {
    const ids = new Set(state.files.map((f) => f.id));
    for (const [id, u] of previewUrls) if (!ids.has(id)) { URL.revokeObjectURL(u); previewUrls.delete(id); }
  }, [state.files]);

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    if (incoming.length === 0 || busy) return;
    const added: FileEntry[] = [];
    const rej: Rejected[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      if (!hasPdfExt(file.name)) { rej.push({ key: ++rejSeq, name: file.name, reason: 'notPdfExt' }); continue; }
      const lim = checkLimits([...state.files, ...added], [file])[0];
      if (lim !== 'ok') { rej.push({ key: ++rejSeq, name: file.name, reason: lim }); continue; }
      setBusy(file.name);
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await file.arrayBuffer());
      } catch {
        rej.push({ key: ++rejSeq, name: file.name, reason: 'readFail' });
        continue;
      }
      if (!hasPdfMagic(bytes)) { rej.push({ key: ++rejSeq, name: file.name, reason: 'notPdfMagic' }); continue; }
      const info = await inspectPdf(bytes);
      if (!info.ok) { rej.push({ key: ++rejSeq, name: file.name, reason: info.reason }); continue; }
      const hash = await sha256Hex(bytes);
      added.push({ id: crypto.randomUUID(), name: file.name, size: file.size, pageCount: info.pageCount, hash, bytes });
    }
    setBusy(null);
    dispatch({ type: 'addFiles', files: added });
    if (rej.length) setRejected((r) => [...rej, ...r]);
    if (added.length) toast('success', (tt) => tt.files.addedToast(added.length));
    if (rej.length) toast('error', (tt) => tt.files.rejectedToast(rej.length));
  }

  const dups = duplicatesOf(state.files);
  const nameOf = (id: string) => state.files.find((f) => f.id === id)?.name ?? '';
  const totalMb = (state.files.reduce((a, f) => a + f.size, 0) / MB).toFixed(1);

  return (
    <section aria-labelledby="files-heading" className="card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="files-heading" className="text-xl font-bold text-slate-900">{t.files.heading}</h2>
        <span className="text-xs text-slate-500">
          {t.files.usage(state.files.length, MAX_FILES, totalMb, MAX_TOTAL_BYTES / MB)}
        </span>
      </div>

      <button
        id="add-files-btn"
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void addFiles(e.dataTransfer.files); }}
        disabled={!!busy}
        className={`mt-4 flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          over ? 'border-primary-600 bg-primary-50' : 'border-slate-300 bg-slate-50 hover:border-primary-600 hover:bg-primary-50/50'
        }`}
      >
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-primary-100 text-xl text-primary-700">＋</span>
        <span className="font-semibold text-slate-900">{over ? t.files.dropActive : t.files.dropTitle}</span>
        <span className="text-sm text-slate-500">{t.files.dropHint}</span>
        <span className="text-xs text-slate-400">{t.files.limits(MAX_FILES, MAX_TOTAL_BYTES / MB)}</span>
      </button>
      <input
        ref={inputRef}
        id="pdf-file-input"
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
      />

      {busy && (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          {t.files.checking(busy)}
        </p>
      )}

      {rejected.length > 0 && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-red-900">{t.files.rejectedTitle}</p>
            <button id="dismiss-rejected-btn" onClick={() => setRejected([])} className="min-h-9 rounded-lg px-2 text-sm font-semibold text-red-800 hover:bg-red-100">
              {t.files.dismiss}
            </button>
          </div>
          <ul className="mt-1 space-y-1.5">
            {rejected.map((r) => (
              <li key={r.key} className="text-sm text-red-800">
                <span className="break-all font-medium">{r.name}</span> — {t.files.reasons[r.reason]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.files.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">{t.files.empty}</p>
      ) : (
        <ul className="mt-4 space-y-2" aria-label={t.files.heading}>
          {state.files.map((f) => {
            const dup = dups.get(f.id);
            return (
              <li key={f.id} id={`file-${f.id}`} className="animate-rise rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-xs font-bold text-red-700">PDF</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-semibold text-slate-900">{f.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.files.pages(f.pageCount)} · {num((f.size / 1024).toFixed(0), lang)} KB
                    </p>
                    {dup && (
                      <p className="mt-1.5">
                        <span className="chip bg-amber-50 text-amber-900 ring-1 ring-amber-200" title={t.files.duplicateHint}>
                          <span aria-hidden>⧉</span> {t.files.duplicateOf(dup.map(nameOf).join(', '))}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <a
                    id={`preview-${f.id}`}
                    href={previewUrl(f)}
                    target="_blank"
                    rel="noopener"
                    aria-label={t.files.previewLabel(f.name)}
                    className="btn-ghost min-h-11 flex-1 text-sm"
                  >
                    <span aria-hidden>👁</span> {t.files.preview}
                  </a>
                  <button
                    id={`remove-${f.id}`}
                    onClick={() => {
                      dispatch({ type: 'removeFile', fileId: f.id });
                      toast('info', (tt) => tt.files.removedToast(f.name));
                    }}
                    aria-label={t.files.removeLabel(f.name)}
                    className="btn-ghost min-h-11 text-sm text-red-700 hover:border-red-300 hover:bg-red-50"
                  >
                    <span aria-hidden>✕</span> {t.files.remove}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
