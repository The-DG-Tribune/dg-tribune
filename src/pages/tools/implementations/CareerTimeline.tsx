import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cake, Shirt, Trophy, Flag, Target, Hash } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCollectionDocs, getDocumentById } from "@/services/firebase/firestore";
import type { Player, Team } from "@/types/firestore";
import { formatDate } from "@/utils/formatDate";

interface TimelineEvent {
  icon: typeof Cake;
  label: string;
  detail: string;
}

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

const fadeIn = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
};

/**
 * Career Timeline - a snapshot built from a player's real profile
 * data (birth date, current club, season stats). Full club transfer
 * history isn't tracked in the data model yet, so this shows what's
 * genuinely known rather than inventing a history.
 */
export default function CareerTimeline() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getCollectionDocs<Player>("players", {
        where: [
          ["isDeleted", "==", false],
          ["status", "==", "published"],
        ],
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setPlayers(data);
    })();
  }, []);

  async function handleSelect(id: string) {
    setPlayerId(id);
    const found = players!.find((p) => p.id === id) ?? null;
    setPlayer(found);
    setTeam(found?.currentTeamId ? await getDocumentById<Team>("teams", found.currentTeamId) : null);
  }

  if (players === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader label="Loading players…" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <EmptyState
        title="No players yet."
        description="Add a published player in the CMS to use this tool."
      />
    );
  }

  const age = player ? calculateAge(player.dateOfBirth) : null;
  const isGoalkeeper = player?.position === "Goalkeeper";
  const hasStats = isGoalkeeper
    ? player?.stats?.appearances || player?.cleanSheets
    : player?.stats && (player.stats.appearances || player.stats.goals || player.stats.assists);

  const events: TimelineEvent[] = [];
  if (player?.dateOfBirth) {
    events.push({
      icon: Cake,
      label: "Born",
      detail: age
        ? `${formatDate(new Date(player.dateOfBirth).getTime())} · ${age} years old`
        : formatDate(new Date(player.dateOfBirth).getTime()),
    });
  }
  if (player?.nationality) {
    events.push({ icon: Flag, label: "Nationality", detail: player.nationality });
  }
  if (player) {
    events.push({
      icon: Shirt,
      label: "Position",
      detail: `${player.position || "Unknown"}${player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}`,
    });
  }
  if (team) {
    events.push({ icon: Trophy, label: "Current club", detail: team.name });
  }
  if (hasStats) {
    events.push({
      icon: Target,
      label: "This season",
      detail: isGoalkeeper
        ? `${player!.stats?.appearances ?? 0} apps · ${player!.cleanSheets ?? 0} clean sheets`
        : `${player!.stats.appearances ?? 0} apps · ${player!.stats.goals ?? 0} goals · ${player!.stats.assists ?? 0} assists`,
    });
  }

  return (
    <div className="max-w-lg mx-auto">
      <Dropdown
        label="Player"
        value={playerId}
        onChange={handleSelect}
        options={players.map((p) => ({ label: p.name, value: p.id }))}
        placeholder="Choose a player"
        className="mb-6"
      />

      {player && (
        <>
          {/* Photo hero */}
          <GlassCard glow className="relative mb-6 overflow-hidden">
            <div
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  "radial-gradient(at 30% 20%, rgba(0,230,118,0.22) 0px, transparent 55%), radial-gradient(at 80% 70%, rgba(59,130,246,0.18) 0px, transparent 55%)",
              }}
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-4 p-5">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-image border-2 border-white/10 bg-surface">
                {player.photoUrl && (
                  <img src={player.photoUrl} alt="" className="h-full w-full object-cover object-top" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-heading text-card-title text-text truncate">{player.name}</p>
                <p className="text-small text-text-secondary">
                  {team?.name ?? "Free agent"}
                  {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Timeline */}
          <motion.div
            key={player.id}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {events.map((event, i) => {
              const Icon = event.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeIn}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent-secondary/25 text-accent">
                      <Icon className="h-4 w-4" />
                    </span>
                    {i < events.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-gradient-to-b from-accent/40 to-white/5" />
                    )}
                  </div>
                  <GlassCard className="mb-4 flex-1 p-4">
                    <p className="text-caption font-semibold uppercase tracking-wide text-accent">
                      {event.label}
                    </p>
                    <p className="mt-0.5 text-body text-text">{event.detail}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>

          {!hasStats && (
            <p className="mt-1 flex items-center gap-1.5 text-caption text-text-secondary">
              <Hash className="h-3 w-3" />
              Season stats haven't been added for {player.name.split(" ")[0]} yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
