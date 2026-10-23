/**
 * Ad tags (Monetag) and the rules for where each one may run.
 *
 * These three tags are page-level scripts, not fixed boxes, so
 * "placement" here means WHICH PAGES each tag is allowed to start on.
 * AdManager (src/components/ads/AdManager.tsx) does the loading.
 */

export type AdTagId = "vignette" | "inpush" | "inpush2";

export interface AdTagConfig {
  src: string;
  /** Set when the tag reads its zone from data-zone (dataset style). */
  zone?: string;
  /** "dataset" = zone in data-zone. "script" = zone is already in the URL. */
  mode: "dataset" | "script";
  /** Extra wait (ms) after the page delay, so two cards never appear together. */
  extraDelayMs?: number;
}

export const AD_TAGS: Record<AdTagId, AdTagConfig> = {
  // Vignette banner: one full-width banner that pops up now and then.
  vignette: {
    src: "https://n6wxm.com/vignette.min.js",
    zone: "12100507",
    mode: "dataset",
  },
  // In-page push: a small notification-style card in the corner.
  inpush: {
    src: "https://5gvci.com/act/files/tag.min.js?z=12100510",
    mode: "script",
  },
  // Second in-page push zone (12100513). Starts later than the first so
  // the two cards never appear on screen at the same moment.
  inpush2: {
    src: "https://nap5k.com/tag.min.js",
    zone: "12100513",
    mode: "dataset",
    extraDelayMs: 18000,
  },
};

/** Wait this long after a page opens before starting ads, so content shows first. */
export const AD_START_DELAY_MS = 3500;

/** Tool pages that are quizzes/games: ad-free, same as the Quizzes pages. */
const QUIZ_TOOL_SLUGS = [
  "jersey-number-quiz",
  "club-logo-quiz",
  "guess-the-player",
  "football-trivia-rush",
];

function clean(pathname: string): string {
  const p = pathname.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

/** True on every quiz page and quiz-style tool. Ads are never allowed there. */
export function isAdFreeZone(pathname: string): boolean {
  const p = clean(pathname);
  if (p === "/quizzes" || p.startsWith("/quiz/")) return true;
  if (p.startsWith("/tools/")) {
    return QUIZ_TOOL_SLUGS.includes(p.slice("/tools/".length));
  }
  return false;
}

/** Which tags may start on this page. Anything not listed gets no ads. */
export function adsForPath(pathname: string): AdTagId[] {
  const p = clean(pathname);
  if (isAdFreeZone(p)) return [];

  // Blog posts: best earners, so every format.
  if (p.startsWith("/article/")) return ["vignette", "inpush", "inpush2"];

  // Profiles and news feeds: long reads, banner + both push zones.
  if (/^\/(player|team|league)\//.test(p)) return ["vignette", "inpush", "inpush2"];
  if (p === "/football" || p === "/hot-takes") return ["vignette", "inpush", "inpush2"];

  // Wallpapers: people come to download and browse for a long time.
  if (p === "/wallpapers") return ["inpush", "inpush2"];

  // Home and list pages.
  if (p === "/") return ["inpush", "inpush2"];
  if (["/players", "/teams", "/leagues", "/search", "/tools"].includes(p)) {
    return ["inpush", "inpush2"];
  }

  // Tools (Dream Team Builder, Formation Builder, predictors...).
  if (p.startsWith("/tools/")) return ["inpush", "inpush2"];

  // Legal, contact, 404, anything else: no ads.
  return [];
}
