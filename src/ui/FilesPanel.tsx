import { useApp } from '../state/AppContext';

/** P1 shell; upload arrives in P2. */
export function FilesPanel() {
  const { t } = useApp();
  return (
    <section aria-labelledby="files-heading" className="card p-5 lg:sticky lg:top-24">
      <h2 id="files-heading" className="text-xl font-bold text-slate-900">{t.files.heading}</h2>
      <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        {t.files.emptyNoTender}
      </p>
    </section>
  );
}
