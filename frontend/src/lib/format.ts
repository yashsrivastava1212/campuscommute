function capitalize(part: string) {
  if (!part) return part;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

/** GIM format: firstname.lastname<number>@gim.ac.in */
export function nameFromGimEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split("@");
  if (!local || domain !== "gim.ac.in") return null;

  const match = local.match(/^([a-z]+)\.([a-z]+)(\d+)?$/);
  if (!match) return null;

  return `${capitalize(match[1])} ${capitalize(match[2])}`;
}

export function nameFromEmail(email: string) {
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
  displayName?: string | null,
  email?: string | null
) {
  if (email?.trim()) {
    const gimName = nameFromGimEmail(email);
    if (gimName) return gimName;
  }

  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  if (email?.trim()) return nameFromEmail(email);
  return "Student";
}

export function getCalendarDateKey(iso: string | Date, timeZone = "Asia/Kolkata") {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isSameCalendarDay(a: string | Date, b: string | Date) {
  return getCalendarDateKey(a) === getCalendarDateKey(b);
}

export function shortLocation(name: string) {
  const part = name.split("—")[0]?.trim();
  return part && part.length > 0 ? part : name;
}

export function formatRideDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(iso))
    .toUpperCase();
}

export function formatRideTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function seatsLabel(available: number) {
  if (available <= 0) return "Full";
  if (available === 1) return "1 seat left";
  return `${available} seats left`;
}
