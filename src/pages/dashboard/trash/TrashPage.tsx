import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import type { BaseDocument } from "@/types/firestore";
import {
  getCollectionDocs,
  updateDocumentById,
  permanentlyDeleteDocument,
} from "@/services/firebase/firestore";

const TRASH_COLLECTIONS: { name: string; label: string }[] = [
  { name: "articles", label: "Article" },
  { name: "shortUpdates", label: "Short Update" },
  { name: "players", label: "Player" },
  { name: "teams", label: "Team" },
  { name: "leagues", label: "League" },
  { name: "wallpapers", label: "Wallpaper" },
  { name: "quizzes", label: "Quiz" },
  { name: "tools", label: "Tool" },
];

interface TrashItem extends BaseDocument {
  collectionName: string;
  typeLabel: string;
  [key: string]: unknown;
}

function getDisplayName(item: TrashItem): string {
  return (
    (item.title as string) ||
    (item.name as string) ||
    (item.text as string) ||
    "Untitled"
  );
}

export default function TrashPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const results = await Promise.all(
        TRASH_COLLECTIONS.map(async ({ name, label }) => {
          const docs = await getCollectionDocs<BaseDocument>(name, {
            where: [["isDeleted", "==", true]],
          });
          return docs.map((doc) => ({
            ...doc,
            collectionName: name,
            typeLabel: label,
          })) as TrashItem[];
        })
      );
      const flattened: TrashItem[] = results.flat();
      flattened.sort((a, b) => (Number(b.deletedAt) || 0) - (Number(a.deletedAt) || 0));
      setItems(flattened);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRestore(item: TrashItem) {
    setRestoringId(item.id);
    try {
      await updateDocumentById(item.collectionName, item.id, {
        isDeleted: false,
        deletedAt: null,
      });
      setItems((prev) =>
        prev ? prev.filter((i) => i.id !== item.id) : prev
      );
      showToast(`${item.typeLabel} restored`);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setRestoringId(null);
    }
  }

  async function handleConfirmPermanentDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await permanentlyDeleteDocument(deleteTarget.collectionName, deleteTarget.id);
      setItems((prev) =>
        prev ? prev.filter((i) => i.id !== deleteTarget.id) : prev
      );
      showToast("Permanently deleted");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Badge variant="accent" className="mb-3">
          Phase 6 · CMS Modules
        </Badge>
        <h1 className="font-heading text-page-title text-text">Trash</h1>
        <p className="text-small text-text-secondary mt-1">
          Deleted items from every module land here. Restore them, or delete
          them permanently - permanent deletion cannot be undone.
        </p>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Trash is empty." description="Nothing has been deleted." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${item.collectionName}-${item.id}`}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge>{item.typeLabel}</Badge>
                </div>
                <p className="truncate text-body text-text">
                  {getDisplayName(item)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRestore(item)}
                disabled={restoringId === item.id}
                aria-label={`Restore ${getDisplayName(item)}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors duration-button disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(item)}
                aria-label={`Permanently delete ${getDisplayName(item)}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border text-text-secondary hover:border-danger hover:text-danger transition-colors duration-button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmPermanentDelete}
        title="Delete permanently?"
        description={`"${deleteTarget ? getDisplayName(deleteTarget) : ""}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Forever"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
