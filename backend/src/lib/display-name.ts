export function nameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return email;

  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function resolveDisplayName(
  displayName: string | null | undefined,
  email?: string | null
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  if (email?.trim()) return nameFromEmail(email);
  return "Student";
}
