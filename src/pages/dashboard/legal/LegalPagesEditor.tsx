import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/context/ToastContext";
import type { LegalPages } from "@/types/firestore";
import { getDocumentById, setDocumentById } from "@/services/firebase/firestore";

const DEFAULTS = {
  privacy:
    "DG Tribune collects basic usage information to understand what fans enjoy and to improve the site. No account is required to browse, read, or use any public feature. Usage data is never sold to third parties.",
  terms:
    "DG Tribune provides football news, player and team information, quizzes, wallpapers, and interactive tools for personal, non-commercial use. Content accuracy is a priority, but football data can change quickly and occasional errors may occur.",
  disclaimer:
    "DG Tribune is an independent football news and fan platform, not affiliated with, endorsed by, or officially connected to FIFA, UEFA, any football league, club, or player mentioned on this site.",
};

/**
 * Legal Pages editor - not linked in the sidebar, reachable directly
 * at /dashboard/legal. Lets the administrator update Privacy, Terms,
 * and Disclaimer wording without a code change; the public pages
 * read from the same Firestore document.
 */
export default function LegalPagesEditor() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [privacy, setPrivacy] = useState("");
  const [terms, setTerms] = useState("");
  const [disclaimer, setDisclaimer] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const content = await getDocumentById<LegalPages>("legalPages", "content");
        setPrivacy(content?.privacy ?? DEFAULTS.privacy);
        setTerms(content?.terms ?? DEFAULTS.terms);
        setDisclaimer(content?.disclaimer ?? DEFAULTS.disclaimer);
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
      await setDocumentById("legalPages", "content", { privacy, terms, disclaimer });
      showToast("Legal pages updated");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader label="Loading legal pages..." />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState description={loadError} />;
  }

  return (
    <div className="max-w-2xl">
      <Badge variant="warning" className="mb-3">
        Direct-link tool
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-2">
        Legal Pages
      </h1>
      <p className="text-body text-text-secondary mb-8">
        Edit the wording shown on the public Privacy, Terms, and Disclaimer
        pages. Changes go live immediately after saving.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Textarea
          label="Privacy Policy"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
          rows={8}
        />
        <Textarea
          label="Terms of Service"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={8}
        />
        <Textarea
          label="Disclaimer"
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          rows={6}
        />
        <Button type="submit" isLoading={isSaving}>
          Save Changes
        </Button>
      </form>
    </div>
  );
}
