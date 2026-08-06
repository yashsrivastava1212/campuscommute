import { Resend } from "resend";
import "../env.js";

const GIM_EMAIL_ERROR = "Please use your GIM email address.";

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function getResendApiKey(): string | null {
  const raw = process.env.RESEND_API_KEY?.trim();
  if (!raw) return null;
  const apiKey = stripQuotes(raw);
  return apiKey.startsWith("re_") ? apiKey : null;
}

export function getFromEmail(): string {
  const raw = process.env.EMAIL_FROM?.trim();
  return stripQuotes(raw ?? "CampusCommute <onboarding@resend.dev>");
}

export function isDevOtpAllowed(): boolean {
  return process.env.ALLOW_DEV_OTP === "true";
}

export function isUsingResendTestSender(fromEmail = getFromEmail()): boolean {
  return /@resend\.dev/i.test(fromEmail);
}

export function getEmailDeliveryStatus() {
  const fromEmail = getFromEmail();
  const resendConfigured = Boolean(getResendApiKey());
  const usingTestSender = isUsingResendTestSender(fromEmail);

  return {
    resendConfigured,
    fromEmail,
    allowDevOtp: isDevOtpAllowed(),
    usingTestSender,
    canDeliverToGimInbox:
      resendConfigured && !usingTestSender,
    guidance: !resendConfigured
      ? "Set RESEND_API_KEY on the backend service."
      : usingTestSender
        ? "EMAIL_FROM uses resend.dev, which cannot deliver to @gim.ac.in. Verify gim.ac.in in Resend and set EMAIL_FROM to e.g. CampusCommute <noreply@gim.ac.in>."
        : "Resend is configured for production delivery.",
  };
}

function getResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  return apiKey ? new Resend(apiKey) : null;
}

function formatResendError(message: string): string {
  if (/only send testing emails to your own email address/i.test(message)) {
    return [
      "Resend test sender cannot deliver to @gim.ac.in addresses.",
      "Verify gim.ac.in in your Resend dashboard and set EMAIL_FROM to an address on that verified domain,",
      "for example: CampusCommute <noreply@gim.ac.in>",
    ].join(" ");
  }

  if (/verify a domain/i.test(message) || /domain is not verified/i.test(message)) {
    return [
      "Your Resend sending domain is not verified.",
      "Add and verify gim.ac.in in Resend, then set EMAIL_FROM to an address on that domain.",
    ].join(" ");
  }

  if (/invalid api key/i.test(message) || /api key is invalid/i.test(message)) {
    return "RESEND_API_KEY is invalid. Create a new API key in Resend and update the backend service on Railway.";
  }

  return `Email delivery failed: ${message}`;
}

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

function buildOtpText(otp: string): string {
  return [
    "CampusCommute",
    "",
    `Your verification code is: ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "Goa Institute of Management",
  ].join("\n");
}

export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ delivered: boolean }> {
  if (!email.endsWith("@gim.ac.in")) {
    throw new Error(GIM_EMAIL_ERROR);
  }

  const resend = getResendClient();
  const fromEmail = getFromEmail();
  const subject = "Your CampusCommute verification code";
  const html = buildOtpHtml(otp);
  const text = buildOtpText(otp);

  if (!resend) {
    if (isDevOtpAllowed()) {
      console.warn(`[DEV] RESEND_API_KEY missing. OTP for ${email}: ${otp}`);
      return { delivered: false };
    }

    throw new Error(
      "RESEND_API_KEY is not set on the backend service. Add it in Railway backend Variables."
    );
  }

  if (isUsingResendTestSender(fromEmail) && !isDevOtpAllowed()) {
    throw new Error(
      [
        "EMAIL_FROM is using onboarding@resend.dev, which cannot send OTP to @gim.ac.in.",
        "Verify gim.ac.in in Resend and set EMAIL_FROM to CampusCommute <noreply@gim.ac.in> on the backend service.",
      ].join(" ")
    );
  }

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html,
    text,
  });

  if (!error && data?.id) {
    console.log(`[OK] OTP email queued for ${email} (${data.id})`);
    return { delivered: true };
  }

  const resendMessage = error?.message ?? "Unknown Resend error";
  console.error(`[ERROR] Resend failed for ${email}: ${resendMessage}`);

  if (isDevOtpAllowed()) {
    console.warn(`[DEV] Falling back to on-screen OTP for ${email}: ${otp}`);
    return { delivered: false };
  }

  throw new Error(formatResendError(resendMessage));
}

export { GIM_EMAIL_ERROR };
