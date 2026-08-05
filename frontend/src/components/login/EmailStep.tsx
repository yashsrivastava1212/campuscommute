"use client";

import { useState } from "react";
import { GIM_DOMAIN, isValidGimEmail, normalizeEmail } from "@/lib/auth";

type EmailStepProps = {
  onContinue: (email: string) => void;
  isLoading?: boolean;
};

export function EmailStep({ onContinue, isLoading = false }: EmailStepProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your GIM email address.");
      return;
    }

    if (!isValidGimEmail(email)) {
      setError("Please use your GIM email address.");
      return;
    }

    onContinue(normalizeEmail(email));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-center text-sm text-slate-600">
        Carpool smarter. Travel together.
      </p>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          GIM Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder={`name${GIM_DOMAIN}`}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError("");
          }}
          className="input-field"
          disabled={isLoading}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
        Only <strong>{GIM_DOMAIN}</strong> emails are eligible to sign in.
      </div>

      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading ? "Sending code…" : "Continue with Email"}
      </button>
    </form>
  );
}
