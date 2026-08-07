import jwt from "jsonwebtoken";
import { isValidGimEmail, normalizeEmail } from "./email-domain.js";

export type SupabaseAccessTokenPayload = {
  sub: string;
  email?: string;
  role?: string;
  aud?: string | string[];
};

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(process.env.SUPABASE_JWT_SECRET?.trim());
}

export function verifySupabaseAccessToken(
  token: string
): SupabaseAccessTokenPayload {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET is not configured");
  }

  const payload = jwt.verify(token, secret, {
    algorithms: ["HS256"],
  }) as SupabaseAccessTokenPayload;

  if (payload.role && payload.role !== "authenticated") {
    throw new Error("Invalid Supabase token role");
  }

  const email = payload.email?.trim();
  if (!email || !isValidGimEmail(normalizeEmail(email))) {
    throw new Error("Supabase token missing a valid GIM email");
  }

  payload.email = normalizeEmail(email);
  return payload;
}
