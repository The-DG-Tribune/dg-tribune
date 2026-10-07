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
import type { Player } from "@/types/firestore";
import {
  getCollectionDocs,
  softDeleteDocument,
} from "@/services/firebase/firestore";

export default function PlayersList() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Player>("players", {
        where: [["isDeleted", "==", false]],
      });
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setPlayers(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!players) return [];
    return players.filter((p) =>
      p.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [players, search]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await softDeleteDocument("players", deleteTarget.id);
      setPlayers((prev) =>
        prev ? prev.filter((p) => p.id !== deleteTarget.id) : prev
      );
      showToast("Player moved to Trash");
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
          <h1 className="font-heading text-page-title text-text">Players</h1>
        </div>
        <Button onClick={() => navigate(ROUTES.dashboardPlayerNew)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Player
        </Button>
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search players by name…"
        className="mb-4 sm:max-w-xs"
      />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : players === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            players.length === 0 ? "No players yet." : "No players match your search."
          }
          description={
            players.length === 0
              ? "Add your first player profile."
              : "Try a different search term."
          }
          actionLabel={players.length === 0 ? "Add Player" : undefined}
          onAction={
            players.length === 0
              ? () => navigate(ROUTES.dashboardPlayerNew)
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((player) => (
            <div
              key={player.id}
              className="group relative overflow-hidden rounded-card border border-border bg-surface"
            >
              <div className="aspect-[3/4] w-full bg-background">
                {player.photoUrl && (
                  <img
                    src={player.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-body font-medium text-text">
                  {player.name}
                </p>
                <p className="truncate text-small text-text-secondary">
                  {player.position || "-"}
                  {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                </p>
              </div>

              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-button group-hover:opacity-100 group-focus-within:opacity-100">
                <Link
                  to={ROUTES.dashboardPlayerEdit(player.id)}
                  aria-label={`Edit ${player.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-button bg-background/90 text-text hover:bg-accent hover:text-background transition-colors duration-button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(player)}
                  aria-label={`Delete ${player.name}`}
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
