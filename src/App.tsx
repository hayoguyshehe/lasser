import { useAppStore } from '@/store/appStore';
import { LandingPage } from '@/components/LandingPage';
import { UploadZone } from '@/components/UploadZone';
import { CanvasViewer } from '@/components/CanvasViewer';
import { DiagnosticsPanel } from '@/components/DiagnosticsPanel';
import { Toolbar } from '@/components/Toolbar';

function App() {
  const view = useAppStore((s) => s.view);
  const model = useAppStore((s) => s.model);

  if (view === 'landing') {
    return <LandingPage />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#f5f3ee] text-[#1a1a1a] overflow-hidden">
      <Toolbar />
      {!model ? (
        <UploadZone />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <CanvasViewer />
          <DiagnosticsPanel />
        </div>
      )}
    </div>
  );
}

export default App;
