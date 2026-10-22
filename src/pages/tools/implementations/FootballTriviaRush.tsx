import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Trophy,
  RotateCcw,
  Flag,
  Swords,
  Medal,
  Globe2,
  Crown,
  Star,
  Flame,
  CheckCircle2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/cards/Card";
import { Badge } from "@/components/ui/Badge";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "@/pages/tools/implementations/footballTriviaData";
import { cn } from "@/lib/cn";

const QUESTION_SECONDS = 12;
const STARTING_LIVES = 3;
const ROUND_SIZE = 10;
const STORAGE_KEY = "dgtribune_trivia_rounds_v2";

const DIFFICULTY_POINTS: Record<TriviaQuestion["difficulty"], number> = {
  easy: 100,
  medium: 150,
  hard: 200,
};

interface RoundDef {
  id: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  /** Tailwind gradient classes for the round card. */
  gradient: string;
  accent: string;
  heat: 1 | 2 | 3;
  pick: (q: TriviaQuestion) => boolean;
}

const ROUNDS: RoundDef[] = [
  {
    id: "kickoff",
    name: "Kickoff",
    tagline: "Warm up with the ones everyone should know.",
    icon: Flag,
    gradient: "from-emerald-500/25 via-emerald-500/5 to-transparent",
    accent: "text-emerald-300",
    heat: 1,
    pick: (q) => q.difficulty === "easy",
  },
  {
    id: "midfield",
    name: "Midfield Battle",
    tagline: "Proper fan territory. No easy runs.",
    icon: Swords,
    gradient: "from-sky-500/25 via-sky-500/5 to-transparent",
    accent: "text-sky-300",
    heat: 2,
    pick: (q) => q.difficulty === "medium",
  },
  {
    id: "final",
    name: "Final Whistle",
    tagline: "The hard ones. Only real heads survive.",
    icon: Flame,
    gradient: "from-rose-500/25 via-rose-500/5 to-transparent",
    accent: "text-rose-300",
    heat: 3,
    pick: (q) => q.difficulty === "hard",
  },
  {
    id: "worldcup",
    name: "World Cup Night",
    tagline: "Every tournament, every legend, every heartbreak.",
    icon: Globe2,
    gradient: "from-amber-500/25 via-amber-500/5 to-transparent",
    accent: "text-amber-300",
    heat: 2,
    pick: (q) => q.category === "World Cup",
  },
  {
    id: "legends",
    name: "Legends & Deals",
    tagline: "Icons, records and the biggest transfers.",
    icon: Crown,
    gradient: "from-violet-500/25 via-violet-500/5 to-transparent",
    accent: "text-violet-300",
    heat: 2,
    pick: (q) => q.category === "Legends" || q.category === "Transfers",
  },
  {
    id: "europe",
    name: "European Nights",
    tagline: "Premier League and Champions League.",
    icon: Star,
    gradient: "from-fuchsia-500/25 via-fuchsia-500/5 to-transparent",
    accent: "text-fuchsia-300",
    heat: 2,
    pick: (q) =>
      q.category === "Premier League" || q.category === "Champions League" || q.category === "European Football",
  },
  {
    id: "mixed",
    name: "Mixed Rush",
    tagline: "A bit of everything, shuffled fresh.",
    icon: Medal,
    gradient: "from-accent/25 via-accent/5 to-transparent",
    accent: "text-accent",
    heat: 2,
    pick: () => true,
  },
];

type Question = TriviaQuestion & { shuffledOptions: string[]; correctShuffledIndex: number };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function prepare(q: TriviaQuestion): Question {
  const withFlag = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correctIndex }));
  const shuffled = shuffle(withFlag);
  return {
    ...q,
    shuffledOptions: shuffled.map((o) => o.opt),
    correctShuffledIndex: shuffled.findIndex((o) => o.isCorrect),
  };
}

/** 10 fresh random questions for a round. Tops up from the rest if a round's own pool is short. */
function buildDeck(round: RoundDef): Question[] {
  const own = shuffle(TRIVIA_QUESTIONS.filter(round.pick));
  let picked = own.slice(0, ROUND_SIZE);
  if (picked.length < ROUND_SIZE) {
    const taken = new Set(picked);
    const filler = shuffle(TRIVIA_QUESTIONS.filter((q) => !taken.has(q)));
    picked = [...picked, ...filler.slice(0, ROUND_SIZE - picked.length)];
  }
  return shuffle(picked).map(prepare);
}

interface RoundRecord {
  best: number;
  cleared: boolean;
}

function loadRecords(): Record<string, RoundRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, RoundRecord>;
  } catch {
    return {};
  }
}

function saveRecords(records: Record<string, RoundRecord>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

export default function FootballTriviaRush() {
  const [phase, setPhase] = useState<"rounds" | "playing" | "over">("rounds");
  const [roundDef, setRoundDef] = useState<RoundDef>(ROUNDS[0]);
  const [deck, setDeck] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [cleared, setCleared] = useState(false);
  const [records, setRecords] = useState<Record<string, RoundRecord>>(loadRecords);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = deck[index];

  useEffect(() => {
    if (phase !== "playing" || selected !== null || !current) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleAnswer(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, selected]);

  function startRound(def: RoundDef) {
    setRoundDef(def);
    setDeck(buildDeck(def));
    setIndex(0);
    setLives(STARTING_LIVES);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(QUESTION_SECONDS);
    setSelected(null);
    setCleared(false);
    setPhase("playing");
  }

  function finish(finalScore: number, didClear: boolean) {
    setCleared(didClear);
    setRecords((prev) => {
      const old = prev[roundDef.id] ?? { best: 0, cleared: false };
      const next = {
        ...prev,
        [roundDef.id]: { best: Math.max(old.best, finalScore), cleared: old.cleared || didClear },
      };
      saveRecords(next);
      return next;
    });
    setPhase("over");
  }

  function handleAnswer(optionIndex: number | null) {
    if (selected !== null || !current) return;
    setSelected(optionIndex ?? -1);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = optionIndex === current.correctShuffledIndex;
    let newScore = score;

    if (isCorrect) {
      const newStreak = streak + 1;
      const streakMultiplier = Math.min(1 + newStreak * 0.1, 3);
      const speedBonus = timeLeft * 5;
      newScore = score + Math.round(DIFFICULTY_POINTS[current.difficulty] * streakMultiplier + speedBonus);
      setScore(newScore);
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
    } else {
      setStreak(0);
      setLives((l) => l - 1);
    }

    const remainingLives = isCorrect ? lives : lives - 1;
    setTimeout(() => {
      if (remainingLives <= 0) {
        finish(newScore, false);
        return;
      }
      if (index + 1 >= deck.length) {
        finish(newScore, true);
        return;
      }
      setIndex(index + 1);
      setTimeLeft(QUESTION_SECONDS);
      setSelected(null);
    }, 1000);
  }

  /* ---------- Round picker ---------- */
  if (phase === "rounds") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h2 className="font-heading text-section-title text-text">Pick your round</h2>
          <p className="mt-1 text-small text-text-secondary">
            3 lives. 12 seconds a question. Build a streak for bonus points. Every round is reshuffled each time you play.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROUNDS.map((def, i) => {
            const rec = records[def.id];
            const Icon = def.icon;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => startRound(def)}
                className={cn(
                  "group relative overflow-hidden rounded-card border border-white/10 bg-white/[0.04] p-5 text-left transition-all duration-button hover:-translate-y-0.5 hover:border-white/25",
                  i === ROUNDS.length - 1 && "sm:col-span-2"
                )}
              >
                <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", def.gradient)} />
                <div className="relative flex items-start gap-4">
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-background/60",
                      def.accent
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-card-title text-text">{def.name}</p>
                      {rec?.cleared && <CheckCircle2 className="h-4 w-4 text-accent" aria-label="Cleared" />}
                    </div>
                    <p className="mt-0.5 text-small text-text-secondary">{def.tagline}</p>
                    <div className="mt-3 flex items-center gap-3 text-caption">
                      <span className="flex items-center gap-0.5" aria-label={`Heat ${def.heat} of 3`}>
                        {[1, 2, 3].map((n) => (
                          <Flame
                            key={n}
                            className={cn("h-3.5 w-3.5", n <= def.heat ? def.accent : "text-white/15")}
                          />
                        ))}
                      </span>
                      {rec && rec.best > 0 && (
                        <span className="flex items-center gap-1 text-warning">
                          <Trophy className="h-3.5 w-3.5" />
                          Best {rec.best.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-text-secondary transition-transform duration-button group-hover:translate-x-1 group-hover:text-text" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- Round over ---------- */
  if (phase === "over") {
    const nextDef = ROUNDS[(ROUNDS.findIndex((r) => r.id === roundDef.id) + 1) % ROUNDS.length];
    const rec = records[roundDef.id];
    return (
      <div className="mx-auto max-w-md">
        <Card className="relative overflow-hidden p-8 text-center">
          <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b", roundDef.gradient)} />
          <div className="relative">
            <Badge variant={cleared ? "accent" : "warning"} className="mb-3">
              {roundDef.name}
            </Badge>
            <p className="font-heading text-card-title text-text">{cleared ? "Round cleared" : "Out of lives"}</p>
            <p className="mb-1 mt-4 text-small text-text-secondary">Final score</p>
            <p className="mb-4 font-heading text-hero text-accent">{score.toLocaleString()}</p>
            <div className="mb-6 flex justify-center gap-6">
              <div>
                <p className="font-heading text-card-title text-text">{bestStreak}</p>
                <p className="text-caption text-text-secondary">Best streak</p>
              </div>
              <div>
                <p className="font-heading text-card-title text-text">{(rec?.best ?? score).toLocaleString()}</p>
                <p className="text-caption text-text-secondary">Round best</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={() => startRound(roundDef)}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Play again
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => startRound(nextDef)}>
                Next: {nextDef.name}
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => setPhase("rounds")}>
                All rounds
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------- Playing ---------- */
  if (!current) return null;
  const timerPercent = (timeLeft / QUESTION_SECONDS) * 100;
  const progress = ((index + (selected !== null ? 1 : 0)) / deck.length) * 100;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: STARTING_LIVES }).map((_, i) => (
            <Heart key={i} className={cn("h-4 w-4", i < lives ? "fill-danger text-danger" : "text-border")} />
          ))}
        </div>
        <span className="text-small font-semibold tabular-nums text-text">{score.toLocaleString()}</span>
        {streak >= 2 ? <Badge variant="warning">{streak} streak</Badge> : <Badge>{roundDef.name}</Badge>}
      </div>

      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-accent-secondary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full transition-all duration-1000 ease-linear", timerPercent > 40 ? "bg-accent" : "bg-danger")}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      <Card className="mb-4 p-6">
        <Badge className="mb-3">{current.category}</Badge>
        <p className="font-heading text-card-title text-text">{current.question}</p>
      </Card>

      <div className="space-y-2">
        {current.shuffledOptions.map((option, i) => {
          const isCorrect = i === current.correctShuffledIndex;
          const isSelected = i === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleAnswer(i)}
              disabled={selected !== null}
              className={cn(
                "flex w-full items-center rounded-button border px-4 py-3 text-left text-body transition-colors duration-button",
                selected === null && "border-border bg-surface text-text hover:border-accent",
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
    </div>
  );
}
