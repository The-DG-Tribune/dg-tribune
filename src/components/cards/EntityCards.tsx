import { Link } from "react-router-dom";
import { Card, CardImage, CardBody } from "@/components/cards/Card";
import { QuizCoverArt } from "@/components/quiz/QuizCoverArt";
import { ROUTES } from "@/constants/routes";
import type { League, Player, Quiz, Team } from "@/types/firestore";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <Link to={ROUTES.player(player.slug)}>
      <Card interactive>
        {/* Portrait frame (3:4), not the generic 16:10 CardImage used
         * for article/team thumbnails - a headshot squeezed into a
         * wide landscape box crops badly (cuts off the head/sides). */}
        <div className="aspect-[3/4] w-full overflow-hidden bg-surface">
          {player.photoUrl && (
            <img
              src={player.photoUrl}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          )}
        </div>
        <CardBody>
          <h3 className="font-heading text-card-title text-text truncate">
            {player.name}
          </h3>
          <p className="text-small text-text-secondary">
            {player.position}
            {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}

export function TeamCard({ team }: { team: Team }) {
  return (
    <Link to={ROUTES.team(team.slug)}>
      <Card interactive>
        <CardImage className="flex items-center justify-center bg-background p-6">
          {team.logoUrl && (
            <img src={team.logoUrl} alt="" className="h-full w-full object-contain" />
          )}
        </CardImage>
        <CardBody>
          <h3 className="font-heading text-card-title text-text truncate">
            {team.name}
          </h3>
          <p className="text-small text-text-secondary truncate">
            {team.stadium || "-"}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}

export function LeagueCard({ league }: { league: League }) {
  return (
    <Link to={ROUTES.league(league.slug)}>
      <Card interactive>
        <CardImage className="flex items-center justify-center bg-background p-6">
          {league.logoUrl && (
            <img src={league.logoUrl} alt="" className="h-full w-full object-contain" />
          )}
        </CardImage>
        <CardBody>
          <h3 className="font-heading text-card-title text-text truncate">
            {league.name}
          </h3>
          <p className="text-small text-text-secondary truncate">
            {league.country || "-"}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}

export function QuizCard({ quiz }: { quiz: Quiz }) {
  return (
    <Link to={ROUTES.quiz(quiz.slug)}>
      <Card interactive>
        <CardImage className="bg-surface">
          <QuizCoverArt title={quiz.title} iconClassName="h-8 w-8" />
        </CardImage>
        <CardBody>
          <h3 className="font-heading text-card-title text-text truncate">
            {quiz.title}
          </h3>
          <p className="text-small text-text-secondary truncate">
            {quiz.questions?.length ?? 0} questions
            {quiz.playCount ? ` · ${quiz.playCount.toLocaleString()} played` : ""}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}
