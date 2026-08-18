import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { ConsoleAuthModal } from './features/auth/ConsoleAuthModal';
import { BusinessConsoleView } from './features/business/BusinessConsoleView';
import { ApplicationBrandingPanel } from './components/ApplicationBrandingPanel';

export default function App() {
  const { isAuthenticated, logout } = useAuth();
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showToast = (message: string) => {
    setStatusMsg(message);
    window.setTimeout(() => setStatusMsg(null), 4000);
  };

  if (!isAuthenticated) {
    return <ConsoleAuthModal onSuccess={() => {}} />;
  }

  return (
    <>
      <BusinessConsoleView onExitConsole={logout} />

      <button
        type="button"
        onClick={() => setBrandingOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-2xl bg-zinc-950 text-white text-xs font-black shadow-xl border border-zinc-700 flex items-center gap-2 hover:bg-zinc-800 transition"
      >
        <ImagePlus className="w-4 h-4" />
        Application Branding
      </button>

      {statusMsg && (
        <div className="fixed top-16 right-4 z-[70] bg-amber-500 text-zinc-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-xl border border-amber-600/30">
          {statusMsg}
        </div>
      )}

      {brandingOpen && (
        <ApplicationBrandingPanel
          onClose={() => setBrandingOpen(false)}
          showToast={showToast}
        />
      )}
    </>
  );
}
