import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { authenticateOfflineUser, buildAuthSession } from '../security/offlineAuth';
import {
  appendAuditLog,
  authenticateOnServer,
  isElectronRuntime,
  listUsers,
  saveUser,
} from '../storage/localDb';
import type { AuthSession, OfflineUser } from '../types/circuit';

interface OfflineLockScreenProps {
  onAuthenticated: (session: AuthSession) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  initialError?: string | null;
}

export const OfflineLockScreen: React.FC<OfflineLockScreenProps> = ({
  onAuthenticated,
  isDark,
  onToggleTheme,
  initialError = null,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const isDesktopExe = isElectronRuntime();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password.trim()) {
      setErrorMsg('Informe o usuário e a chave de acesso enviados pelo Administrador.');
      return;
    }

    setLoading(true);
    try {
      const serverAuth = await authenticateOnServer(cleanUser, password);
      if (serverAuth.reachable) {
        if (!serverAuth.ok) {
          if (serverAuth.reason === 'not_found') {
            setErrorMsg('Credenciais inválidas.');
            return;
          }
          if (serverAuth.reason === 'inactive') {
            setErrorMsg('Esta conta de acesso está desativada.');
            return;
          }
          if (serverAuth.reason === 'expired') {
            setErrorMsg('Esta conta de acesso venceu. Solicite ao Administrador a renovação do vencimento.');
            return;
          }
          setErrorMsg('Chave de acesso ou senha incorreta.');
          return;
        }

        const remoteUser: OfflineUser = {
          ...serverAuth.user,
          saltHex: '',
          passwordHashHex: '',
        };
        const session = buildAuthSession(remoteUser, 'Industrial Pro', 24);
        onAuthenticated(session);
        return;
      }

      const users = await listUsers();
      const authRes = await authenticateOfflineUser(users, cleanUser, password);
      if (!authRes.ok) {
        if (authRes.reason === 'not_found') {
          await appendAuditLog({
            userId: 'unknown',
            username: cleanUser,
            action: 'LOGIN_FAILED',
            detail: 'Usuário local não encontrado.',
          });
          setErrorMsg('Credenciais locais inválidas.');
          return;
        }
        if (authRes.reason === 'inactive' && authRes.user) {
          await appendAuditLog({
            userId: authRes.user.id,
            username: authRes.user.username,
            action: 'LOGIN_FAILED',
            detail: 'Conta desativada pelo administrador.',
          });
          setErrorMsg('Esta conta de acesso está desativada.');
          return;
        }
        if (authRes.reason === 'expired' && authRes.user) {
          await appendAuditLog({
            userId: authRes.user.id,
            username: authRes.user.username,
            action: 'LOGIN_FAILED',
            detail: `Conta expirada em ${authRes.user.expiresAt ?? 'data anterior'}.`,
          });
          setErrorMsg('Esta conta de acesso venceu. Solicite ao Administrador a renovação do vencimento.');
          return;
        }
        if (authRes.user) {
          await appendAuditLog({
            userId: authRes.user.id,
            username: authRes.user.username,
            action: 'LOGIN_FAILED',
            detail: 'Chave de acesso incorreta.',
          });
        }
        setErrorMsg('Chave de acesso ou senha incorreta.');
        return;
      }

      const user = authRes.user;
      const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
      await saveUser(updatedUser);

      const session = buildAuthSession(updatedUser, 'Industrial Pro', 24);
      await appendAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_SUCCESS',
        detail: `Acesso concedido (${user.role}) em ${isDesktopExe ? 'Desktop .EXE' : 'Web App'}.`,
      });
      onAuthenticated(session);
    } catch {
      setErrorMsg('Erro ao verificar credenciais de acesso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={typeof window !== 'undefined' && window.location?.protocol === 'file:' ? './app-logo.png' : '/app-logo.png'}
            alt="Logo Fluid Circuit Studio"
            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-300 dark:border-slate-700"
          />
          <span className="text-base font-semibold tracking-tight whitespace-nowrap">
            Fluid Circuit Studio
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline whitespace-nowrap">
            {isDesktopExe ? 'Desktop Nativo (.exe)' : 'Aplicação Web'}
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Left Technical Briefing */}
          <section className="lg:col-span-6 p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-sky-600 dark:text-sky-400 mb-3">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Controle de Acesso Offline</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Matc Hidráulica / Neumática
              </h1>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                O aplicativo{' '}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  Matc Hidráulica / Neumática
                </strong>{' '}
                foi desenvolvido para oferecer um ambiente digital completo e interativo, destinado
                a{' '}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  estudos, atividades profissionais, desenvolvimento, montagem, simulação e
                  gerenciamento de circuitos hidráulicos e pneumáticos
                </strong>
                .
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                O sistema proporciona ferramentas para auxiliar estudantes, professores, técnicos e
                profissionais da área, oferecendo recursos voltados ao aprendizado, à prática e ao
                desenvolvimento de projetos hidráulicos e pneumáticos.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                O aplicativo é ativado integralmente pelo Administrador mediante envio da{' '}
                <strong className="text-slate-800 dark:text-slate-200">chave de acesso</strong> para{' '}
                <strong className="text-slate-800 dark:text-slate-200">Alunos</strong> e{' '}
                <strong className="text-slate-800 dark:text-slate-200">Professores</strong> em{' '}
                <strong className="text-slate-800 dark:text-slate-200">Configurações</strong>.
              </p>
            </div>
          </section>

          {/* Right Login Form */}
          <section className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Desbloquear Estação de Trabalho
              </h2>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-4 px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="offline-username"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Usuário
                </label>
                <input
                  id="offline-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label
                  htmlFor="offline-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Chave de Acesso / Senha
                </label>
                <div className="relative">
                  <input
                    id="offline-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua chave de acesso"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                {loading ? 'Autenticando...' : 'Entrar no Simulador'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};
