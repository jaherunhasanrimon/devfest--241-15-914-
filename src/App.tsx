import { useState } from 'react';
import { useApp } from './state/AppContext';
import { Header } from './ui/Header';
import { StepRail } from './ui/StepRail';
import { LoadTender } from './ui/LoadTender';
import { TenderCard } from './ui/TenderCard';
import { Checklist } from './ui/Checklist';
import { FilesPanel } from './ui/FilesPanel';
import { PackageStatusSidebar } from './ui/PackageStatusSidebar';

export default function App() {
  const { state, t, summary } = useApp();
  const [mobileTab, setMobileTab] = useState<'docs' | 'status' | 'files'>('docs');

  const blockerCount = summary.blockers.length;

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] antialiased">
      <Header />

      <main className="mx-auto max-w-[1650px] px-4 pb-16 sm:px-6 lg:px-8">
        <StepRail />

        {!state.tender ? (
          <LoadTender />
        ) : (
          <div className="space-y-6">
            {/* Mobile / Narrow Screen Tab Switch (< 1024px) */}
            <div className="flex border-b border-[var(--line)] lg:hidden">
              <button
                type="button"
                id="tab-docs-btn"
                onClick={() => setMobileTab('docs')}
                className={`min-h-[44px] flex-1 border-b-2 py-2 text-center text-sm sm:text-base font-semibold transition ${
                  mobileTab === 'docs'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {t.tabs.documents} ({summary.total})
              </button>
              <button
                type="button"
                id="tab-status-btn"
                onClick={() => setMobileTab('status')}
                className={`min-h-[44px] flex-1 border-b-2 py-2 text-center text-sm sm:text-base font-semibold transition ${
                  mobileTab === 'status'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {t.tabs.status}
                {blockerCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-[var(--missing-soft)] px-2 py-0.5 text-xs text-[var(--missing)] font-bold">
                    {blockerCount}
                  </span>
                ) : (
                  <span className="ml-1.5 rounded-full bg-[var(--ok-soft)] px-2 py-0.5 text-xs text-[var(--ok)] font-bold">
                    ✓
                  </span>
                )}
              </button>
              <button
                type="button"
                id="tab-files-btn"
                onClick={() => setMobileTab('files')}
                className={`min-h-[44px] flex-1 border-b-2 py-2 text-center text-sm sm:text-base font-semibold transition ${
                  mobileTab === 'files'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {t.tabs.files} ({state.files.length})
              </button>
            </div>

            {/* Desktop Layout (1024px+): Left Status Sidebar, and Right Area containing TenderCard + [Checklist | FilesPanel] */}
            <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">
              {/* LEFT SIDEBAR: Status, Readiness & Actions */}
              <aside className="lg:sticky lg:top-20 lg:self-start space-y-6">
                <div className={mobileTab === 'status' ? 'block' : 'hidden lg:block'}>
                  <PackageStatusSidebar onNavigateToReq={() => setMobileTab('docs')} />
                </div>
              </aside>

              {/* MAIN CONTENT AREA */}
              <div className="min-w-0 space-y-6">
                <TenderCard />

                {/* Side-by-side: Required documents on left, Your files strictly on the right */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <div className={mobileTab === 'docs' ? 'block' : 'hidden lg:block'}>
                    <Checklist />
                  </div>

                  <div className={mobileTab === 'files' ? 'block' : 'hidden lg:block'}>
                    <FilesPanel />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
