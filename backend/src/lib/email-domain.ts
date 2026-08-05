export const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN ?? "gim.ac.in";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidGimEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (
    emailRegex.test(normalized) &&
    normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
  );
}
