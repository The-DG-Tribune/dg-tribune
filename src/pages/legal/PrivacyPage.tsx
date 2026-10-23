import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Loader } from "@/components/ui/Loader";
import type { LegalPages } from "@/types/firestore";
import { getDocumentById } from "@/services/firebase/firestore";

const FALLBACK =
  "DG Tribune collects basic usage information to understand what fans enjoy and to improve the site. No account is required to browse, read, or use any public feature.";

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
          Last updated: October 2026
        </p>

        {body === null ? (
          <Loader label="Loading..." />
        ) : (
          <p className="text-body text-text-secondary whitespace-pre-wrap leading-relaxed">
            {body}
          </p>
        )}

        <h2 className="font-heading text-xl text-text mt-10 mb-2">
          Advertising and cookies
        </h2>
        <p className="text-body text-text-secondary leading-relaxed">
          DG Tribune is free to use and is funded by advertising. We work
          with third-party advertising partners (such as Monetag) who show ads
          on our pages. These partners may use cookies and similar technologies
          to deliver ads, limit how often you see them, and measure how they
          perform. They may receive information such as your IP address,
          device and browser type, and the pages you view. You can block or
          delete cookies at any time in your browser settings, and you can
          turn off notifications from the site in your browser. We do not run
          ads on our quiz pages. For questions, use our Contact page.
        </p>
      </div>
    </Container>
  );
}
