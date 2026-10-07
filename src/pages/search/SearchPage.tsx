import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "@/components/layout/Container";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loader } from "@/components/ui/Loader";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/routes";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Article, League, Player, Team } from "@/types/firestore";

interface SearchData {
  articles: Article[];
  players: Player[];
  teams: Team[];
  leagues: League[];
}

/**
 * SearchPage - Document 07 Public Website Foundation.
 * A working, client-side search across published content. A proper
 * indexed, autocomplete universal search is built in Phase 11 - this
 * is the functional first version, not a placeholder.
 */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [data, setData] = useState<SearchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [articles, players, teams, leagues] = await Promise.all([
        getCollectionDocs<Article>("articles", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
        getCollectionDocs<Player>("players", {
          where: [["isDeleted", "==", false]],
        }),
        getCollectionDocs<Team>("teams", { where: [["isDeleted", "==", false]] }),
        getCollectionDocs<League>("leagues", {
          where: [["isDeleted", "==", false]],
        }),
      ]);
      setData({ articles, players, teams, leagues });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const results = useMemo(() => {
    if (!data || !query.trim()) return null;
    const q = query.toLowerCase();
    return {
      articles: data.articles.filter((a) => a.title.toLowerCase().includes(q)),
      players: data.players.filter((p) => p.name.toLowerCase().includes(q)),
      teams: data.teams.filter((t) => t.name.toLowerCase().includes(q)),
      leagues: data.leagues.filter((l) => l.name.toLowerCase().includes(q)),
    };
  }, [data, query]);

  const totalResults = results
    ? results.articles.length +
      results.players.length +
      results.teams.length +
      results.leagues.length
    : 0;

  return (
    <Container>
      <div className="py-10 max-w-2xl mx-auto">
        <h1 className="font-heading text-page-title text-text mb-6">
          Search DG Tribune
        </h1>

        <SearchInput
          value={query}
          onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})}
          onClear={() => setSearchParams({})}
          placeholder="Search articles, players, teams, leagues…"
          autoFocus
        />

        <div className="mt-8">
          {error ? (
            <ErrorState description={error} onRetry={load} />
          ) : !data ? (
            <div className="flex justify-center py-12">
              <Loader label="Loading…" />
            </div>
          ) : !query.trim() ? (
            <p className="text-small text-text-secondary text-center py-8">
              Start typing to search across the whole site.
            </p>
          ) : totalResults === 0 ? (
            <EmptyState
              title={`No results for "${query}"`}
              description="Try a different spelling or a broader term."
            />
          ) : (
            <div className="space-y-8">
              {results!.articles.length > 0 && (
                <ResultGroup title="Articles">
                  {results!.articles.map((a) => (
                    <Link
                      key={a.id}
                      to={ROUTES.article(a.slug)}
                      className="block rounded-button border border-border bg-surface px-4 py-3 hover:border-accent transition-colors duration-button"
                    >
                      {a.title}
                    </Link>
                  ))}
                </ResultGroup>
              )}
              {results!.players.length > 0 && (
                <ResultGroup title="Players">
                  {results!.players.map((p) => (
                    <Link
                      key={p.id}
                      to={ROUTES.player(p.slug)}
                      className="block rounded-button border border-border bg-surface px-4 py-3 hover:border-accent transition-colors duration-button"
                    >
                      {p.name}
                    </Link>
                  ))}
                </ResultGroup>
              )}
              {results!.teams.length > 0 && (
                <ResultGroup title="Teams">
                  {results!.teams.map((t) => (
                    <Link
                      key={t.id}
                      to={ROUTES.team(t.slug)}
                      className="block rounded-button border border-border bg-surface px-4 py-3 hover:border-accent transition-colors duration-button"
                    >
                      {t.name}
                    </Link>
                  ))}
                </ResultGroup>
              )}
              {results!.leagues.length > 0 && (
                <ResultGroup title="Leagues">
                  {results!.leagues.map((l) => (
                    <Link
                      key={l.id}
                      to={ROUTES.league(l.slug)}
                      className="block rounded-button border border-border bg-surface px-4 py-3 hover:border-accent transition-colors duration-button"
                    >
                      {l.name}
                    </Link>
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function ResultGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Badge className="mb-3">{title}</Badge>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
