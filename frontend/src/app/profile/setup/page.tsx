"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthProvider";
import { apiFetch } from "@/lib/api";

export default function ProfileSetupPage() {
  return (
    <AuthGuard requireProfile={false}>
      <ProfileSetupContent />
    </AuthGuard>
  );
}

function ProfileSetupContent() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (displayName.trim().length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim(),
          ...(phone ? { phone: phone.trim() } : {}),
        }),
      });
      await refreshUser();
      router.replace("/carpools");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-warm px-gutter py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-card)]">
          <h2 className="text-headline-md text-on-surface">Complete your profile</h2>
          <p className="mt-2 text-body-lg text-on-variant">
            Tell fellow students how to find you.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="displayName" className="label-field">
                Display name *
              </label>
              <input
                id="displayName"
                className="input-field"
                placeholder="e.g. Rahul S."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="phone" className="label-field">
                Phone number (optional)
              </label>
              <input
                id="phone"
                type="tel"
                className="input-field"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
              <p className="mt-1.5 text-label-md text-muted">
                Shared only with carpool members when you opt in.
              </p>
            </div>

            {error && (
              <p className="text-body-md text-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Saving…" : "Continue to CampusCommute"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
