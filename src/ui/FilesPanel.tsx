import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { useToast } from './Toasts';
import { reqName } from '../i18n';
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  checkLimits,
  duplicatesOf,
  hasPdfExt,
  hasPdfMagic,
  inspectPdf,
  sha256Hex,
} from '../core/files';
import type { FileEntry } from '../core/types';

interface NoticeItem {
  id: number;
  text: string;
}

let noticeSeq = 0;

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
  const { state, dispatch, t, sortedReqs } = useApp();
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lang = state.lang;

  useEffect(() => {
    const ids = new Set(state.files.map((f) => f.id));
    for (const [id, u] of previewUrls) {
      if (!ids.has(id)) {
        URL.revokeObjectURL(u);
        previewUrls.delete(id);
      }
    }
  }, [state.files]);

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    if (incoming.length === 0 || busy) return;

    const added: FileEntry[] = [];
    const newNotices: NoticeItem[] = [];

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      if (!hasPdfExt(file.name)) {
        newNotices.push({ id: ++noticeSeq, text: t.notice.notPdf(file.name) });
        continue;
      }
      const lim = checkLimits([...state.files, ...added], [file])[0];
      if (lim !== 'ok') {
        if (lim === 'tooMany' || lim === 'tooBig') {
          newNotices.push({ id: ++noticeSeq, text: t.notice.limit(incoming.length - i) });
          break;
        } else {
          newNotices.push({ id: ++noticeSeq, text: t.notice.notPdf(file.name) });
          continue;
        }
      }

      setBusy(file.name);
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await file.arrayBuffer());
      } catch {
        newNotices.push({ id: ++noticeSeq, text: t.notice.readFail(file.name) });
        continue;
      }

      if (!hasPdfMagic(bytes)) {
        newNotices.push({ id: ++noticeSeq, text: t.notice.notPdf(file.name) });
        continue;
      }

      const info = await inspectPdf(bytes);
      if (!info.ok) {
        if (info.reason === 'encrypted') {
          newNotices.push({ id: ++noticeSeq, text: t.files.encrypted });
        } else if (info.reason === 'damaged') {
          newNotices.push({ id: ++noticeSeq, text: t.files.damaged });
        } else {
          newNotices.push({ id: ++noticeSeq, text: t.notice.readFail(file.name) });
        }
        continue;
      }

      const hash = await sha256Hex(bytes);
      added.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        pageCount: info.pageCount,
        hash,
        bytes,
      });
    }

    setBusy(null);
    if (added.length) {
      dispatch({ type: 'addFiles', files: added });
      toast('success', (tt) => tt.files.addedToast?.(added.length) ?? `${added.length} files added`);
    }
    if (newNotices.length) {
      setNotices((prev) => [...newNotices, ...prev]);
    }
  }

  const dups = duplicatesOf(state.files);
  const nameOf = (id: string) => state.files.find((f) => f.id === id)?.name ?? '';
  const totalMb = (state.files.reduce((a, f) => a + f.size, 0) / MB).toFixed(1);

  // Map file ID -> requirement title if matched
  const fileToReqTitle = new Map<string, string>();
  for (const [reqId, fId] of Object.entries(state.matches)) {
    if (fId) {
      const r = sortedReqs.find((x) => x.id === reqId);
      if (r) fileToReqTitle.set(fId, reqName(r, lang));
    }
  }

  return (
    <section aria-labelledby="files-pane-heading" className="panel p-5">
      {/* Notices banner list above files pane */}
      {notices.length > 0 && (
        <div role="alert" className="mb-4 space-y-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-2 rounded-[6px] border border-[var(--missing)] bg-[var(--missing-soft)] p-3 text-sm text-[var(--missing)]"
            >
              <span>{n.text}</span>
              <button
                type="button"
                onClick={() => setNotices((prev) => prev.filter((item) => item.id !== n.id))}
                className="ml-2 font-semibold hover:underline"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pane Header */}
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="files-pane-heading" className="text-[20px] font-bold text-[var(--ink)]">
          {t.files.count(state.files.length)}
        </h2>
        <span className="text-xs text-[var(--ink-muted)]">
          {t.files.usage(state.files.length, MAX_FILES, totalMb, MAX_TOTAL_BYTES / MB)}
        </span>
      </div>

      {/* Drop Zone: Keyboard focusable with Enter or Space */}
      <div
        role="button"
        tabIndex={0}
        id="add-files-btn"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        aria-label={t.files.dropTitle}
        className={`mt-4 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-[6px] border-2 border-dashed p-4 text-center transition ${
          over
            ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
            : 'border-[var(--line)] bg-[var(--canvas)] hover:border-[var(--primary)]'
        }`}
      >
        <span className="text-base font-semibold text-[var(--ink)]">
          {t.files.dropTitle}
        </span>
        <button
          type="button"
          tabIndex={-1}
          className="btn-base btn-secondary mt-2 min-h-[36px] py-1 text-sm font-medium"
        >
          {t.files.dropChoose}
        </button>
      </div>

      <input
        ref={inputRef}
        id="pdf-file-input"
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {busy && (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          {t.files.checking(busy)}
        </p>
      )}

      {/* Files List */}
      {state.files.length === 0 ? (
        <p className="mt-5 text-center text-sm text-[var(--ink-muted)]">
          {t.files.empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3" aria-label={t.files.title}>
          {state.files.map((f) => {
            const dup = dups.get(f.id);
            const usedTitle = fileToReqTitle.get(f.id);

            return (
              <li
                key={f.id}
                id={`file-${f.id}`}
                className="file-row-enter rounded-[6px] border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-col gap-1.5">
                  {/* File Name and Page Count */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words font-semibold text-[var(--ink)] leading-snug">
                      {f.name}
                    </p>
                    <span className="shrink-0 text-xs text-[var(--ink-muted)]">
                      {t.files.pages(f.pageCount)}
                    </span>
                  </div>

                  {/* Used for <document> */}
                  {usedTitle && (
                    <p className="text-xs text-[var(--ink-muted)]">
                      {t.files.usedFor(usedTitle)}
                    </p>
                  )}

                  {/* Duplicate badge */}
                  {dup && dup.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-[var(--dup-soft)] px-2 py-0.5 font-semibold text-[var(--dup)]">
                        {t.files.duplicate}
                      </span>
                      <span className="text-[var(--ink-muted)]">
                        {t.files.duplicateOf(dup.map(nameOf).join(', '))}
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'removeFile', fileId: f.id })}
                        className="font-medium text-[var(--primary)] underline hover:text-[var(--ink)]"
                      >
                        {t.files.removeCopy}
                      </button>
                    </div>
                  )}

                  {/* Actions: Open (Preview) & Remove */}
                  <div className="mt-1 flex items-center justify-end gap-2 border-t border-[var(--line)] pt-2">
                    <a
                      id={`preview-${f.id}`}
                      href={previewUrl(f)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-base btn-ghost min-h-[38px] px-3 text-sm font-medium"
                    >
                      {t.files.open}
                    </a>
                    <button
                      id={`remove-${f.id}`}
                      type="button"
                      onClick={() => dispatch({ type: 'removeFile', fileId: f.id })}
                      className="btn-base btn-ghost min-h-[38px] px-3 text-sm font-medium text-[var(--missing)] hover:bg-[var(--missing-soft)]"
                    >
                      {t.files.remove}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
