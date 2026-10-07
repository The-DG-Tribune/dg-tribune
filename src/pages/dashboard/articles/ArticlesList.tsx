import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { ROUTES } from "@/constants/routes";
import type { Article, ContentStatus } from "@/types/firestore";
import {
  getCollectionDocs,
  softDeleteDocument,
} from "@/services/firebase/firestore";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

const statusVariant: Record<ContentStatus, "accent" | "warning" | "default"> = {
  published: "accent",
  draft: "warning",
  archived: "default",
};

export default function ArticlesList() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Article>("articles", {
        where: [["isDeleted", "==", false]],
      });
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setArticles(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!articles) return [];
    return articles.filter((a) => {
      const matchesStatus =
        statusFilter === "all" || a.status === statusFilter;
      const matchesSearch = a.title
        ?.toLowerCase()
        .includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [articles, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await softDeleteDocument("articles", deleteTarget.id);
      setArticles((prev) =>
        prev ? prev.filter((a) => a.id !== deleteTarget.id) : prev
      );
      showToast("Article moved to Trash");
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
          <h1 className="font-heading text-page-title text-text">Articles</h1>
        </div>
        <Button onClick={() => navigate(ROUTES.dashboardArticleNew)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Article
        </Button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onClear={() => setSearch("")}
          placeholder="Search articles by title…"
          className="sm:max-w-xs"
        />
        <Dropdown
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          className="sm:max-w-48"
        />
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : articles === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            articles.length === 0
              ? "No articles yet."
              : "No articles match your search."
          }
          description={
            articles.length === 0
              ? "Write your first story to get DG Tribune started."
              : "Try a different search term or status filter."
          }
          actionLabel={articles.length === 0 ? "Write Article" : undefined}
          onAction={
            articles.length === 0
              ? () => navigate(ROUTES.dashboardArticleNew)
              : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((article) => (
              <div
                key={article.id}
                className="flex items-center gap-4 rounded-card border border-border bg-surface p-4"
              >
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-button bg-background">
                  {article.coverImageUrl && (
                    <img
                      src={article.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusVariant[article.status]}>
                      {article.status}
                    </Badge>
                    {article.isFeatured && (
                      <Star className="h-3.5 w-3.5 text-warning" fill="currentColor" />
                    )}
                  </div>
                  <p className="truncate text-body font-medium text-text">
                    {article.title}
                  </p>
                  <p className="truncate text-small text-text-secondary">
                    {article.excerpt}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to={ROUTES.dashboardArticleEdit(article.id)}
                    aria-label={`Edit ${article.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-button border border-border text-text-secondary hover:border-accent hover:text-text transition-colors duration-button"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(article)}
                    aria-label={`Delete ${article.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-button border border-border text-text-secondary hover:border-danger hover:text-danger transition-colors duration-button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Move to Trash?"
        description={`"${deleteTarget?.title}" will be moved to Trash. You can restore it from there later.`}
        confirmLabel="Move to Trash"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
