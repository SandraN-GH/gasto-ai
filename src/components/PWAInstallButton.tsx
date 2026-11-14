import { Download, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          compact
            ? 'w-full flex items-center justify-between px-3.5 h-10 rounded-xl text-xs font-semibold text-indigo-500 dark:text-[#c0c1ff] bg-indigo-500/10 hover:bg-indigo-500/18 transition-colors cursor-pointer'
            : 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer self-start'
        }
      >
        {compact ? (
          <>
            <span>Instalar aplicativo</span>
            <Download size={15} />
          </>
        ) : (
          <>
            <Download size={15} />
            <span>Instalar aplicativo</span>
          </>
        )}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'w-full flex items-center justify-between px-3.5 h-10 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer'
              : 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer self-start'
          }
        >
          {compact ? (
            <>
              <span>Instalar no iPhone/iPad</span>
              <Smartphone size={15} />
            </>
          ) : (
            <>
              <Smartphone size={15} />
              <span>Instalar no iPhone/iPad</span>
            </>
          )}
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Como instalar no iPhone ou iPad"
          >
            <div
              className="w-full max-w-sm rounded-2xl glass-surface p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Instalar no iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <ol className="text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  Toque no botão <strong>Compartilhar</strong> na barra do
                  Safari.
                </li>
                <li>
                  Role as opções e toque em{' '}
                  <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  Confirme tocando em <strong>Adicionar</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
