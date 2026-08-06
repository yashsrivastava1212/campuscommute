"use client";



import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { GuestGuard } from "@/components/auth/AuthGuard";

import { BrandLockup } from "@/components/brand/BrandLockup";

import { BrandLogo } from "@/components/brand/BrandLogo";

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

    if (user?.id) {

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

