import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Download, Heart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { useToast } from "@/context/ToastContext";
import { useCategories } from "@/hooks/useCategories";
import { getThumbnailUrl } from "@/services/cloudinary/upload";
import type { ContentStatus, Wallpaper } from "@/types/firestore";
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

export default function WallpapersList() {
  const { showToast } = useToast();
  const { categories, createCategory } = useCategories();

  const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Wallpaper | null>(null);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ContentStatus>("published");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Wallpaper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Wallpaper>("wallpapers", {
        where: [["isDeleted", "==", false]],
      });
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setWallpapers(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateModal() {
    setEditing(null);
    setTitle("");
    setImageUrl(null);
    setCategoryId("");
    setStatus("published");
    setIsModalOpen(true);
  }

  function openEditModal(wallpaper: Wallpaper) {
    setEditing(wallpaper);
    setTitle(wallpaper.title);
    setImageUrl(wallpaper.imageUrl);
    setCategoryId(wallpaper.categoryId ?? "");
    setStatus(wallpaper.status);
    setIsModalOpen(true);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const category = await createCategory(newCategoryName.trim());
    setCategoryId(category.id);
    setNewCategoryName("");
    setIsAddingCategory(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!imageUrl) {
      showToast("Please upload an image first", "error");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slugify(title.trim()) || `wallpaper-${Date.now()}`,
        imageUrl,
        thumbnailUrl: getThumbnailUrl(imageUrl),
        categoryId: categoryId || null,
        status,
        downloadCount: editing?.downloadCount ?? 0,
        likeCount: editing?.likeCount ?? 0,
      };

      if (editing) {
        await updateDocumentById("wallpapers", editing.id, payload);
        showToast("Wallpaper updated");
      } else {
        await createDocument("wallpapers", payload);
        showToast("Wallpaper uploaded");
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
      await softDeleteDocument("wallpapers", deleteTarget.id);
      setWallpapers((prev) =>
        prev ? prev.filter((w) => w.id !== deleteTarget.id) : prev
      );
      showToast("Wallpaper moved to Trash");
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
          <h1 className="font-heading text-page-title text-text">Wallpapers</h1>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Upload Wallpaper
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : wallpapers === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] w-full" />
          ))}
        </div>
      ) : wallpapers.length === 0 ? (
        <EmptyState
          title="No wallpapers yet."
          description="Nothing here yet. Check back after the next kickoff."
          actionLabel="Upload Wallpaper"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {wallpapers.map((wallpaper) => (
            <div
              key={wallpaper.id}
              className="group relative overflow-hidden rounded-card border border-border bg-surface"
            >
              <div className="aspect-[9/16] w-full bg-background">
                <img
                  src={wallpaper.thumbnailUrl || wallpaper.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <p className="truncate text-small font-medium text-text">
                  {wallpaper.title}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <Badge variant={wallpaper.status === "published" ? "accent" : "warning"}>
                    {wallpaper.status}
                  </Badge>
                  <span className="inline-flex items-center gap-2 text-caption text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {wallpaper.likeCount ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {wallpaper.downloadCount}
                    </span>
                  </span>
                </div>
              </div>

              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-button group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => openEditModal(wallpaper)}
                  aria-label={`Edit ${wallpaper.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-button bg-background/90 text-text hover:bg-accent hover:text-background transition-colors duration-button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(wallpaper)}
                  aria-label={`Delete ${wallpaper.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-button bg-background/90 text-text hover:bg-danger hover:text-white transition-colors duration-button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Wallpaper" : "Upload Wallpaper"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            label="Image"
            aspectClassName="aspect-[9/16]"
          />

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Champions League Night"
            required
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-small font-medium text-text">
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory((v) => !v)}
                className="inline-flex items-center gap-1 text-caption text-accent hover:opacity-80"
              >
                <Plus className="h-3 w-3" /> New category
              </button>
            </div>
            {isAddingCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Matchday"
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleAddCategory}>
                  Add
                </Button>
              </div>
            ) : (
              <Dropdown
                value={categoryId}
                onChange={setCategoryId}
                placeholder={
                  categories.length === 0 ? "No categories yet" : "Choose a category"
                }
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
              />
            )}
          </div>

          <Dropdown
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as ContentStatus)}
            options={STATUS_OPTIONS}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isLoading={isSaving}>
              {editing ? "Save Changes" : "Upload"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
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
        description={`"${deleteTarget?.title}" will be moved to Trash. You can restore it later.`}
        confirmLabel="Move to Trash"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
