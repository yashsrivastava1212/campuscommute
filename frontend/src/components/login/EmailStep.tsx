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
      <div>
        <label htmlFor="email" className="label-field">
          GIM Email
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
          <p className="mt-2 text-body-md text-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading ? "Sending code…" : "Continue with Email"}
      </button>

      <p className="text-center text-body-md text-on-variant">
        Only <strong className="text-on-surface">{GIM_DOMAIN}</strong> accounts can access
        CampusCommute.
      </p>
    </form>
  );
}
