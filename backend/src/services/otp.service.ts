import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { and, count, desc, eq, gt, gte, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { otpTokens } from "../db/schema.js";
import { normalizeEmail } from "../lib/email-domain.js";
import { sendOtpEmail } from "../lib/email.js";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

export class OtpRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpRateLimitError";
  }
}

export async function sendOtp(email: string): Promise<{ devOtp?: string }> {
  const normalized = normalizeEmail(email);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const cooldownSince = new Date(Date.now() - RESEND_COOLDOWN_MS);

  const [{ value: sendsLastHour }] = await db
    .select({ value: count() })
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.email, normalized),
        gte(otpTokens.createdAt, oneHourAgo)
      )
    );

  if (sendsLastHour >= MAX_SENDS_PER_HOUR) {
    throw new OtpRateLimitError(
      "Too many OTP requests. Try again later."
    );
  }

  const [recentOtp] = await db
    .select()
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.email, normalized),
        gte(otpTokens.createdAt, cooldownSince)
      )
    )
    .orderBy(desc(otpTokens.createdAt))
    .limit(1);

  if (recentOtp) {
    throw new OtpRateLimitError(
      "Please wait 60 seconds before requesting a new code."
    );
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await db.delete(otpTokens).where(eq(otpTokens.email, normalized));

  await db.insert(otpTokens).values({
    email: normalized,
    otpHash,
    expiresAt,
  });

  const { delivered } = await sendOtpEmail(normalized, otp);
  return delivered ? {} : { devOtp: otp };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "invalid" | "locked" };

export async function verifyOtp(
  email: string,
  otp: string
): Promise<VerifyOtpResult> {
  const normalized = normalizeEmail(email);
  const now = new Date();

  const [record] = await db
    .select()
    .from(otpTokens)
    .where(
      and(eq(otpTokens.email, normalized), gt(otpTokens.expiresAt, now))
    )
    .orderBy(desc(otpTokens.createdAt))
    .limit(1);

  if (!record) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await db.delete(otpTokens).where(eq(otpTokens.id, record.id));
    return { ok: false, reason: "locked" };
  }

  const isValid = await bcrypt.compare(otp, record.otpHash);

  if (!isValid) {
    await db
      .update(otpTokens)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpTokens.id, record.id));
    return { ok: false, reason: "invalid" };
  }

  await db.delete(otpTokens).where(eq(otpTokens.id, record.id));
  return { ok: true };
}

export async function purgeStaleOtps(): Promise<void> {
  await db.delete(otpTokens).where(lt(otpTokens.expiresAt, new Date()));
}
