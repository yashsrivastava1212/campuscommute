import { Resend } from "resend";
import "../env.js";

const GIM_EMAIL_ERROR = "Please use your GIM email address.";

function isOnScreenOtpEnabled(): boolean {
  return process.env.ALLOW_DEV_OTP !== "false";
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey?.startsWith("re_")) {
    return null;
  }
  return new Resend(apiKey);
}

function normalizeFromEmail(value: string | undefined): string {
  const raw = value?.trim() ?? "CampusCommute <onboarding@resend.dev>";
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

const FROM_EMAIL = normalizeFromEmail(process.env.EMAIL_FROM);

function buildOtpHtml(otp: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1d4ed8;">CampusCommute</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otp}</p>
      <p style="color: #64748b;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      <p style="color: #94a3b8; font-size: 12px;">Goa Institute of Management</p>
    </div>
  `;
}

export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ delivered: boolean }> {
  if (!email.endsWith("@gim.ac.in")) {
    throw new Error(GIM_EMAIL_ERROR);
  }

  const resend = getResendClient();
  const subject = "Your CampusCommute verification code";
  const html = buildOtpHtml(otp);

  if (resend) {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });

    if (!error) {
      return { delivered: true };
    }

    if (isOnScreenOtpEnabled()) {
      console.warn(
        `[WARN] Resend failed (${error.message}). Showing OTP on screen for ${email}.`
      );
      return { delivered: false };
    }

    throw new Error(`Failed to send verification email: ${error.message}`);
  }

  if (isOnScreenOtpEnabled()) {
    console.warn(
      `[WARN] RESEND_API_KEY not configured. Showing OTP on screen for ${email}.`
    );
    return { delivered: false };
  }

  throw new Error(
    "Email service not configured. Set RESEND_API_KEY on the backend, or set ALLOW_DEV_OTP=true."
  );
}

export { GIM_EMAIL_ERROR };
