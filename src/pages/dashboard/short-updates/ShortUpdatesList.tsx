import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Link2, Heart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { useToast } from "@/context/ToastContext";
import type { Article, ContentStatus, ShortUpdate } from "@/types/firestore";
import {
  getCollectionDocs,
  createDocument,
  updateDocumentById,
  softDeleteDocument,
} from "@/services/firebase/firestore";
import { slugify } from "@/utils/slugify";

const STATUS_OPTIONS: { label: string; value: ContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

const CHAR_LIMIT = 280;

export default function ShortUpdatesList() {
  const { showToast } = useToast();

  const [updates, setUpdates] = useState<ShortUpdate[] | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<ShortUpdate | null>(null);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkedArticleId, setLinkedArticleId] = useState("");
  const [status, setStatus] = useState<ContentStatus>("published");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ShortUpdate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const [updateData, articleData] = await Promise.all([
        getCollectionDocs<ShortUpdate>("shortUpdates", {
          where: [["isDeleted", "==", false]],
        }),
        getCollectionDocs<Article>("articles", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
      ]);
      updateData.sort((a, b) => b.updatedAt - a.updatedAt);
      setUpdates(updateData);
      setArticles(articleData);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateModal() {
    setEditingUpdate(null);
    setText("");
    setImageUrl(null);
    setLinkedArticleId("");
    setStatus("published");
    setIsModalOpen(true);
  }

  function openEditModal(update: ShortUpdate) {
    setEditingUpdate(update);
    setText(update.text);
    setImageUrl(update.imageUrl);
    setLinkedArticleId(update.linkedArticleId ?? "");
    setStatus(update.status);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        text: text.trim(),
        slug: slugify(text.trim()).slice(0, 60) || `update-${Date.now()}`,
        imageUrl,
        linkedArticleId: linkedArticleId || null,
        status,
        likeCount: editingUpdate?.likeCount ?? 0,
      };

      if (editingUpdate) {
        await updateDocumentById("shortUpdates", editingUpdate.id, payload);
        showToast("Update saved");
      } else {
        await createDocument("shortUpdates", payload);
        showToast("Update Published");
      }
      setIsModalOpen(false);
      load();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await softDeleteDocument("shortUpdates", deleteTarget.id);
      setUpdates((prev) =>
        prev ? prev.filter((u) => u.id !== deleteTarget.id) : prev
      );
      showToast("Update moved to Trash");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const linkedArticleTitle = (id: string | null) =>
    articles.find((a) => a.id === id)?.title;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge variant="accent" className="mb-3">
            Phase 6 · CMS Modules
          </Badge>
          <h1 className="font-heading text-page-title text-text">
            Hot Takes
          </h1>
          <p className="mt-1 text-small text-text-secondary">
            Twitter-style short takes - powers the public Hot Takes feed.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Hot Take
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : updates === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <EmptyState
          title="No hot takes yet."
          description="Post a quick, spicy take without writing a full article."
          actionLabel="New Hot Take"
          onAction={openCreateModal}
        />
      ) : (
        <div className="space-y-3 max-w-2xl">
          {updates.map((update) => (
            <div
              key={update.id}
              className="flex gap-4 rounded-card border border-border bg-surface p-4"
            >
              {update.imageUrl && (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-button bg-background">
                  <img
                    src={update.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant={update.status === "published" ? "accent" : "warning"}>
                    {update.status}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
                    <Heart className="h-3 w-3" />
                    {update.likeCount ?? 0}
                  </span>
                  {update.linkedArticleId && (
                    <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
                      <Link2 className="h-3 w-3" />
                      {linkedArticleTitle(update.linkedArticleId) ?? "Linked article"}
                    </span>
                  )}
                </div>
                <p className="text-body text-text whitespace-pre-wrap">
                  {update.text}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(update)}
                  aria-label="Edit update"
                  className="flex h-9 w-9 items-center justify-center rounded-button border border-border text-text-secondary hover:border-accent hover:text-text transition-colors duration-button"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(update)}
                  aria-label="Delete update"
                  className="flex h-9 w-9 items-center justify-center rounded-button border border-border text-text-secondary hover:border-danger hover:text-danger transition-colors duration-button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUpdate ? "Edit Hot Take" : "New Hot Take"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            label="Text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, CHAR_LIMIT))}
            placeholder="Drop a hot take..."
            rows={4}
            required
            hint={`${text.length}/${CHAR_LIMIT}`}
          />

          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            label="Image (optional)"
            aspectClassName="aspect-[3/2]"
          />

          <Dropdown
            label="Link to article (optional)"
            value={linkedArticleId}
            onChange={setLinkedArticleId}
            placeholder="No linked article"
            options={articles.map((a) => ({ label: a.title, value: a.id }))}
          />

          <Dropdown
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as ContentStatus)}
            options={STATUS_OPTIONS}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isLoading={isSaving}>
              {editingUpdate ? "Save Changes" : "Post Hot Take"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Move to Trash?"
        description="This update will be moved to Trash. You can restore it later."
        confirmLabel="Move to Trash"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
