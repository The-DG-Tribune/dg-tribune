import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlayerCard } from "@/components/cards/EntityCards";
import { ROUTES } from "@/constants/routes";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import {
  getDocumentBySlug,
  getDocumentById,
  getCollectionDocs,
} from "@/services/firebase/firestore";
import type { League, Player, Team } from "@/types/firestore";

export default function TeamProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const found = await getDocumentBySlug<Team>("teams", slug);
      if (!found) {
        setNotFound(true);
        return;
      }
      setTeam(found);

      const [leagueData, playerData] = await Promise.all([
        found.leagueId
          ? getDocumentById<League>("leagues", found.leagueId)
          : Promise.resolve(null),
        getCollectionDocs<Player>("players", {
          where: [
            ["isDeleted", "==", false],
            ["currentTeamId", "==", found.id],
          ],
        }),
      ]);
      setLeague(leagueData);
      setPlayers(playerData);
    })();
  }, [slug]);

  useDocumentHead({
    title: team?.name ?? "Team",
    description: team
      ? `${team.name}${league ? ` - ${league.name}` : ""}. Squad, stadium and stats on DG Tribune.`
      : undefined,
    image: team?.logoUrl,
  });

  if (notFound) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="font-heading text-page-title text-text mb-2">
            Team not found
          </h1>
          <Link to={ROUTES.teams} className="text-accent underline">
            Back to Teams
          </Link>
        </div>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Loader label="Loading team…" />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 max-w-3xl mx-auto">
          <div className="h-32 w-32 shrink-0 flex items-center justify-center rounded-card border border-border bg-surface p-4">
            {team.logoUrl && (
              <img src={team.logoUrl} alt="" className="h-full w-full object-contain" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="font-heading text-page-title text-text mb-2">
              {team.name}
            </h1>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
              {team.stadium && <Badge>{team.stadium}</Badge>}
              {team.founded && <Badge>Est. {team.founded}</Badge>}
              {league && (
                <Link to={ROUTES.league(league.slug)}>
                  <Badge variant="accent">{league.name}</Badge>
                </Link>
              )}
            </div>
            {team.bio && (
              <p className="text-body text-text-secondary max-w-xl">{team.bio}</p>
            )}
          </div>
        </div>

        <h2 className="font-heading text-section-title text-text mb-5">Squad</h2>
        {players.length === 0 ? (
          <EmptyState title="No players assigned to this team yet." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
