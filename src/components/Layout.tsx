import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DEMO_USERS } from '../auth/session';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/timeline', label: 'Linha do Tempo' },
  { to: '/consents', label: 'Consentimentos' },
  { to: '/billing', label: 'Faturamento' },
  { to: '/promotions', label: 'Promoções' },
  { to: '/audit', label: 'Auditoria' },
  { to: '/seed', label: 'Massa' },
];

const KC_NOISE_ROLES = ['default-roles-tcc', 'offline_access', 'uma_authorization'];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, roles, logout, loginAs } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const RELEVANT_ROLES = roles
    .filter((r) => !KC_NOISE_ROLES.includes(r))
    .sort((a, b) => (a === 'AUDITOR' ? -1 : b === 'AUDITOR' ? 1 : a.localeCompare(b)));

  const current = user?.profile.preferred_username ?? '';

  const handleSwitch = async (username: string) => {
    if (!username || username === current) return;
    setSwitching(true);
    setError(null);
    try {
      await loginAs(username);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao trocar de usuário');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <header className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-gray-900">
              Consent Lifecycle &amp; Audit Console
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-gray-700">{current}</p>
              <div className="flex justify-end gap-1">
                {RELEVANT_ROLES.map((r) => (
                  <span
                    key={r}
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      r === 'AUDITOR'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <select
              value=""
              onChange={(e) => handleSwitch(e.target.value)}
              disabled={switching}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600"
            >
              <option value="">Trocar usuário…</option>
              {DEMO_USERS.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {switching ? 'Trocando…' : 'Sair'}
            </button>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <nav className="mt-3 flex gap-5 overflow-x-auto border-b border-gray-200 pb-1.5">
          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`whitespace-nowrap text-sm font-medium transition ${
                pathname === to
                  ? '-mb-0.5 border-b-2 border-indigo-600 pb-1 text-indigo-600'
                  : 'pb-1.5 text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
