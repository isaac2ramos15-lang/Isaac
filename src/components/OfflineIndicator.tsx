import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-lg bg-[#090f1a]/94 border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 shadow-lg pointer-events-none">
      <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span>Modo Sin Internet — Juego y récords locales activos</span>
    </div>
  );
}
