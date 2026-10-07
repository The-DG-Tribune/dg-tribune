import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { ROUTES } from "@/constants/routes";
import type { League } from "@/types/firestore";
import {
  getCollectionDocs,
  softDeleteDocument,
} from "@/services/firebase/firestore";

export default function LeaguesList() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<League | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<League>("leagues", {
        where: [["isDeleted", "==", false]],
      });
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setLeagues(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!leagues) return [];
    return leagues.filter((l) =>
      l.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [leagues, search]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await softDeleteDocument("leagues", deleteTarget.id);
      setLeagues((prev) =>
        prev ? prev.filter((l) => l.id !== deleteTarget.id) : prev
      );
      showToast("League moved to Trash");
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
          <h1 className="font-heading text-page-title text-text">Leagues</h1>
        </div>
        <Button onClick={() => navigate(ROUTES.dashboardLeagueNew)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add League
        </Button>
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search leagues by name…"
        className="mb-4 sm:max-w-xs"
      />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : leagues === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={leagues.length === 0 ? "No leagues yet." : "No leagues match your search."}
          description={
            leagues.length === 0
              ? "Add your first league."
              : "Try a different search term."
          }
          actionLabel={leagues.length === 0 ? "Add League" : undefined}
          onAction={
            leagues.length === 0
              ? () => navigate(ROUTES.dashboardLeagueNew)
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((league) => (
            <div
              key={league.id}
              className="group relative overflow-hidden rounded-card border border-border bg-surface"
            >
              <div className="flex aspect-square w-full items-center justify-center bg-background p-6">
                {league.logoUrl && (
                  <img
                    src={league.logoUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-body font-medium text-text">
                  {league.name}
                </p>
                <p className="truncate text-small text-text-secondary">
                  {league.country || "-"}
                </p>
              </div>

              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-button group-hover:opacity-100 group-focus-within:opacity-100">
                <Link
                  to={ROUTES.dashboardLeagueEdit(league.id)}
                  aria-label={`Edit ${league.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-button bg-background/90 text-text hover:bg-accent hover:text-background transition-colors duration-button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(league)}
                  aria-label={`Delete ${league.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-button bg-background/90 text-text hover:bg-danger hover:text-white transition-colors duration-button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
        description={`"${deleteTarget?.name}" will be moved to Trash. You can restore it later.`}
        confirmLabel="Move to Trash"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
