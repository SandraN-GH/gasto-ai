import type { SupabaseClient } from '@supabase/supabase-js';
import { CheckCircle2, Eye, EyeOff, Loader2, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

interface ResetPasswordScreenProps {
  supabase: SupabaseClient;
  hasSession: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
  onDone: () => void;
}

export function ResetPasswordScreen({
  supabase,
  hasSession,
  darkMode,
  onToggleTheme,
  onDone,
}: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      setPassword('');
      setConfirmPassword('');

      if (error) {
        setErrorMsg(
          'Não foi possível redefinir a senha. O link pode ter expirado; solicite um novo.'
        );
        return;
      }

      setSuccess(true);
    } catch {
      setPassword('');
      setConfirmPassword('');
      setErrorMsg('Falha de conexão ao salvar a nova senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] flex flex-col justify-between p-5 sm:p-8 transition-colors">
      <header className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
        <span className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          GastoIA
        </span>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="w-10 h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="w-full max-w-[440px] mx-auto my-8">
        <div className="tier-1-card rounded-2xl p-6 sm:p-8 space-y-5">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  Senha redefinida
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  Sua nova senha já está ativa. Você pode continuar para o painel.
                </p>
              </div>
              <button
                type="button"
                onClick={onDone}
                className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Ir para o GastoIA
              </button>
            </div>
          ) : !hasSession ? (
            <div className="text-center space-y-4">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Link inválido ou expirado
              </h1>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Para redefinir sua senha, acesse o link enviado para o seu e-mail ou solicite uma nova recuperação na tela de login.
              </p>
              <button
                type="button"
                onClick={onDone}
                className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  Definir nova senha
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Escolha uma nova senha com pelo menos 8 caracteres.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400"
                >
                  {errorMsg}
                </div>
              )}

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
                >
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-new-password"
                  className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <span>{submitting ? 'Salvando...' : 'Atualizar senha'}</span>
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="max-w-[1440px] w-full mx-auto text-center text-xs text-[var(--text-muted)]">
        GastoIA · Gestão financeira pessoal
      </footer>
    </div>
  );
}
