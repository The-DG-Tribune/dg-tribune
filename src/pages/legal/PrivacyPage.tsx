import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Loader } from "@/components/ui/Loader";
import type { LegalPages } from "@/types/firestore";
import { getDocumentById } from "@/services/firebase/firestore";

const FALLBACK =
  "DG Tribune collects basic usage information to understand what fans enjoy and to improve the site. No account is required to browse, read, or use any public feature. Usage data is never sold to third parties.";

export default function PrivacyPage() {
  const [body, setBody] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const content = await getDocumentById<LegalPages>("legalPages", "content");
        setBody(content?.privacy ?? FALLBACK);
      } catch {
        // Never leave the page stuck on a spinner - always fall back
        // to real, sensible copy rather than an infinite load.
        setBody(FALLBACK);
      }
    })();
  }, []);

  return (
    <Container>
      <div className="py-12 max-w-2xl mx-auto">
        <h1 className="font-heading text-page-title text-text mb-2">
          Privacy Policy
        </h1>
        <p className="text-caption text-text-secondary mb-8">
          Last updated: July 2026
        </p>

        {body === null ? (
          <Loader label="Loading..." />
        ) : (
          <p className="text-body text-text-secondary whitespace-pre-wrap leading-relaxed">
            {body}
          </p>
        )}
      </div>
    </Container>
  );
}
