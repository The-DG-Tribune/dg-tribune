import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Loader } from "@/components/ui/Loader";
import type { LegalPages } from "@/types/firestore";
import { getDocumentById } from "@/services/firebase/firestore";

const FALLBACK =
  "DG Tribune provides football news, player and team information, quizzes, wallpapers, and interactive tools for personal, non-commercial use. Content accuracy is a priority, but football data can change quickly and occasional errors may occur.";

export default function TermsPage() {
  const [body, setBody] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const content = await getDocumentById<LegalPages>("legalPages", "content");
        setBody(content?.terms ?? FALLBACK);
      } catch {
        setBody(FALLBACK);
      }
    })();
  }, []);

  return (
    <Container>
      <div className="py-12 max-w-2xl mx-auto">
        <h1 className="font-heading text-page-title text-text mb-2">
          Terms of Service
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
