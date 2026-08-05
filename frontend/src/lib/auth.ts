const GIM_DOMAIN = "@gim.ac.in";

export function isValidGimEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) && trimmed.endsWith(GIM_DOMAIN);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export { GIM_DOMAIN };
