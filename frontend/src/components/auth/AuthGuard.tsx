"use client";

import { useEffect } from "react";
import { useAuth, useRequireAuth } from "@/context/AuthProvider";

function redirectTo(path: string) {
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.location.replace(path);
  }
}

export function AuthGuard({
  children,
  requireProfile = true,
}: {
  children: React.ReactNode;
  requireProfile?: boolean;
}) {
  const auth = useRequireAuth({ requireProfile });

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-on-variant">
        Loading…
      </div>
    );
  }

  if (!auth.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center text-on-variant">
        Redirecting…
      </div>
    );
  }

  if (requireProfile && !auth.user.profileComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center text-on-variant">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user?.id) {
      redirectTo(user.profileComplete ? "/carpools" : "/profile/setup");
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-on-variant">
        Loading…
      </div>
    );
  }

  if (user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center text-on-variant">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
