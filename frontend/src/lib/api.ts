import {
  buildSessionFromAuthResponse,
  clearSession,
  getSession,
  setSession,
  type AuthSession,
} from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function refreshSession(session: AuthSession): Promise<AuthSession | null> {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const data = await response.json();
  const updated: AuthSession = {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  setSession(updated);
  return updated;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let session = getSession();

  if (session && Date.now() >= session.expiresAt - 30_000) {
    session = await refreshSession(session);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed");
  }

  return data as T;
}

export async function loginWithOtp(email: string, otp: string) {
  const response = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? "Verification failed");
  }

  const session = buildSessionFromAuthResponse(data);
  setSession(session);
  return session;
}

export async function logout() {
  const session = getSession();
  if (session) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    }).catch(() => undefined);
  }
  clearSession();
}

export { API_URL };
