import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlayerCard } from "@/components/cards/EntityCards";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Player } from "@/types/firestore";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Player>("players", {
        where: [
          ["isDeleted", "==", false],
          ["status", "==", "published"],
        ],
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setPlayers(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!players) return [];
    return players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [players, search]);

  return (
    <Container>
      <div className="py-10">
        <h1 className="font-heading text-page-title text-text mb-2">Players</h1>
        <p className="text-body text-text-secondary mb-6">
          Browse player profiles from across the world of football.
        </p>

        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search players by name…"
          className="mb-8 max-w-xs"
        />

        {error ? (
          <ErrorState description={error} onRetry={load} />
        ) : players === null ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={players.length === 0 ? "No players yet." : "No players match your search."}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
