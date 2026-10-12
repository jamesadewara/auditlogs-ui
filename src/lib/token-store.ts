/**
 * In-memory access token. It is never written to localStorage or
 * sessionStorage, so it disappears with the tab and is out of reach of
 * storage-reading scripts. The refresh token is not here at all: auth-api keeps
 * it in an httpOnly cookie that page scripts cannot read; a reload restores
 * the session by calling /v1/auth/refresh with that cookie.
 *
 * Claims are decoded only for display (email) and expiry. They are not
 * trusted for anything: every service verifies the token's signature itself.
 */

interface Claims {
  exp: number;
  email: string;
  business_uuid: string;
}

function decodeClaims(token: string): Claims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as Record<string, unknown>;
    if (
      typeof payload.exp !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.business_uuid !== "string"
    ) {
      return null;
    }
    return { exp: payload.exp, email: payload.email, business_uuid: payload.business_uuid };
  } catch {
    // A token we cannot decode is treated as no token; the server would reject it too.
    return null;
  }
}

let accessToken: string | null = null;
let claims: Claims | null = null;
const listeners = new Set<() => void>();

export const tokenStore = {
  getAccessToken: (): string | null => accessToken,

  setAccessToken(token: string | null): void {
    accessToken = token;
    claims = token ? decodeClaims(token) : null;
    listeners.forEach((l) => l());
  },

  clear(): void {
    tokenStore.setAccessToken(null);
  },

  isAuthenticated: (): boolean => accessToken !== null && claims !== null,

  getEmail: (): string | null => claims?.email ?? null,

  /** Subscribe to sign-in and sign-out; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
