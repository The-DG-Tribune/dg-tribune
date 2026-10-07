import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Twitter, Youtube, Facebook, Music2, Mail } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ROUTES } from "@/constants/routes";
import { getDocumentById } from "@/services/firebase/firestore";
import type { SiteSettings } from "@/types/firestore";

const quickLinks = [
  { label: "Football", href: ROUTES.football },
  { label: "Players", href: ROUTES.players },
  { label: "Teams", href: ROUTES.teams },
  { label: "Tools", href: ROUTES.tools },
  { label: "Quizzes", href: ROUTES.quizzes },
  { label: "Wallpapers", href: ROUTES.wallpapers },
];

const legalLinks = [
  { label: "Privacy", href: ROUTES.privacy },
  { label: "Terms", href: ROUTES.terms },
  { label: "Disclaimer", href: ROUTES.disclaimer },
  { label: "Contact", href: ROUTES.contact },
];

// Maps each Settings platform key to its icon - only platforms with a
// real URL saved in Settings render at all, so this never falls back
// to a placeholder link.
const SOCIAL_ICON_MAP: Record<string, typeof Instagram> = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
};
const SOCIAL_LABEL_MAP: Record<string, string> = {
  twitter: "X (Twitter)",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/**
 * Footer - dark glass surface with an ambient floodlight-style mesh
 * and a soft grid, all pure CSS/SVG (no external image asset, so
 * there's nothing to source or license). The oversized "DG TRIBUNE"
 * wordmark bleeding off the bottom edge is the signature moment -
 * a subtle animated sheen sweeps across it on a slow loop.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getDocumentById<SiteSettings>("siteSettings", "settings")
      .then(setSettings)
      .catch(() => {
        // Footer still renders fine without settings - just no
        // social icons or footer email until Firestore is reachable.
      });
  }, []);

  const activeSocials = Object.entries(settings?.socialLinks ?? {}).filter(
    ([, url]) => url && url.trim().length > 0
  );

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-background-secondary">
      {/* Ambient background: floodlight glows + faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(at 20% 0%, rgba(0,230,118,0.16) 0px, transparent 55%), radial-gradient(at 80% 20%, rgba(59,130,246,0.14) 0px, transparent 55%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      <Container className="relative">
        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              to={ROUTES.home}
              className="font-heading text-card-title font-bold tracking-tight text-text"
            >
              DG <span className="bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">Tribune</span>
            </Link>
            <p className="mt-2 text-small text-text-secondary">
              {settings?.tagline || "The Home of Sports Fans"}
            </p>
            <div className="mt-4 flex gap-2">
              {activeSocials.map(([key, url]) => {
                const Icon = SOCIAL_ICON_MAP[key];
                if (!Icon) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_LABEL_MAP[key] ?? key}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-text-secondary transition-colors duration-button hover:border-accent/40 hover:text-accent"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
              {settings?.showEmailInFooter && settings.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  aria-label="Email"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-text-secondary transition-colors duration-button hover:border-accent/40 hover:text-accent"
                >
                  <Mail className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-small font-semibold text-text">Explore</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-small text-text-secondary transition-colors duration-button hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-small font-semibold text-text">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-small text-text-secondary transition-colors duration-button hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-small font-semibold text-text">Status</h3>
            <p className="flex items-center gap-2 text-small text-text-secondary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-accent" />
              </span>
              All systems live
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-white/10 py-6 text-center text-caption text-text-secondary md:flex-row md:justify-between">
          <span>© {year} DG Tribune. All rights reserved.</span>
          <span>Built for fans, by fans.</span>
        </div>
      </Container>

      {/* Signature oversized wordmark, bleeding off the bottom edge */}
      <div className="pointer-events-none relative -mb-[0.08em] select-none overflow-hidden text-center leading-none">
        <span
          className="font-heading font-bold tracking-tighter"
          style={{
            fontSize: "clamp(4rem, 16vw, 11rem)",
            backgroundImage:
              "linear-gradient(110deg, rgba(255,255,255,0.06) 30%, rgba(0,230,118,0.35) 50%, rgba(255,255,255,0.06) 70%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            animation: "footer-sheen 6s ease-in-out infinite",
          }}
        >
          DG TRIBUNE
        </span>
      </div>
      <style>{`
        @keyframes footer-sheen {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </footer>
  );
}
