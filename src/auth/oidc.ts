import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';

export const KEYCLOAK_AUTHORITY = 'http://localhost:8180/realms/tcc';
export const CLIENT_ID = 'consent-console';

let currentToken: string | null = null;

export const tokenStore = {
  set(token: string | null) {
    currentToken = token;
  },
  get() {
    return currentToken;
  },
};

export function createUserManager(): UserManager {
  const origin = window.location.origin;
  return new UserManager({
    authority: KEYCLOAK_AUTHORITY,
    client_id: CLIENT_ID,
    redirect_uri: `${origin}/callback`,
    post_logout_redirect_uri: origin,
    silent_redirect_uri: `${origin}/silent-renew.html`,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    loadUserInfo: false,
    monitorSession: false,
    stateStore: new WebStorageStateStore({ store: window.localStorage }),
  });
}

export function rolesOf(user: User): string[] {
  const realmAccess = user.profile?.realm_access as
    | { roles?: string[] }
    | undefined;
  return realmAccess?.roles ?? [];
}
