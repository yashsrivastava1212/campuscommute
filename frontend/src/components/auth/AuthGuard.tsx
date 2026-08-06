"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useRequireAuth } from "@/context/AuthProvider";

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
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!auth.user?.id) return null;
  if (requireProfile && !auth.user.profileComplete) return null;

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.id) {
      router.replace(user.profileComplete ? "/carpools" : "/profile/setup");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
