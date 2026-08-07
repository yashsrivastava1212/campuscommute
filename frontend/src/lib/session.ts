export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  isNewUser: boolean;
  profileComplete: boolean;
  activeCarpoolId?: string | null;
  isAdmin?: boolean;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
};

const SESSION_KEY = "campuscommute_session";

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function buildSessionFromAuthResponse(data: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}): AuthSession {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    user: data.user,
  };
}
