import { useApp } from './state/AppContext';
import { Header } from './ui/Header';
import { StepRail } from './ui/StepRail';
import { LoadTender } from './ui/LoadTender';
import { TenderCard } from './ui/TenderCard';
import { Checklist } from './ui/Checklist';
import { FilesPanel } from './ui/FilesPanel';
import { GenerateBar } from './ui/GenerateBar';

export default function App() {
  const { state } = useApp();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-64 sm:px-6">
        <StepRail />
        {!state.tender ? (
          <LoadTender />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <TenderCard />
              <Checklist />
            </div>
            <aside className="space-y-6">
              <FilesPanel />
            </aside>
          </div>
        )}
      </main>
      {state.tender && <GenerateBar />}
    </div>
  );
}
