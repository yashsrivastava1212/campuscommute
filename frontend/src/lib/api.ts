import { getSupabaseAccessToken } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function readApiError(response: Response, fallback: string): Promise<string> {
  const raw = await response.text();
  if (!raw) {
    if (response.status === 404) {
      return `API not found at ${API_URL}. Set NEXT_PUBLIC_API_URL to your Railway backend URL and redeploy the frontend.`;
    }
    return `${fallback} (HTTP ${response.status})`;
  }

  try {
    const data = JSON.parse(raw) as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    return `${fallback} (HTTP ${response.status}: invalid server response)`;
  }

  return `${fallback} (HTTP ${response.status})`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getSupabaseAccessToken();

  const hasBody =
    options.body !== undefined && options.body !== null && options.body !== "";

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed");
  }

  return data as T;
}

export async function sendBackendOtp(email: string): Promise<{
  devOtp?: string;
}> {
  const response = await fetch(`${API_URL}/api/v1/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Failed to send verification code.")
    );
  }

  const data = (await response.json()) as {
    email_sent?: boolean;
    dev_otp?: string;
  };

  return {
    devOtp:
      data.email_sent === false && typeof data.dev_otp === "string"
        ? data.dev_otp
        : undefined,
  };
}

export async function verifyBackendOtp(
  email: string,
  otp: string
): Promise<{ supabaseTokenHash?: string }> {
  const response = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  const data = (await response.json()) as {
    message?: string;
    supabase_token_hash?: string;
  };

  if (!response.ok) {
    throw new Error(data.message ?? "Verification failed");
  }

  return {
    supabaseTokenHash:
      typeof data.supabase_token_hash === "string"
        ? data.supabase_token_hash
        : undefined,
  };
}

export async function logout() {
  const { assertSupabase } = await import("./supabase");
  await assertSupabase().auth.signOut();
}

export { API_URL };
