import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
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
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 lg:bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-2 rounded-xl bg-amber-500 text-slate-950 px-3.5 py-2 text-xs font-semibold shadow-lg"
    >
      <WifiOff size={14} className="shrink-0" />
      <span>
        Sem conexão com a internet. Algumas funções exigem rede para sincronizar.
      </span>
    </div>
  );
}
