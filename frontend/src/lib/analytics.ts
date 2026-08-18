import mixpanel from "mixpanel-browser";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const ENABLED =
  process.env.NODE_ENV === "production" &&
  typeof TOKEN === "string" &&
  TOKEN.length > 0;

let initialized = false;

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

function ensureInit() {
  if (!ENABLED || !TOKEN || initialized) return;
  mixpanel.init(TOKEN, {
    track_pageview: false,
    persistence: "localStorage",
    ignore_dnt: false,
  });
  initialized = true;
}

export function isAnalyticsEnabled(): boolean {
  return ENABLED;
}

export function identifyUser(userId: string) {
  if (!ENABLED || !userId) return;
  ensureInit();
  mixpanel.identify(userId);
}

export function resetAnalytics() {
  if (!ENABLED) return;
  ensureInit();
  mixpanel.reset();
}

export function trackEvent(event: string, properties: AnalyticsProps = {}) {
  if (!ENABLED) return;
  ensureInit();
  mixpanel.track(event, { source: "frontend", ...properties });
}
