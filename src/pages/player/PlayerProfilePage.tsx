import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shirt, Cake, Flag, Trophy, Target, Goal, Shield, ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { PlayerCard } from "@/components/cards/EntityCards";
import { Loader } from "@/components/ui/Loader";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import {
  getDocumentBySlug,
  getDocumentById,
  getCollectionDocs,
} from "@/services/firebase/firestore";
import type { Player, Team } from "@/types/firestore";

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PlayerProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teammates, setTeammates] = useState<Player[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const found = await getDocumentBySlug<Player>("players", slug);
      if (!found) {
        setNotFound(true);
        return;
      }
      setPlayer(found);
      if (found.currentTeamId) {
        const [teamDoc, allPlayers] = await Promise.all([
          getDocumentById<Team>("teams", found.currentTeamId),
          getCollectionDocs<Player>("players", {
            where: [
              ["isDeleted", "==", false],
              ["status", "==", "published"],
              ["currentTeamId", "==", found.currentTeamId],
            ],
          }),
        ]);
        setTeam(teamDoc);
        setTeammates(allPlayers.filter((p) => p.id !== found.id).slice(0, 4));
      }
    })();
  }, [slug]);

  useDocumentHead({
    title: player?.name ?? "Player",
    description: player
      ? `${player.name} - ${player.position}${team ? ` for ${team.name}` : ""}. Stats, bio and more on DG Tribune.`
      : undefined,
    image: player?.photoUrl,
  });

  if (notFound) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="font-heading text-page-title text-text mb-2">
            Player not found
          </h1>
          <Link to={ROUTES.players} className="text-accent underline">
            Back to Players
          </Link>
        </div>
      </Container>
    );
  }

  if (!player) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Loader label="Loading player…" />
        </div>
      </Container>
    );
  }

  const age = calculateAge(player.dateOfBirth);
  const isGoalkeeper = player.position === "Goalkeeper";
  const hasStats = isGoalkeeper
    ? player.stats?.appearances || player.cleanSheets
    : player.stats && (player.stats.appearances || player.stats.goals || player.stats.assists);

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 bg-mesh" aria-hidden="true" />
      <Container className="relative">
        <div className="py-8 max-w-4xl mx-auto">
          <Link
            to={team ? ROUTES.team(team.slug) : ROUTES.players}
            className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-6 transition-colors duration-button"
          >
            <ArrowLeft className="h-4 w-4" />
            {team ? team.name : "Players"}
          </Link>

          {/* Hero */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
          >
            <GlassCard glow className="relative mb-6 overflow-hidden">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(at 30% 20%, rgba(0,230,118,0.25) 0px, transparent 55%), radial-gradient(at 80% 60%, rgba(59,130,246,0.2) 0px, transparent 55%)",
                }}
                aria-hidden="true"
              />
              <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8">
                <div className="h-36 w-36 sm:h-44 sm:w-44 shrink-0 overflow-hidden rounded-image border-2 border-white/10 bg-surface shadow-glass">
                  {player.photoUrl && (
                    <img src={player.photoUrl} alt="" className="h-full w-full object-cover object-top" />
                  )}
                </div>
                <div className="text-center sm:text-left">
                  {team && (
                    <Link
                      to={ROUTES.team(team.slug)}
                      className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-caption font-medium text-text-secondary transition-colors duration-button hover:text-text"
                    >
                      {team.logoUrl && <img src={team.logoUrl} alt="" className="h-4 w-4 object-contain" />}
                      {team.name}
                    </Link>
                  )}
                  <h1 className="font-heading text-hero text-text leading-tight">
                    {player.name}
                  </h1>
                  <p className="mt-1 text-body text-text-secondary">
                    {player.position}
                    {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick facts strip */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          >
            {[
              { icon: Flag, label: "Nationality", value: player.nationality || "—" },
              { icon: Cake, label: "Age", value: age ? `${age} years` : "—" },
              { icon: Shirt, label: "Position", value: player.position || "—" },
              {
                icon: Trophy,
                label: "Jersey",
                value: player.jerseyNumber ? `#${player.jerseyNumber}` : "—",
              },
            ].map((fact) => (
              <motion.div key={fact.label} variants={fadeUp} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                <GlassCard className="p-4 text-center">
                  <fact.icon className="mx-auto mb-1.5 h-4 w-4 text-accent" />
                  <p className="font-heading text-small font-semibold text-text">{fact.value}</p>
                  <p className="text-caption text-text-secondary">{fact.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Season stats */}
          {hasStats ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="mb-6"
            >
              <h2 className="font-heading text-section-title text-text mb-3">
                Season stats
              </h2>
              <div className={cn("grid gap-3", isGoalkeeper ? "grid-cols-2" : "grid-cols-3")}>
                {(isGoalkeeper
                  ? [
                      { icon: Target, label: "Appearances", value: player.stats?.appearances ?? 0 },
                      { icon: Shield, label: "Clean sheets", value: player.cleanSheets ?? 0 },
                    ]
                  : [
                      { icon: Target, label: "Appearances", value: player.stats.appearances ?? 0 },
                      { icon: Goal, label: "Goals", value: player.stats.goals ?? 0 },
                      { icon: Trophy, label: "Assists", value: player.stats.assists ?? 0 },
                    ]
                ).map((stat) => (
                  <GlassCard key={stat.label} className="p-5 text-center">
                    <stat.icon className="mx-auto mb-2 h-5 w-5 text-accent" />
                    <p className="font-heading text-page-title text-text">
                      <AnimatedCounter value={stat.value} />
                    </p>
                    <p className="text-small text-text-secondary">{stat.label}</p>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          ) : (
            <GlassCard className="mb-6 p-5 text-center">
              <p className="text-small text-text-secondary">
                Season stats haven't been added for {player.name.split(" ")[0]} yet.
              </p>
            </GlassCard>
          )}

          {/* Bio */}
          {player.bio && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="mb-6"
            >
              <GlassCard className="p-6">
                <h2 className="font-heading text-card-title text-text mb-2">About</h2>
                <p className="text-body text-text-secondary leading-relaxed">{player.bio}</p>
              </GlassCard>
            </motion.div>
          )}

          {/* Teammates */}
          {teammates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
            >
              <h2 className="font-heading text-section-title text-text mb-3">
                More from {team?.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {teammates.map((teammate) => (
                  <PlayerCard key={teammate.id} player={teammate} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </Container>
    </div>
  );
}
