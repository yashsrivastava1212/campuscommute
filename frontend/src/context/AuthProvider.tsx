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
    if (!session.user?.id) {
      clearSession();
      setUser(null);
      setIsLoading(false);
      return;
    }
    setUser(session.user);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setUser(null);
      return;
    }

    if (!session.user?.id) {
      clearSession();
      setUser(null);
      return;
    }

    try {
      const profile = await apiFetch<{
        id: string;
        email: string;
        displayName: string | null;
        profileComplete: boolean;
        activeCarpoolId?: string | null;
        isAdmin?: boolean;
      }>("/api/v1/users/me");

      if (!profile?.id) {
        clearSession();
        setUser(null);
        return;
      }

      setUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        isNewUser: false,
        profileComplete: profile.profileComplete,
        activeCarpoolId: profile.activeCarpoolId,
        isAdmin: profile.isAdmin,
      });
    } catch {
      clearSession();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const session: AuthSession | null = getSession();
    if (session?.user?.id) {
      setUser(session.user);
      refreshUser().finally(() => setIsLoading(false));
    } else {
      if (session) clearSession();
      setUser(null);
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

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.user?.id) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
      return;
    }

    if (options?.requireProfile && !auth.user.profileComplete) {
      if (typeof window !== "undefined" && window.location.pathname !== "/profile/setup") {
        window.location.replace("/profile/setup");
      }
    }
  }, [auth.isLoading, auth.user, options?.requireProfile]);

  return auth;
}

export function clearAuthSession() {
  clearSession();
}
