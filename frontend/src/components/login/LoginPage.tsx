"use client";

import { useState } from "react";
import { GuestGuard } from "@/components/auth/AuthGuard";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { EmailStep } from "@/components/login/EmailStep";
import { OtpStep } from "@/components/login/OtpStep";
import { useAuth } from "@/context/AuthProvider";
import { assertSupabase } from "@/lib/supabase";

type Step = "email" | "otp";

function normalizeGimEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidGimEmail(email: string) {
  const normalized = normalizeGimEmail(email);
  return /^[^\s@]+@gim\.ac\.in$/.test(normalized);
}

function LoginContent() {
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  async function sendOtp(targetEmail: string) {
    setIsLoading(true);
    setApiError("");

    const normalizedEmail = normalizeGimEmail(targetEmail);

    if (!isValidGimEmail(normalizedEmail)) {
      setApiError("Only @gim.ac.in email addresses can sign in.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = assertSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });

      if (error) {
        throw new Error(error.message);
      }

      setEmail(normalizedEmail);
      setStep("otp");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";

      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOtp(otp: string) {
    setIsLoading(true);
    setApiError("");

    try {
      const supabase = assertSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        throw new Error(error.message);
      }

      const profile = await refreshUser();
      if (!profile) {
        throw new Error("Signed in, but could not load your profile. Try again.");
      }

      window.location.replace(
        profile.profileComplete ? "/carpools" : "/profile/setup"
      );
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Verification failed. Try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-background-warm">
      <div className="login-brand-panel">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 85%, rgba(16,185,129,0.18) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.1) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 60%)",
          }}
        />

        <div className="relative max-w-lg">
          <BrandLogo size={48} variant="light" />
          <h1 className="mt-8 text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.25rem]">
            Where GIM moves together.
          </h1>
          <div className="login-brand-accent" aria-hidden />
          <p className="mt-6 max-w-md text-body-lg leading-relaxed text-white/70">
            Find fellow GIM students heading your way and share the journey.
          </p>
        </div>
      </div>

      <div className="login-auth-panel bg-white">
        <div className="mb-8 flex justify-center lg:hidden">
          <BrandLockup compact />
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-headline-md text-on-surface">Welcome to CampusCommute</h2>
            <p className="mt-2 text-body-lg text-on-variant">
              Sign in using your GIM email.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
            {step === "email" ? (
              <EmailStep onContinue={sendOtp} isLoading={isLoading} />
            ) : (
              <OtpStep
                email={email}
                onVerify={verifyOtp}
                onResend={() => sendOtp(email)}
                onChangeEmail={() => {
                  setStep("email");
                  setApiError("");
                }}
                isLoading={isLoading}
                apiError={apiError}
              />
            )}

            {step === "email" && apiError && (
              <p className="mt-4 text-center text-body-md text-error" role="alert">
                {apiError}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export function LoginPage() {
  return (
    <GuestGuard>
      <LoginContent />
    </GuestGuard>
  );
}
