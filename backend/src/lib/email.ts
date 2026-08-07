import dns from "node:dns/promises";
import nodemailer from "nodemailer";
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

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export function getEmailDeliveryStatus() {
  const fromEmail = getFromEmail();
  const resendConfigured = Boolean(getResendApiKey());
  const smtpConfigured = isSmtpConfigured();
  const usingTestSender = isUsingResendTestSender(fromEmail);
  const canDeliverToGimInbox =
    smtpConfigured || (resendConfigured && !usingTestSender);

  let guidance =
    "Configure free Gmail SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM) or verified Resend domain.";

  if (smtpConfigured) {
    guidance = "Gmail SMTP is configured — OTP can be sent to @gim.ac.in inboxes.";
  } else if (resendConfigured && !usingTestSender) {
    guidance = "Resend is configured for production delivery.";
  } else if (resendConfigured && usingTestSender) {
    guidance =
      "Resend test sender cannot email @gim.ac.in. Use free Gmail SMTP instead, or verify your own domain in Resend.";
  } else if (!resendConfigured) {
    guidance =
      "Set Gmail SMTP variables on the backend for a free setup, or add RESEND_API_KEY with a verified domain.";
  }

  return {
    resendConfigured,
    smtpConfigured,
    fromEmail,
    allowDevOtp: isDevOtpAllowed(),
    usingTestSender,
    canDeliverToGimInbox,
    guidance,
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
      "Use the free Gmail SMTP option instead (see DEPLOY.md).",
    ].join(" ");
  }

  if (/verify a domain/i.test(message) || /domain is not verified/i.test(message)) {
    return [
      "Your Resend sending domain is not verified.",
      "Use free Gmail SMTP instead, or verify your own domain in Resend.",
    ].join(" ");
  }

  if (/invalid api key/i.test(message) || /api key is invalid/i.test(message)) {
    return "RESEND_API_KEY is invalid. Create a new API key in Resend or switch to Gmail SMTP.";
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

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const host = stripQuotes(process.env.SMTP_HOST!.trim());
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = stripQuotes(process.env.SMTP_USER!.trim());
  const pass = stripQuotes(process.env.SMTP_PASS!.trim());
  const from = getFromEmail();

  const [smtpHost] = await dns.resolve4(host);

  const transport = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      servername: host,
    },
  });

  await transport.sendMail({ from, to, subject, html, text });
}

export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ delivered: boolean }> {
  if (!email.endsWith("@gim.ac.in")) {
    throw new Error(GIM_EMAIL_ERROR);
  }

  const subject = "Your CampusCommute verification code";
  const html = buildOtpHtml(otp);
  const text = buildOtpText(otp);

  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(email, subject, html, text);
      console.log(`[OK] OTP email sent via SMTP to ${email}`);
      return { delivered: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown SMTP error";
      console.error(`[ERROR] SMTP failed for ${email}: ${message}`);

      if (isDevOtpAllowed()) {
        console.warn(`[DEV] Falling back to on-screen OTP for ${email}: ${otp}`);
        return { delivered: false };
      }

      throw new Error(
        `Gmail SMTP failed: ${message}. Check SMTP_USER, SMTP_PASS (Google App Password), and EMAIL_FROM on Railway.`
      );
    }
  }

  const resend = getResendClient();
  const fromEmail = getFromEmail();

  if (!resend) {
    if (isDevOtpAllowed()) {
      console.warn(`[DEV] No email provider configured. OTP for ${email}: ${otp}`);
      return { delivered: false };
    }

    throw new Error(
      [
        "No email provider configured.",
        "For a free setup, add Gmail SMTP variables on Railway (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM).",
      ].join(" ")
    );
  }

  if (isUsingResendTestSender(fromEmail) && !isDevOtpAllowed()) {
    throw new Error(
      [
        "Resend test sender cannot send OTP to @gim.ac.in.",
        "Use free Gmail SMTP instead — remove RESEND_API_KEY and set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM.",
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
