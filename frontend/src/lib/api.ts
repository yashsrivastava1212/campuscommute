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

export async function logout() {
  const { assertSupabase } = await import("./supabase");
  await assertSupabase().auth.signOut();
}

export { API_URL };
