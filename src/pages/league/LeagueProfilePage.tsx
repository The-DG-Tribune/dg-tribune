import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamCard } from "@/components/cards/EntityCards";
import { ROUTES } from "@/constants/routes";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { getDocumentBySlug, getCollectionDocs } from "@/services/firebase/firestore";
import type { League, Team } from "@/types/firestore";

export default function LeagueProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const found = await getDocumentBySlug<League>("leagues", slug);
      if (!found) {
        setNotFound(true);
        return;
      }
      setLeague(found);

      const teamData = await getCollectionDocs<Team>("teams", {
        where: [
          ["isDeleted", "==", false],
          ["leagueId", "==", found.id],
        ],
      });
      setTeams(teamData);
    })();
  }, [slug]);

  useDocumentHead({
    title: league?.name ?? "League",
    description: league
      ? `${league.name}${league.country ? ` (${league.country})` : ""} - teams, standings and more on DG Tribune.`
      : undefined,
    image: league?.logoUrl,
  });

  if (notFound) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="font-heading text-page-title text-text mb-2">
            League not found
          </h1>
          <Link to={ROUTES.leagues} className="text-accent underline">
            Back to Leagues
          </Link>
        </div>
      </Container>
    );
  }

  if (!league) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Loader label="Loading league…" />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 max-w-3xl mx-auto">
          <div className="h-32 w-32 shrink-0 flex items-center justify-center rounded-card border border-border bg-surface p-4">
            {league.logoUrl && (
              <img src={league.logoUrl} alt="" className="h-full w-full object-contain" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="font-heading text-page-title text-text mb-2">
              {league.name}
            </h1>
            {league.country && <Badge className="mb-3">{league.country}</Badge>}
            {league.bio && (
              <p className="text-body text-text-secondary max-w-xl">
                {league.bio}
              </p>
            )}
          </div>
        </div>

        <h2 className="font-heading text-section-title text-text mb-5">Teams</h2>
        {teams.length === 0 ? (
          <EmptyState title="No teams assigned to this league yet." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
