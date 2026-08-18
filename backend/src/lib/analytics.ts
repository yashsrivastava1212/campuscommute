const TOKEN = process.env.MIXPANEL_TOKEN;
const ENABLED = process.env.NODE_ENV === "production" && Boolean(TOKEN);

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function isAnalyticsEnabled(): boolean {
  return ENABLED;
}

/** Server-side Mixpanel track (production only). Uses internal user UUID as distinct_id. */
export function trackEvent(
  distinctId: string,
  event: string,
  properties: AnalyticsProps = {}
): void {
  if (!ENABLED || !TOKEN || !distinctId) return;

  const payload = [
    {
      event,
      properties: {
        distinct_id: distinctId,
        token: TOKEN,
        time: Math.floor(Date.now() / 1000),
        source: "backend",
        ...properties,
      },
    },
  ];

  fetch("https://api.mixpanel.com/track?verbose=0", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/plain",
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
