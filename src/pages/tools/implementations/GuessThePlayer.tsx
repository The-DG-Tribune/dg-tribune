import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/cards/Card";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Player } from "@/types/firestore";
import { cn } from "@/lib/cn";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Round {
  player: Player;
  options: Player[];
}

function buildRound(players: Player[]): Round {
  const eligible = players.filter((p) => p.photoUrl);
  const player = eligible[Math.floor(Math.random() * eligible.length)];
  const others = shuffle(players.filter((p) => p.id !== player.id)).slice(0, 3);
  return { player, options: shuffle([player, ...others]) };
}

/** Guess The Player - shows a photo plus clues (position, nationality); pick the right name. */
export default function GuessThePlayer() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const data = await getCollectionDocs<Player>("players", {
        where: [
          ["isDeleted", "==", false],
          ["status", "==", "published"],
        ],
      });
      setPlayers(data);
      if (data.filter((p) => p.photoUrl).length >= 4 && data.length >= 4) {
        setRound(buildRound(data));
      }
    })();
  }, []);

  function handleAnswer(playerId: string) {
    if (selected !== null) return;
    setSelected(playerId);
    setScore((prev) => ({
      correct: prev.correct + (playerId === round!.player.id ? 1 : 0),
      total: prev.total + 1,
    }));
  }

  function nextRound() {
    setSelected(null);
    setRound(buildRound(players!));
  }

  if (players === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader label="Loading players…" />
      </div>
    );
  }

  if (players.filter((p) => p.photoUrl).length < 4 || players.length < 4) {
    return (
      <EmptyState
        title="Not enough players yet."
        description="This quiz needs at least 4 published players with photos uploaded."
      />
    );
  }

  if (!round) return null;

  return (
    <div className="max-w-md mx-auto">
      <p className="text-small text-text-secondary mb-4">
        Score: {score.correct}/{score.total}
      </p>

      <Card className="mb-4 overflow-hidden">
        <div className="aspect-square w-full bg-background">
          <img
            src={round.player.photoUrl}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div className="flex items-center justify-center gap-3 p-3 text-caption text-text-secondary">
          <span>{round.player.position}</span>
          <span>·</span>
          <span>{round.player.nationality || "Unknown"}</span>
        </div>
      </Card>

      <div className="space-y-2">
        {round.options.map((option) => {
          const isCorrect = option.id === round.player.id;
          const isSelected = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleAnswer(option.id)}
              disabled={selected !== null}
              className={cn(
                "flex w-full items-center justify-between rounded-button border px-4 py-3 text-body transition-colors duration-button",
                selected === null && "border-border bg-surface hover:border-accent text-text",
                selected !== null && isCorrect && "border-accent bg-accent/10 text-accent",
                selected !== null && isSelected && !isCorrect && "border-danger bg-danger/10 text-danger",
                selected !== null && !isSelected && !isCorrect && "border-border bg-surface text-text-secondary opacity-60"
              )}
            >
              {option.name}
              {selected !== null && isCorrect && <CheckCircle2 className="h-4 w-4" />}
              {selected !== null && isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={nextRound}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
