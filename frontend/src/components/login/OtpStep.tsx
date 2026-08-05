"use client";

import { useEffect, useRef, useState } from "react";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 600;

type OtpStepProps = {
  email: string;
  devOtp?: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onChangeEmail: () => void;
  isLoading?: boolean;
  apiError?: string;
};

export function OtpStep({
  email,
  devOtp,
  onVerify,
  onResend,
  onChangeEmail,
  isLoading = false,
  apiError,
}: OtpStepProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "") && next.join("").length === OTP_LENGTH) {
      onVerify(next.join(""));
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);

    if (pasted.length === OTP_LENGTH) {
      onVerify(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  }

  function handleResend() {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setSecondsLeft(OTP_EXPIRY_SECONDS);
    setDigits(Array(OTP_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
    onResend();
  }

  const otpComplete = digits.every((d) => d !== "");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-900">Check your email</h2>
        <p className="mt-2 text-sm text-slate-600">
          We sent a 6-digit code to
          <br />
          <span className="font-medium text-slate-900">{email}</span>
        </p>
      </div>

      {devOtp && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
          role="status"
        >
          <p className="font-medium">Demo mode — email could not be sent</p>
          <p className="mt-1">
            Your code is{" "}
            <span className="font-mono text-base font-bold tracking-widest">{devOtp}</span>
          </p>
        </div>
      )}

      <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className="otp-box"
            disabled={isLoading}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {apiError && (
        <p className="text-center text-sm text-red-600" role="alert">
          {apiError}
        </p>
      )}

      <p className="text-center text-sm text-slate-500">
        {secondsLeft > 0 ? (
          <>Code expires in {formatTime(secondsLeft)}</>
        ) : (
          <span className="text-amber-600">Code expired. Request a new one.</span>
        )}
      </p>

      <button
        type="button"
        onClick={() => otpComplete && onVerify(digits.join(""))}
        className="btn-primary"
        disabled={isLoading || !otpComplete}
      >
        {isLoading ? "Verifying…" : "Verify & Sign In"}
      </button>

      <p className="text-center text-sm">
        {resendCooldown > 0 ? (
          <span className="text-slate-400">
            Resend code in {resendCooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-brand-600 hover:text-brand-700"
            disabled={isLoading}
          >
            Didn&apos;t receive it? Resend code
          </button>
        )}
      </p>

      <button
        type="button"
        onClick={onChangeEmail}
        className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
        disabled={isLoading}
      >
        ← Use a different email
      </button>
    </div>
  );
}
