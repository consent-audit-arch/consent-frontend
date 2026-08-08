import { useState } from 'react';
import { useAuth, DEFAULT_PASSWORD } from '../auth/AuthContext';
import { DEMO_USERS, DEFAULT_USER } from '../auth/session';

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState(DEFAULT_USER);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        Autenticando com o Keycloak…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-24">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">
            Consent Lifecycle & Audit Console
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Console de auditoria e compliance LGPD. Selecione um usuário demo do Keycloak.
          </p>
        </div>

        <form
          className="w-full space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            setError(null);
            login(username, password)
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'Falha na autenticação'),
              )
              .finally(() => setSubmitting(false));
          }}
        >
          <select
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {DEMO_USERS.map((u) => (
              <option key={u.username} value={u.username}>
                {u.label}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        <p className="text-xs text-gray-400">
          Auto-login tenta entrar como <code className="font-mono">testuser</code> automaticamente.
          Se falhou, confirme as credenciais acima.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
