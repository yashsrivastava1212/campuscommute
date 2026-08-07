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
import type { AuthUser } from "@/lib/session";
import { assertSupabase } from "@/lib/supabase";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfileToUser(profile: {
  id: string;
  email: string;
  displayName: string | null;
  profileComplete: boolean;
  activeCarpoolId?: string | null;
  isAdmin?: boolean;
}): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    isNewUser: false,
    profileComplete: profile.profileComplete,
    activeCarpoolId: profile.activeCarpoolId,
    isAdmin: profile.isAdmin,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const supabase = assertSupabase();
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      setUser(null);
      return null;
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
        setUser(null);
        return null;
      }

      const nextUser = mapProfileToUser(profile);
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const supabase = assertSupabase();

    void refreshUser().finally(() => setIsLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      void refreshUser().finally(() => setIsLoading(false));
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, refreshUser, logout }),
    [user, isLoading, refreshUser, logout]
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
