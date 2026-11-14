import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { useState } from 'react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'confirm_email';

interface AuthScreenProps {
  supabase: SupabaseClient;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export function AuthScreen({
  supabase,
  darkMode,
  onToggleTheme,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resending, setResending] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setInfoMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setErrorMsg('Preencha e-mail e senha.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      setPassword('');

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('email not confirmed')) {
          setPendingEmail(normalizedEmail);
          setMode('confirm_email');
          return;
        }
        // Mensagem neutra sem revelar se o e-mail existe
        setErrorMsg('E-mail ou senha incorretos.');
      }
    } catch {
      setPassword('');
      setErrorMsg('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMsg('Informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      setPassword('');
      setConfirmPassword('');

      if (error) {
        setErrorMsg(
          'Não foi possível criar a conta. Verifique os dados ou tente entrar.'
        );
        return;
      }

      // Quando confirmação de e-mail está ativa no Supabase, session vem null
      if (data.user && !data.session) {
        setPendingEmail(normalizedEmail);
        setMode('confirm_email');
      }
    } catch {
      setPassword('');
      setConfirmPassword('');
      setErrorMsg('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMsg('Informe o e-mail da sua conta.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        }
      );

      if (error) {
        if (error.status === 429) {
          setErrorMsg(
            'Muitas solicitações em sequência. Aguarde alguns minutos antes de tentar novamente.'
          );
          return;
        }
        setErrorMsg(
          'Não foi possível processar a solicitação agora. Tente novamente.'
        );
        return;
      }

      // Sempre exibe resposta neutra sem revelar se o e-mail existe
      setInfoMsg(
        'Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.'
      );
    } catch {
      setErrorMsg('Não foi possível solicitar a redefinição. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingEmail || resending) return;
    setResending(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setErrorMsg('Aguarde alguns instantes antes de reenviar o e-mail.');
      } else {
        setInfoMsg('E-mail de confirmação reenviado com sucesso.');
      }
    } catch {
      setErrorMsg('Falha de rede ao reenviar confirmação.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] flex flex-col justify-between p-5 sm:p-8 transition-colors">
      {/* Topo discreto com marca e seletor de tema */}
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

      {/* Cartão central de autenticação */}
      <main className="w-full max-w-[440px] mx-auto my-8">
        <div className="tier-1-card rounded-2xl p-6 sm:p-8 space-y-6">
          {mode === 'confirm_email' ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/12 text-indigo-400 flex items-center justify-center mx-auto">
                <MailCheck size={28} />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  Confirme seu e-mail
                </h1>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Enviamos um link de confirmação para{' '}
                  <strong className="text-[var(--text-primary)]">
                    {pendingEmail}
                  </strong>
                  . Abra sua caixa de entrada e clique no link para ativar sua conta.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400 text-left">
                  {errorMsg}
                </div>
              )}

              {infoMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 text-left flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {resending && <Loader2 size={16} className="animate-spin" />}
                  <span>
                    {resending
                      ? 'Reenviando...'
                      : 'Reenviar e-mail de confirmação'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full h-10 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                  Voltar para o login
                </button>
              </div>
            </div>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-3 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Voltar ao login</span>
                </button>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  Recuperar senha
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Informe seu e-mail para receber o link de redefinição.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400">
                  {errorMsg}
                </div>
              )}

              {infoMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 leading-relaxed">
                  {infoMsg}
                </div>
              )}

              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
                >
                  E-mail
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <span>
                  {submitting ? 'Enviando...' : 'Enviar link de recuperação'}
                </span>
              </button>
            </form>
          ) : (
            <>
              {/* Abas Entrar / Criar conta */}
              <div
                role="tablist"
                aria-label="Acesso à conta"
                className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => switchMode('login')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'login'
                      ? 'bg-indigo-500 text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => switchMode('signup')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-indigo-500 text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {mode === 'login'
                    ? 'Acesse sua conta'
                    : 'Crie sua conta no GastoIA'}
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {mode === 'login'
                    ? 'Acompanhe seus gastos, orçamentos e previsões em tempo real.'
                    : 'Comece a organizar suas finanças pessoais com apoio de IA.'}
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400 leading-relaxed"
                >
                  {errorMsg}
                </div>
              )}

              <form
                onSubmit={mode === 'login' ? handleLogin : handleSignup}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
                    >
                      Nome (opcional)
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Como prefere ser chamado"
                      className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
                  >
                    E-mail
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-[var(--text-muted)]"
                    >
                      Senha
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs font-medium text-indigo-400 hover:underline cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === 'signup' ? 'Mínimo de 8 caracteres' : '••••••••'
                      }
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
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

                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-confirm-password"
                      className="block text-xs font-medium text-[var(--text-muted)] mb-1.5"
                    >
                      Confirmar senha
                    </label>
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 active:scale-[0.99] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>
                    {submitting
                      ? mode === 'login'
                        ? 'Entrando...'
                        : 'Criando conta...'
                      : mode === 'login'
                      ? 'Entrar'
                      : 'Criar conta'}
                  </span>
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="max-w-[1440px] w-full mx-auto text-center text-xs text-[var(--text-muted)]">
        GastoIA · Gestão financeira pessoal
      </footer>
    </div>
  );
}
