function capitalize(part: string): string {
  if (!part) return part;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

/**
 * GIM format: firstname.lastname<number>@gim.ac.in (e.g. yash.srivastava1212@gim.ac.in)
 */
export function nameFromGimEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split("@");
  if (!local || domain !== "gim.ac.in") return null;

  const match = local.match(/^([a-z]+)\.([a-z]+)(\d+)?$/);
  if (!match) return null;

  return `${capitalize(match[1])} ${capitalize(match[2])}`;
}

export function nameFromEmail(email: string): string {
  const gimName = nameFromGimEmail(email);
  if (gimName) return gimName;

  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return email;

  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => capitalize(part.replace(/\d+$/, "")))
    .filter(Boolean)
    .join(" ");
}

export function resolveDisplayName(
  displayName: string | null | undefined,
  email?: string | null
): string {
  if (email?.trim()) {
    const gimName = nameFromGimEmail(email);
    if (gimName) return gimName;
  }

  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  if (email?.trim()) return nameFromEmail(email);
  return "Student";
}
