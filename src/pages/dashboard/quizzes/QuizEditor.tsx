import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dropdown } from "@/components/ui/Dropdown";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { QuizCoverArt } from "@/components/quiz/QuizCoverArt";
import { useToast } from "@/context/ToastContext";
import { ROUTES } from "@/constants/routes";
import type { ContentStatus, Quiz, QuizQuestion } from "@/types/firestore";
import {
  createDocument,
  getDocumentById,
  updateDocumentById,
} from "@/services/firebase/firestore";
import { slugify } from "@/utils/slugify";

const STATUS_OPTIONS: { label: string; value: ContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

function emptyQuestion(): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    question: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
  };
}

export default function QuizEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);
  const [playCount, setPlayCount] = useState(0);

  useEffect(() => {
    if (!isEditMode || !id) return;
    (async () => {
      try {
        const quiz = await getDocumentById<Quiz>("quizzes", id);
        if (!quiz) {
          setLoadError("This quiz couldn't be found.");
          return;
        }
        setTitle(quiz.title);
        setDescription(quiz.description);
        setCoverImageUrl(quiz.coverImageUrl || null);
        setStatus(quiz.status);
        setQuestions(
          quiz.questions?.length ? quiz.questions : [emptyQuestion()]
        );
        setPlayCount(quiz.playCount ?? 0);
      } catch (err) {
        setLoadError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isEditMode]);

  function updateQuestion(index: number, patch: Partial<QuizQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) => (j === oIndex ? value : o)),
            }
          : q
      )
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const invalid = questions.some(
      (q) => !q.question.trim() || q.options.some((o) => !o.trim())
    );
    if (invalid) {
      showToast("Every question needs text and all 4 options filled in", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slugify(title) || `quiz-${Date.now()}`,
        description: description.trim(),
        coverImageUrl: coverImageUrl || "",
        status,
        questions,
        playCount,
      };

      if (isEditMode && id) {
        await updateDocumentById("quizzes", id, payload);
        showToast("Quiz updated");
      } else {
        await createDocument("quizzes", payload);
        showToast("Quiz created");
      }
      navigate(ROUTES.dashboardQuizzes);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader label="Loading quiz…" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState description={loadError} />;
  }

  return (
    <div className="max-w-3xl">
      <Link
        to={ROUTES.dashboardQuizzes}
        className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-4 transition-colors duration-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Quizzes
      </Link>

      <Badge variant="accent" className="mb-3">
        Phase 6 · Quizzes
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-6">
        {isEditMode ? "Edit Quiz" : "New Quiz"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <ImageUploader
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            label="Cover image (optional - a cover is generated automatically from the title if left empty)"
          />
          {!coverImageUrl && (
            <div className="mt-3 h-32 w-full max-w-xs overflow-hidden rounded-input border border-border">
              <QuizCoverArt title={title || "Untitled Quiz"} iconClassName="h-8 w-8" />
            </div>
          )}
        </div>

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Can You Name These Ballon d'Or Winners?"
          required
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short teaser shown before the quiz starts"
          rows={2}
          required
        />

        <Dropdown
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as ContentStatus)}
          options={STATUS_OPTIONS}
        />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-card-title text-text">
              Questions
            </h2>
            <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-1" />
              Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-small font-medium text-text-secondary">
                    <GripVertical className="h-4 w-4" />
                    Question {qIndex + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      aria-label="Remove question"
                      className="text-text-secondary hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Input
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(qIndex, { question: e.target.value })
                  }
                  placeholder="Question text"
                  className="mb-3"
                  required
                />

                <div className="space-y-2">
                  {q.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctOptionIndex === oIndex}
                        onChange={() =>
                          updateQuestion(qIndex, { correctOptionIndex: oIndex })
                        }
                        className="h-4 w-4 accent-accent shrink-0"
                        aria-label={`Mark option ${oIndex + 1} as correct`}
                      />
                      <Input
                        value={option}
                        onChange={(e) =>
                          updateOption(qIndex, oIndex, e.target.value)
                        }
                        placeholder={`Option ${oIndex + 1}`}
                        className="flex-1"
                        required
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-caption text-text-secondary">
                  Select the radio button next to the correct answer.
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSaving}>
            {isEditMode ? "Save Changes" : "Create Quiz"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(ROUTES.dashboardQuizzes)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
