import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Eye, MessageCircleQuestion, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/cards/Card";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCollectionDocs } from "@/services/firebase/firestore";
import { getBlurredImageUrl } from "@/services/cloudinary/upload";
import type { Team } from "@/types/firestore";
import { CLUB_CLUES } from "@/pages/tools/implementations/clubClues";
import { cn } from "@/lib/cn";

const TOTAL_ROUNDS = 10;
const BLUR_STAGES = [1400, 600, 200, 0];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Round {
  team: Team;
  options: Team[];
}

function buildRound(teams: Team[], excludeIds: Set<string>): Round {
  const pool = teams.filter((t) => t.logoUrl && !excludeIds.has(t.id));
  const source = pool.length >= 4 ? pool : teams.filter((t) => t.logoUrl);
  const team = source[Math.floor(Math.random() * source.length)];
  const others = shuffle(teams.filter((t) => t.id !== team.id)).slice(0, 3);
  return { team, options: shuffle([team, ...others]) };
}

export default function ClubLogoQuiz() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [mode, setMode] = useState<"logo" | "description">("logo");
  const [round, setRound] = useState<Round | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [usedIds, setUsedIds] = useState<Set<string>>(() => new Set<string>());
  const [selected, setSelected] = useState<string | null>(null);
  const [blurStage, setBlurStage] = useState(0);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getCollectionDocs<Team>("teams", {
        where: [["isDeleted", "==", false], ["status", "==", "published"]],
      });
      setTeams(data);
      if (data.filter((t) => t.logoUrl).length >= 4 && data.length >= 4) {
        setRound(buildRound(data, new Set()));
      }
    })();
  }, []);

  function revealMore() {
    setBlurStage((s) => Math.min(s + 1, BLUR_STAGES.length - 1));
  }

  function handleAnswer(teamId: string) {
    if (selected !== null || !round) return;
    setSelected(teamId);
    const pointsAvailable = mode === "logo" ? BLUR_STAGES.length - blurStage : 1;
    setMaxScore((m) => m + (mode === "logo" ? BLUR_STAGES.length : 1));
    if (teamId === round.team.id) setScore((s) => s + pointsAvailable);
  }

  function nextRound() {
    if (!teams || !round) return;
    const nextUsed = new Set<string>(usedIds).add(round.team.id);
    if (roundNumber >= TOTAL_ROUNDS) {
      setIsOver(true);
      return;
    }
    setUsedIds(nextUsed);
    setRoundNumber((n) => n + 1);
    setSelected(null);
    setBlurStage(0);
    setRound(buildRound(teams, nextUsed));
  }

  function restart() {
    if (!teams) return;
    setScore(0);
    setMaxScore(0);
    setRoundNumber(1);
    setUsedIds(new Set());
    setSelected(null);
    setBlurStage(0);
    setIsOver(false);
    setRound(buildRound(teams, new Set()));
  }

  function switchMode(newMode: "logo" | "description") {
    setMode(newMode);
    restart();
  }

  if (teams === null) return <div className="flex justify-center py-16"><Loader label="Loading teams..." /></div>;

  if (teams.filter((t) => t.logoUrl).length < 4 || teams.length < 4) {
    return <EmptyState title="Not enough teams yet." description="This quiz needs at least 4 published teams with logos uploaded." />;
  }

  const descriptionAvailable = round ? CLUB_CLUES[round.team.name] : undefined;
  const isFullyRevealed = blurStage >= BLUR_STAGES.length - 1;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5 flex gap-2 max-w-sm mx-auto">
        <button type="button" onClick={() => switchMode("logo")} className={cn("flex-1 rounded-button border px-3 py-2 text-small font-medium transition-colors duration-button inline-flex items-center justify-center gap-1.5", mode === "logo" ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary")}>
          <Eye className="h-3.5 w-3.5" /> Logo Mode
        </button>
        <button type="button" onClick={() => switchMode("description")} className={cn("flex-1 rounded-button border px-3 py-2 text-small font-medium transition-colors duration-button inline-flex items-center justify-center gap-1.5", mode === "description" ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary")}>
          <MessageCircleQuestion className="h-3.5 w-3.5" /> Description Mode
        </button>
      </div>

      {mode === "logo" && (
        <p className="text-caption text-text-secondary text-center mb-4 max-w-sm mx-auto">
          Crests start blurred (some have the club name printed right on them) - guess early for more points, or reveal more if you're stuck.
        </p>
      )}

      {isOver ? (
        <Card className="max-w-sm mx-auto p-8 text-center">
          <p className="text-small text-text-secondary mb-1">Final score</p>
          <p className="font-heading text-hero text-accent mb-6">{score}/{maxScore}</p>
          <Button onClick={restart}><RotateCcw className="h-4 w-4 mr-1.5" />Play Again</Button>
        </Card>
      ) : round ? (
        <div className="max-w-sm mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-small text-text-secondary">Round {roundNumber}/{TOTAL_ROUNDS}</p>
            <p className="text-small font-semibold text-text">Score: {score}</p>
          </div>

          {mode === "logo" ? (
            <Card className="mb-3 flex items-center justify-center bg-background p-10 overflow-hidden">
              <img src={getBlurredImageUrl(round.team.logoUrl, BLUR_STAGES[blurStage])} alt="" className="h-24 w-24 object-contain transition-all duration-300" />
            </Card>
          ) : (
            <Card className="mb-3 p-6 text-center">
              {descriptionAvailable ? (
                <>
                  <p className="text-small text-text-secondary mb-2">This club's colors are</p>
                  <p className="text-card-title font-heading text-text mb-3 capitalize">{descriptionAvailable.colors}</p>
                  <p className="text-small text-text-secondary mb-2">and their badge features</p>
                  <p className="text-card-title font-heading text-text">{descriptionAvailable.icon}</p>
                </>
              ) : (
                <p className="text-small text-text-secondary">No description clue available for this club yet - guess from the options below.</p>
              )}
            </Card>
          )}

          {mode === "logo" && selected === null && (
            <button type="button" onClick={revealMore} disabled={isFullyRevealed} className="mb-4 inline-flex items-center gap-1.5 text-caption text-accent hover:opacity-80 disabled:opacity-40 disabled:hover:opacity-40">
              <Sparkle className="h-3.5 w-3.5" />
              {isFullyRevealed ? "Fully revealed" : "Reveal more (costs points)"}
            </button>
          )}

          <div className="space-y-2 mt-1">
            {round.options.map((option) => {
              const isCorrect = option.id === round.team.id;
              const isSelected = option.id === selected;
              return (
                <button key={option.id} type="button" onClick={() => handleAnswer(option.id)} disabled={selected !== null} className={cn("flex w-full items-center justify-between rounded-button border px-4 py-3 text-body transition-colors duration-button", selected === null && "border-border bg-surface hover:border-accent text-text", selected !== null && isCorrect && "border-accent bg-accent/10 text-accent", selected !== null && isSelected && !isCorrect && "border-danger bg-danger/10 text-danger", selected !== null && !isSelected && !isCorrect && "border-border bg-surface text-text-secondary opacity-60")}>
                  {option.name}
                  {selected !== null && isCorrect && <CheckCircle2 className="h-4 w-4" />}
                  {selected !== null && isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={nextRound}>{roundNumber >= TOTAL_ROUNDS ? "See Results" : "Next"}</Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
