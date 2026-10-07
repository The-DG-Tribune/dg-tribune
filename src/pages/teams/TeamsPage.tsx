import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { SearchInput } from "@/components/ui/SearchInput";
import { TeamCard } from "@/components/cards/EntityCards";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Team } from "@/types/firestore";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Team>("teams", {
        where: [
          ["isDeleted", "==", false],
          ["status", "==", "published"],
        ],
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!teams) return [];
    return teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [teams, search]);

  return (
    <Container>
      <div className="py-10">
        <h1 className="font-heading text-page-title text-text mb-2">Teams</h1>
        <p className="text-body text-text-secondary mb-6">
          Explore club profiles, stadiums, and history.
        </p>

        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search teams by name…"
          className="mb-8 max-w-xs"
        />

        {error ? (
          <ErrorState description={error} onRetry={load} />
        ) : teams === null ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={teams.length === 0 ? "No teams yet." : "No teams match your search."}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
