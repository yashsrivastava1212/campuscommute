import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isValidGimEmail, normalizeEmail } from "../lib/email-domain.js";
import { GIM_EMAIL_ERROR } from "../lib/email.js";
import { trackEvent } from "../lib/analytics.js";
import {
  findOrCreateUser,
  issueAuthTokens,
  refreshAuthTokens,
  revokeRefreshToken,
  serializeUser,
} from "../services/auth.service.js";
import {
  isSupabaseAdminConfigured,
  issueSupabaseSessionTokenHash,
} from "../lib/supabase-admin.js";
import {
  OtpRateLimitError,
  sendOtp,
  verifyOtp,
} from "../services/otp.service.js";

const emailSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d{6}$/),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1),
});

const VERIFY_ERROR_MESSAGES = {
  expired: "Your verification code has expired. Request a new one.",
  invalid: "Incorrect verification code. Try again.",
  locked: "Too many failed attempts. Request a new code.",
} as const;

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/v1/auth/send-otp", async (request, reply) => {
    const parsed = emailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid email address" });
    }

    const email = normalizeEmail(parsed.data.email);
    if (!isValidGimEmail(email)) {
      return reply.status(403).send({ message: GIM_EMAIL_ERROR });
    }

    try {
      const result = await sendOtp(email);
      return reply.send({
        message: result.devOtp
          ? "Demo mode — use the code shown on screen."
          : "Verification code sent to your GIM email.",
        email_sent: !result.devOtp,
        ...(result.devOtp ? { dev_otp: result.devOtp } : {}),
      });
    } catch (error) {
      if (error instanceof OtpRateLimitError) {
        return reply.status(429).send({ message: error.message });
      }
      request.log.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send verification code";
      return reply.status(500).send({ message });
    }
  });

  app.post("/api/v1/auth/verify-otp", async (request, reply) => {
    const parsed = verifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    const email = normalizeEmail(parsed.data.email);
    if (!isValidGimEmail(email)) {
      return reply.status(403).send({ message: GIM_EMAIL_ERROR });
    }

    const result = await verifyOtp(email, parsed.data.otp);
    if (!result.ok) {
      return reply.status(401).send({
        message: VERIFY_ERROR_MESSAGES[result.reason],
      });
    }

    const { user, isNewUser } = await findOrCreateUser(email);
    const tokens = await issueAuthTokens(user);

    trackEvent(user.id, "Login Completed", { is_new_user: isNewUser });

    let supabaseTokenHash: string | undefined;
    if (isSupabaseAdminConfigured()) {
      try {
        supabaseTokenHash = await issueSupabaseSessionTokenHash(email);
      } catch (error) {
        request.log.error(error);
      }
    }

    return reply.send({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      user: serializeUser(user, isNewUser),
      ...(supabaseTokenHash ? { supabase_token_hash: supabaseTokenHash } : {}),
    });
  });

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    const tokens = await refreshAuthTokens(parsed.data.refresh_token);
    if (!tokens) {
      return reply.status(401).send({ message: "Invalid or expired refresh token" });
    }

    return reply.send({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
    });
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const parsed = logoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    await revokeRefreshToken(parsed.data.refresh_token);
    return reply.send({ message: "Logged out" });
  });
}
