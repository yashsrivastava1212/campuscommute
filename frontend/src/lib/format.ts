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
