import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

const STORAGE_KEY = "dg-tribune-cookie-consent";

export type CookieConsent = "accepted" | "essential-only";

/** Reads the stored consent choice, if any. Other modules (e.g. an
 * analytics initializer) should check this before loading anything
 * that isn't strictly necessary for the site to function. */
export function getCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "essential-only" ? value : null;
  } catch {
    return null;
  }
}

/**
 * CookieConsentBanner - a simple, free, self-hosted consent banner.
 * Nothing beyond strictly-necessary cookies (auth session) loads
 * until a choice is made. No third-party consent service involved.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  function choose(consent: CookieConsent) {
    try {
      localStorage.setItem(STORAGE_KEY, consent);
    } catch {
      // ignore - if storage is blocked, just hide the banner for this session
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6">
      <GlassCard className="mx-auto flex max-w-2xl flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Cookie className="h-4 w-4" />
          </span>
          <p className="text-small text-text-secondary">
            We use essential cookies to keep you signed in. With your
            permission, we'd also like to use analytics cookies to
            understand how the site is used.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => choose("essential-only")}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            Accept all
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
