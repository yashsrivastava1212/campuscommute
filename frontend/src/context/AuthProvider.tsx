"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, logout as apiLogout } from "@/lib/api";
import {
  clearSession,
  getSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/session";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (session: AuthSession) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signIn = useCallback((session: AuthSession) => {
    setUser(session.user);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setUser(null);
      return;
    }

    try {
      const profile = await apiFetch<{
        id: string;
        email: string;
        displayName: string | null;
        profileComplete: boolean;
      }>("/api/v1/users/me");

      setUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        isNewUser: false,
        profileComplete: profile.profileComplete,
        activeCarpoolId: (profile as { activeCarpoolId?: string }).activeCarpoolId,
        isAdmin: (profile as { isAdmin?: boolean }).isAdmin,
      });
    } catch {
      setUser(session.user);
    }
  }, []);

  useEffect(() => {
    const session: AuthSession | null = getSession();
    if (session) {
      setUser(session.user);
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, signIn, refreshUser, logout }),
    [user, isLoading, signIn, refreshUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useRequireAuth(options?: { requireProfile?: boolean }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.user) {
      router.replace("/login");
      return;
    }

    if (options?.requireProfile && !auth.user.profileComplete) {
      router.replace("/profile/setup");
    }
  }, [auth.isLoading, auth.user, options?.requireProfile, router]);

  return auth;
}

export function clearAuthSession() {
  clearSession();
}
