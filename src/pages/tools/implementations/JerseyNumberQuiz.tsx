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
  options: number[];
  correct: number;
}

function buildRound(players: Player[]): Round {
  const eligible = players.filter((p) => p.jerseyNumber);
  const player = eligible[Math.floor(Math.random() * eligible.length)];
  const correct = player.jerseyNumber!;

  const wrongOptions = new Set<number>();
  while (wrongOptions.size < 3) {
    const candidate = Math.floor(Math.random() * 30) + 1;
    if (candidate !== correct) wrongOptions.add(candidate);
  }

  return {
    player,
    options: shuffle([correct, ...wrongOptions]),
    correct,
  };
}

export default function JerseyNumberQuiz() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
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
      const eligible = data.filter((p) => p.jerseyNumber);
      if (eligible.length >= 4) setRound(buildRound(data));
    })();
  }, []);

  function handleAnswer(option: number) {
    if (selected !== null) return;
    setSelected(option);
    setScore((prev) => ({
      correct: prev.correct + (option === round!.correct ? 1 : 0),
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

  const eligibleCount = players.filter((p) => p.jerseyNumber).length;
  if (eligibleCount < 4) {
    return (
      <EmptyState
        title="Not enough players yet."
        description="This quiz needs at least 4 published players with jersey numbers set."
      />
    );
  }

  if (!round) return null;

  return (
    <div className="max-w-md mx-auto">
      <p className="text-small text-text-secondary mb-4">
        Score: {score.correct}/{score.total}
      </p>

      <Card className="p-6 mb-4 text-center">
        <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-background">
          {round.player.photoUrl && (
            <img
              src={round.player.photoUrl}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          )}
        </div>
        <p className="font-heading text-card-title text-text mb-1">
          {round.player.name}
        </p>
        <p className="text-small text-text-secondary">
          What's their jersey number?
        </p>
      </Card>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {round.options.map((option) => {
          const isCorrect = option === round.correct;
          const isSelected = option === selected;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleAnswer(option)}
              disabled={selected !== null}
              className={cn(
                "flex h-16 items-center justify-center rounded-card border text-card-title font-heading transition-colors duration-button",
                selected === null && "border-border bg-surface hover:border-accent text-text",
                selected !== null && isCorrect && "border-accent bg-accent/10 text-accent",
                selected !== null && isSelected && !isCorrect && "border-danger bg-danger/10 text-danger",
                selected !== null && !isSelected && !isCorrect && "border-border bg-surface text-text-secondary opacity-60"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-small text-text">
            {selected === round.correct ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-accent" /> Correct!
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-danger" /> It was #{round.correct}
              </>
            )}
          </p>
          <Button size="sm" onClick={nextRound}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
