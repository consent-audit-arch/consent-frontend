import axios from 'axios';

export interface ConsoleUser {
  access_token: string;
  refresh_token?: string;
  exp: number;
  profile: {
    preferred_username: string;
    name: string;
    email?: string;
    sub?: string;
  };
  roles: string[];
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

const STORE_KEY = 'console-session';
const TOKEN_URL = '/kc-token/realms/tcc/protocol/openid-connect/token';

export const DEMO_USERS: { username: string; label: string }[] = [
  { username: 'testuser', label: 'testuser (auditoria completa)' },
  { username: 'auditor1', label: 'auditor1 (auditor LGPD)' },
  { username: 'operador1', label: 'operador1 (sem auditoria)' },
];

export const DEFAULT_USER = 'testuser';

let currentToken: string | null = null;

export const tokenStore = {
  set(token: string | null) {
    currentToken = token;
  },
  get() {
    return currentToken;
  },
};

function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
  return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
}

function tokenToUser(token: string): Omit<ConsoleUser, 'refresh_token' | 'exp'> {
  const claims = decodeJwt(token) as {
    preferred_username?: string;
    name?: string;
    email?: string;
    sub?: string;
    realm_access?: { roles?: string[] };
    exp?: number;
  };
  const username = claims.preferred_username ?? 'unknown';
  return {
    access_token: token,
    profile: {
      preferred_username: username,
      name: claims.name ?? username,
      email: claims.email,
      sub: claims.sub,
    },
    roles: claims.realm_access?.roles ?? [],
  };
}

export function loadSession(): ConsoleUser | null {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsoleUser;
    if (parsed.exp * 1000 < Date.now()) return null;
    currentToken = parsed.access_token;
    return parsed;
  } catch {
    return null;
  }
}

function persist(user: ConsoleUser) {
  currentToken = user.access_token;
  localStorage.setItem(STORE_KEY, JSON.stringify(user));
}

export async function loginWithPassword(username: string, password: string): Promise<ConsoleUser> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'consent-console',
    username,
    password,
  });
  const { data } = await axios.post<TokenResponse>(TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const base = tokenToUser(data.access_token);
  const user: ConsoleUser = {
    ...base,
    refresh_token: data.refresh_token,
    exp: Math.floor(Date.now() / 1000) + data.expires_in,
  };
  persist(user);
  return user;
}

export async function refreshSession(user: ConsoleUser): Promise<ConsoleUser> {
  if (!user.refresh_token) throw new Error('sem refresh_token');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: 'consent-console',
    refresh_token: user.refresh_token,
  });
  const { data } = await axios.post<TokenResponse>(TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const base = tokenToUser(data.access_token);
  const next: ConsoleUser = {
    ...base,
    refresh_token: data.refresh_token ?? user.refresh_token,
    exp: Math.floor(Date.now() / 1000) + data.expires_in,
  };
  persist(next);
  return next;
}

export function clearSession() {
  currentToken = null;
  localStorage.removeItem(STORE_KEY);
}
