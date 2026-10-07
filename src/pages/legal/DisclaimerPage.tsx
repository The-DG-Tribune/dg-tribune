import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Loader } from "@/components/ui/Loader";
import type { LegalPages } from "@/types/firestore";
import { getDocumentById } from "@/services/firebase/firestore";

const FALLBACK =
  "DG Tribune is an independent football news and fan platform, not affiliated with, endorsed by, or officially connected to FIFA, UEFA, any football league, club, or player mentioned on this site.";

export default function DisclaimerPage() {
  const [body, setBody] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const content = await getDocumentById<LegalPages>("legalPages", "content");
        setBody(content?.disclaimer ?? FALLBACK);
      } catch {
        setBody(FALLBACK);
      }
    })();
  }, []);

  return (
    <Container>
      <div className="py-12 max-w-2xl mx-auto">
        <h1 className="font-heading text-page-title text-text mb-8">
          Disclaimer
        </h1>

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
