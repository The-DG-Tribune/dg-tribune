import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Trophy, RotateCcw, ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/cards/Card";
import { QuizCoverArt } from "@/components/quiz/QuizCoverArt";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import {
  getDocumentBySlug,
  incrementField,
} from "@/services/firebase/firestore";
import type { Quiz, QuizQuestion } from "@/types/firestore";

const QUESTION_SECONDS = 20;

const QUESTIONS_PER_ROUND = 10;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type PreparedQuestion = QuizQuestion & {
  shuffledOptions: string[];
  correctShuffledIndex: number;
};

function prepareQuestions(questions: QuizQuestion[]): PreparedQuestion[] {
  return questions.map((q) => {
    const withIndex = q.options.map((opt, i) => ({
      opt,
      isCorrect: i === q.correctOptionIndex,
    }));
    const shuffled = shuffle(withIndex);
    return {
      ...q,
      shuffledOptions: shuffled.map((o) => o.opt),
      correctShuffledIndex: shuffled.findIndex((o) => o.isCorrect),
    };
  });
}

export default function QuizPlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<"start" | "playing" | "over">("start");
  const [deck, setDeck] = useState<PreparedQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCountedPlay = useRef(false);

  async function load() {
    if (!slug) return;
    setError(null);
    setNotFound(false);
    try {
      const found = await getDocumentBySlug<Quiz>("quizzes", slug);
      if (!found || found.status !== "published" || found.isDeleted) {
        setNotFound(true);
        return;
      }
      setQuiz(found);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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

  function startGame() {
    if (!quiz) return;
    const round = shuffle(quiz.questions).slice(0, QUESTIONS_PER_ROUND);
    setDeck(prepareQuestions(round));
    setIndex(0);
    setCorrectCount(0);
    setScore(0);
    setSelected(null);
    setTimeLeft(QUESTION_SECONDS);
    setPhase("playing");

    if (!hasCountedPlay.current) {
      hasCountedPlay.current = true;
      incrementField("quizzes", quiz.id, "playCount");
    }
  }

  function handleAnswer(optionIndex: number | null) {
    if (selected !== null || !current) return;
    setSelected(optionIndex ?? -1);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = optionIndex === current.correctShuffledIndex;
    if (isCorrect) {
      const speedBonus = timeLeft * 3;
      setScore((s) => s + 100 + speedBonus);
      setCorrectCount((c) => c + 1);
    }

    setTimeout(() => {
      const next = index + 1;
      if (next >= deck.length) {
        setPhase("over");
        return;
      }
      setIndex(next);
      setTimeLeft(QUESTION_SECONDS);
      setSelected(null);
    }, 1100);
  }

  if (error) {
    return (
      <Container>
        <div className="py-16">
          <ErrorState description={error} onRetry={load} />
        </div>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="font-heading text-page-title text-text mb-2">
            Quiz not found
          </h1>
          <p className="text-body text-text-secondary mb-6">
            This quiz may have been moved or unpublished.
          </p>
          <Link to={ROUTES.quizzes} className="text-accent underline">
            Back to Quizzes
          </Link>
        </div>
      </Container>
    );
  }

  if (!quiz) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Loader label="Loading quiz…" />
        </div>
      </Container>
    );
  }

  if (phase === "start") {
    return (
      <Container>
        <div className="max-w-md mx-auto py-12">
          <Link
            to={ROUTES.quizzes}
            className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-6 transition-colors duration-button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Link>
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-full">
              <QuizCoverArt title={quiz.title} iconClassName="h-6 w-6" />
            </div>
            <h1 className="font-heading text-card-title text-text mb-2">
              {quiz.title}
            </h1>
            <p className="text-small text-text-secondary mb-6">
              {quiz.description ||
                `${quiz.questions.length} questions - ${QUESTION_SECONDS} seconds each.`}
            </p>
            {quiz.playCount > 0 && (
              <p className="mb-6 inline-flex items-center gap-1.5 text-small text-warning">
                <Trophy className="h-4 w-4" />
                Played {quiz.playCount.toLocaleString()} times
              </p>
            )}
            <Button className="w-full" onClick={startGame}>
              Start Quiz
            </Button>
          </Card>
        </div>
      </Container>
    );
  }

  if (phase === "over") {
    const total = deck.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <Container>
        <div className="max-w-md mx-auto py-12">
          <Card className="p-8 text-center">
            <p className="text-small text-text-secondary mb-1">Your score</p>
            <p className="font-heading text-hero text-accent mb-4">
              {score.toLocaleString()}
            </p>
            <div className="flex justify-center gap-6 mb-6">
              <div>
                <p className="text-card-title font-heading text-text">
                  {correctCount}/{total}
                </p>
                <p className="text-caption text-text-secondary">Correct</p>
              </div>
              <div>
                <p className="text-card-title font-heading text-text">
                  {pct}%
                </p>
                <p className="text-caption text-text-secondary">Accuracy</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={startGame}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Play Again
              </Button>
              <Link to={ROUTES.quizzes}>
                <Button variant="secondary" className="w-full">
                  More Quizzes
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  const timerPercent = (timeLeft / QUESTION_SECONDS) * 100;

  return (
    <Container>
      <div className="max-w-md mx-auto py-8">
        <div className="mb-4 flex items-center justify-between">
          <Badge>
            {index + 1} / {deck.length}
          </Badge>
          <span className="text-small font-semibold text-text tabular-nums">
            {score.toLocaleString()}
          </span>
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
                  selected === null &&
                    "border-border bg-surface hover:border-accent text-text",
                  selected !== null &&
                    isCorrect &&
                    "border-accent bg-accent/10 text-accent",
                  selected !== null &&
                    isSelected &&
                    !isCorrect &&
                    "border-danger bg-danger/10 text-danger",
                  selected !== null &&
                    !isSelected &&
                    !isCorrect &&
                    "border-border bg-surface text-text-secondary opacity-60"
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
