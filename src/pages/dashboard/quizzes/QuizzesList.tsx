import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, HelpCircle, Play } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { QuizCoverArt } from "@/components/quiz/QuizCoverArt";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { ROUTES } from "@/constants/routes";
import type { Quiz } from "@/types/firestore";
import {
  getCollectionDocs,
  softDeleteDocument,
} from "@/services/firebase/firestore";

export default function QuizzesList() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Quiz>("quizzes", {
        where: [["isDeleted", "==", false]],
      });
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setQuizzes(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await softDeleteDocument("quizzes", deleteTarget.id);
      setQuizzes((prev) =>
        prev ? prev.filter((q) => q.id !== deleteTarget.id) : prev
      );
      showToast("Quiz moved to Trash");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge variant="accent" className="mb-3">
            Phase 6 · CMS Modules
          </Badge>
          <h1 className="font-heading text-page-title text-text">Quizzes</h1>
        </div>
        <Button onClick={() => navigate(ROUTES.dashboardQuizNew)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Quiz
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : quizzes === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState
          title="No quizzes yet."
          description="Create your first football quiz to engage fans."
          actionLabel="New Quiz"
          onAction={() => navigate(ROUTES.dashboardQuizNew)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="rounded-card border border-border bg-surface overflow-hidden"
            >
              <div className="aspect-[16/9] w-full bg-background">
                <QuizCoverArt title={quiz.title} iconClassName="h-8 w-8" />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={quiz.status === "published" ? "accent" : "warning"}>
                    {quiz.status}
                  </Badge>
                </div>
                <p className="text-body font-medium text-text mb-1">
                  {quiz.title}
                </p>
                <div className="flex items-center gap-4 text-caption text-text-secondary mb-4">
                  <span className="inline-flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {quiz.questions?.length ?? 0} questions
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Play className="h-3.5 w-3.5" />
                    {quiz.playCount} plays
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={ROUTES.dashboardQuizEdit(quiz.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-button border border-border py-2 text-small text-text hover:border-accent transition-colors duration-button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(quiz)}
                    aria-label={`Delete ${quiz.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-button border border-border text-text-secondary hover:border-danger hover:text-danger transition-colors duration-button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Move to Trash?"
        description={`"${deleteTarget?.title}" will be moved to Trash. You can restore it later.`}
        confirmLabel="Move to Trash"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
