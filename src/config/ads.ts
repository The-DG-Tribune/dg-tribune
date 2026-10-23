/**
 * Ad tags (Monetag) and the rules for where each one may run.
 *
 * These three tags are page-level scripts, not fixed boxes, so
 * "placement" here means WHICH PAGES each tag is allowed to start on.
 * AdManager (src/components/ads/AdManager.tsx) does the loading.
 */

export type AdTagId = "vignette" | "inpush" | "onclick";

export interface AdTagConfig {
  src: string;
  /** Set when the tag reads its zone from data-zone (dataset style). */
  zone?: string;
  /** "dataset" = zone in data-zone. "script" = zone is already in the URL. */
  mode: "dataset" | "script";
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
  // Third tag (zone 12100513). Standard Monetag "tag.min.js" format,
  // kept on only the highest-intent pages.
  onclick: {
    src: "https://nap5k.com/tag.min.js",
    zone: "12100513",
    mode: "dataset",
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

  // Blog posts: best earners, so all three formats.
  if (p.startsWith("/article/")) return ["vignette", "inpush", "onclick"];

  // Player, team and league profiles: long reads, banner + in-page push.
  if (/^\/(player|team|league)\//.test(p)) return ["vignette", "inpush"];

  // News feeds.
  if (p === "/football" || p === "/hot-takes") return ["vignette", "inpush"];

  // Wallpapers: people come to download, so higher-intent formats.
  if (p === "/wallpapers") return ["inpush", "onclick"];

  // Gentle pages: in-page push only (small, never blocks anything).
  if (p === "/") return ["inpush"];
  if (["/players", "/teams", "/leagues", "/search", "/tools"].includes(p)) {
    return ["inpush"];
  }
  if (p.startsWith("/tools/")) return ["inpush"]; // Dream Team Builder etc.

  // Legal, contact, 404, anything else: no ads.
  return [];
}
