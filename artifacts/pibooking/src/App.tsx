import { useAuth } from './hooks/useAuth';
import { ConsoleAuthModal } from './features/auth/ConsoleAuthModal';
import { BusinessConsoleView } from './features/business/BusinessConsoleView';

export default function App() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <ConsoleAuthModal onSuccess={() => {}} />;
  }

  return <BusinessConsoleView onExitConsole={logout} />;
}
