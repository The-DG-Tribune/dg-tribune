import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getCookieConsent } from "@/components/layout/CookieConsentBanner";
import {
  AD_START_DELAY_MS,
  AD_TAGS,
  adsForPath,
  isAdFreeZone,
  type AdTagId,
} from "@/config/ads";

/** Tags already started during this page visit. */
const started = new Set<AdTagId>();

function startTag(id: AdTagId) {
  if (started.has(id)) return;
  try {
    const tag = AD_TAGS[id];
    const s = document.createElement("script");
    s.setAttribute("data-dg-ad", id);
    if (tag.zone) s.dataset.zone = tag.zone;
    s.src = tag.src;
    if (tag.mode === "script") {
      s.async = true;
      s.setAttribute("data-cfasync", "false");
    }
    (document.body ?? document.documentElement).appendChild(s);
    started.add(id);
  } catch {
    // An ad failing must never break the site.
  }
}

/**
 * AdManager - starts each ad tag only on the pages that allow it.
 *
 * - Waits for the visitor's cookie choice ("Accept all") before loading.
 * - Never runs on quizzes/quiz tools, the dashboard or the admin login.
 * - Ad scripts cannot be removed once started, so if a visitor who has
 *   seen ads opens a quiz (or leaves the public site), the page reloads
 *   once to get a clean, ad-free page.
 */
export function AdManager() {
  const { pathname } = useLocation();
  const [consent, setConsent] = useState(() => getCookieConsent());

  useEffect(() => {
    const refresh = () => setConsent(getCookieConsent());
    window.addEventListener("dg-consent-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("dg-consent-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (isAdFreeZone(pathname)) {
      if (started.size > 0) window.location.reload();
      return;
    }
    if (consent !== "accepted") return;
    const wanted = adsForPath(pathname).filter((id) => !started.has(id));
    if (wanted.length === 0) return;
    const timer = window.setTimeout(() => wanted.forEach(startTag), AD_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, consent]);

  // Leaving the public site (e.g. to the dashboard) clears ads with a reload.
  useEffect(() => {
    return () => {
      if (started.size > 0) window.location.reload();
    };
  }, []);

  return null;
}
