import { useEffect, useRef, useState } from "react";
import { Heart, Zap, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/cards/Card";
import { Badge } from "@/components/ui/Badge";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "@/pages/tools/implementations/footballTriviaData";
import { cn } from "@/lib/cn";

const QUESTION_SECONDS = 12;
const STARTING_LIVES = 3;
const HIGH_SCORE_KEY = "dgtribune_trivia_high_score";

const DIFFICULTY_POINTS: Record<TriviaQuestion["difficulty"], number> = {
  easy: 100,
  medium: 150,
  hard: 200,
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildDeck(): (TriviaQuestion & { shuffledOptions: string[]; correctShuffledIndex: number })[] {
  return shuffle(TRIVIA_QUESTIONS).map((q: TriviaQuestion) => {
    const optionsWithIndex = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correctIndex }));
    const shuffledOptionsWithIndex = shuffle(optionsWithIndex);
    return {
      ...q,
      shuffledOptions: shuffledOptionsWithIndex.map((o) => o.opt),
      correctShuffledIndex: shuffledOptionsWithIndex.findIndex((o) => o.isCorrect),
    };
  });
}

function getHighScore(): number {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function setHighScore(score: number) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    /* ignore */
  }
}

export default function FootballTriviaRush() {
  const [phase, setPhase] = useState<"start" | "playing" | "over">("start");
  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [highScore, setHS] = useState(getHighScore);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = deck[index % deck.length];

  useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
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

  function startGame() {
    setDeck(buildDeck());
    setIndex(0);
    setLives(STARTING_LIVES);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(QUESTION_SECONDS);
    setSelected(null);
    setPhase("playing");
  }

  function handleAnswer(optionIndex: number | null) {
    if (selected !== null) return;
    setSelected(optionIndex ?? -1);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = optionIndex === current.correctShuffledIndex;

    if (isCorrect) {
      const newStreak = streak + 1;
      const streakMultiplier = Math.min(1 + newStreak * 0.1, 3);
      const speedBonus = timeLeft * 5;
      const points = Math.round(DIFFICULTY_POINTS[current.difficulty] * streakMultiplier + speedBonus);
      setScore((s) => s + points);
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
    } else {
      setStreak(0);
      setLives((l) => l - 1);
    }

    setTimeout(() => {
      const remainingLives = isCorrect ? lives : lives - 1;
      if (remainingLives <= 0) {
        setScore((finalScore) => {
          if (finalScore > highScore) {
            setHighScore(finalScore);
            setHS(finalScore);
          }
          return finalScore;
        });
        setPhase("over");
        return;
      }
      setIndex((i) => {
        const next = i + 1;
        if (next >= deck.length) {
          setDeck(buildDeck());
          return 0;
        }
        return next;
      });
      setTimeLeft(QUESTION_SECONDS);
      setSelected(null);
    }, 1100);
  }

  function nextRound() {
    setSelected(null);
  }
  void nextRound;

  if (phase === "start") {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Zap className="h-6 w-6" />
          </span>
          <h2 className="font-heading text-card-title text-text mb-2">
            Football Trivia Rush
          </h2>
          <p className="text-small text-text-secondary mb-6">
            {TRIVIA_QUESTIONS.length}+ questions across World Cup history,
            Premier League, Champions League, legends, rules, and
            transfers - shuffled fresh every time. 3 lives, 12 seconds a
            question, streak bonus for consecutive correct answers.
          </p>
          {highScore > 0 && (
            <p className="mb-6 inline-flex items-center gap-1.5 text-small text-warning">
              <Trophy className="h-4 w-4" />
              Best score: {highScore.toLocaleString()}
            </p>
          )}
          <Button className="w-full" onClick={startGame}>
            Start
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-8 text-center">
          <p className="text-small text-text-secondary mb-1">Final score</p>
          <p className="font-heading text-hero text-accent mb-4">
            {score.toLocaleString()}
          </p>
          <div className="flex justify-center gap-6 mb-6">
            <div>
              <p className="text-card-title font-heading text-text">{bestStreak}</p>
              <p className="text-caption text-text-secondary">Best streak</p>
            </div>
            <div>
              <p className="text-card-title font-heading text-text">
                {highScore.toLocaleString()}
              </p>
              <p className="text-caption text-text-secondary">High score</p>
            </div>
          </div>
          <Button className="w-full" onClick={startGame}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Play Again
          </Button>
        </Card>
      </div>
    );
  }

  const timerPercent = (timeLeft / QUESTION_SECONDS) * 100;

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: STARTING_LIVES }).map((_, i) => (
            <Heart
              key={i}
              className={cn("h-4 w-4", i < lives ? "fill-danger text-danger" : "text-border")}
            />
          ))}
        </div>
        <span className="text-small font-semibold text-text tabular-nums">
          {score.toLocaleString()}
        </span>
        {streak >= 2 && (
          <Badge variant="warning">{streak} streak</Badge>
        )}
      </div>

      <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden mb-4">
        <div
          className={cn(
            "h-full transition-all duration-1000 ease-linear",
            timerPercent > 40 ? "bg-accent" : "bg-danger"
          )}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      <Card className="p-6 mb-4">
        <Badge className="mb-3">{current.category}</Badge>
        <p className="font-heading text-card-title text-text">
          {current.question}
        </p>
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
    </div>
  );
}
