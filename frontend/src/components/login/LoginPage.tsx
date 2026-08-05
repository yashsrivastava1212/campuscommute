"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GuestGuard } from "@/components/auth/AuthGuard";
import { Logo } from "@/components/Logo";
import { EmailStep } from "@/components/login/EmailStep";
import { OtpStep } from "@/components/login/OtpStep";
import { useAuth } from "@/context/AuthProvider";
import { API_URL, loginWithOtp } from "@/lib/api";

type Step = "email" | "otp";

function LoginContent() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (user) {
      router.replace(user.profileComplete ? "/carpools" : "/profile/setup");
    }
  }, [user, router]);

  async function sendOtp(targetEmail: string) {
    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message ?? "Failed to send verification code.");
      }

      setEmail(targetEmail);
      setDevOtp(
        data.email_sent === false && typeof data.dev_otp === "string"
          ? data.dev_otp
          : undefined
      );
      setStep("otp");
    } catch (error) {
      const message =
        error instanceof TypeError && error.message === "Failed to fetch"
          ? "Cannot reach the server. Make sure the backend is running on port 3001."
          : error instanceof Error
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
      const session = await loginWithOtp(email, otp);
      signIn(session);
      router.replace(
        session.user.profileComplete ? "/carpools" : "/profile/setup"
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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {step === "email" ? (
            <EmailStep onContinue={sendOtp} isLoading={isLoading} />
          ) : (
            <OtpStep
              email={email}
              devOtp={devOtp}
              onVerify={verifyOtp}
              onResend={() => sendOtp(email)}
              onChangeEmail={() => {
                setStep("email");
                setDevOtp(undefined);
                setApiError("");
              }}
              isLoading={isLoading}
              apiError={apiError}
            />
          )}

          {step === "email" && apiError && (
            <p className="mt-4 text-center text-sm text-red-600" role="alert">
              {apiError}
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Goa Institute of Management
        </p>
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
