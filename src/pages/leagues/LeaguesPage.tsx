import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { LeagueCard } from "@/components/cards/EntityCards";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { League } from "@/types/firestore";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<League>("leagues", {
        where: [
          ["isDeleted", "==", false],
          ["status", "==", "published"],
        ],
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setLeagues(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Container>
      <div className="py-10">
        <h1 className="font-heading text-page-title text-text mb-2">Leagues</h1>
        <p className="text-body text-text-secondary mb-8">
          Every league covered on DG Tribune.
        </p>

        {error ? (
          <ErrorState description={error} onRetry={load} />
        ) : leagues === null ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : leagues.length === 0 ? (
          <EmptyState title="No leagues yet." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {leagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
