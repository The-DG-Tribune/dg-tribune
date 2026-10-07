import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { useToast } from "@/context/ToastContext";
import type { SiteSettings } from "@/types/firestore";
import {
  getDocumentById,
  setDocumentById,
} from "@/services/firebase/firestore";

const SOCIAL_PLATFORMS = [
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/dgtribune" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/dgtribune" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/dgtribune" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@dgtribune" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@dgtribune" },
];

export default function Settings() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [siteName, setSiteName] = useState("DG Tribune");
  const [tagline, setTagline] = useState("The Home of Sports Fans");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [showEmailInFooter, setShowEmailInFooter] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const settings = await getDocumentById<SiteSettings>(
          "siteSettings",
          "settings"
        );
        if (settings) {
          setSiteName(settings.siteName ?? "DG Tribune");
          setTagline(settings.tagline ?? "The Home of Sports Fans");
          setLogoUrl(settings.logoUrl || null);
          setContactEmail(settings.contactEmail ?? "");
          setShowEmailInFooter(settings.showEmailInFooter ?? false);
          setSocialLinks(settings.socialLinks ?? {});
        }
      } catch (err) {
        setLoadError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDocumentById("siteSettings", "settings", {
        siteName: siteName.trim(),
        tagline: tagline.trim(),
        logoUrl: logoUrl || "",
        contactEmail: contactEmail.trim(),
        showEmailInFooter,
        socialLinks,
      });
      showToast("Settings saved");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader label="Loading settings…" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState description={loadError} />;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Badge variant="accent" className="mb-3">
          Phase 6 · CMS Modules
        </Badge>
        <h1 className="font-heading text-page-title text-text">Settings</h1>
        <p className="text-small text-text-secondary mt-1">
          Site-wide configuration - used across the public site once Phase 7
          builds the real header and footer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="max-w-xs">
          <ImageUploader
            value={logoUrl}
            onChange={setLogoUrl}
            label="Site logo"
            aspectClassName="aspect-square"
          />
        </div>

        <Input
          label="Site name"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          required
        />

        <Textarea
          label="Tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          rows={2}
        />

        <Input
          label="Contact email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="hello@dgtribune.com"
        />

        <label className="flex items-center gap-2 text-small text-text-secondary">
          <input
            type="checkbox"
            checked={showEmailInFooter}
            onChange={(e) => setShowEmailInFooter(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Show this email in the site footer
        </label>

        <div>
          <p className="mb-3 text-small font-medium text-text">
            Social links
          </p>
          <p className="mb-3 text-caption text-text-secondary">
            Leave a platform blank to hide its icon everywhere it
            appears (footer, etc.) - fill it in to show it.
          </p>
          <div className="space-y-3">
            {SOCIAL_PLATFORMS.map((platform) => (
              <Input
                key={platform.key}
                label={platform.label}
                value={socialLinks[platform.key] ?? ""}
                onChange={(e) =>
                  setSocialLinks((prev) => ({
                    ...prev,
                    [platform.key]: e.target.value,
                  }))
                }
                placeholder={platform.placeholder}
              />
            ))}
          </div>
        </div>

        <Button type="submit" isLoading={isSaving}>
          Save Settings
        </Button>
      </form>
    </div>
  );
}
