import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Download, Heart, Images, Apple, Bot, Sparkles, Tags } from "lucide-react";
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
import { BulkUpload } from "@/pages/dashboard/wallpapers/BulkUpload";
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
import { detectDevice, dgName, highestDgNumber, isGenericTitle, uniqueSlug, type DeviceType, type PlatformType } from "@/utils/wallpaperSmart";
import { ROUTES } from "@/constants/routes";

const DEVICE_OPTIONS: { label: string; value: DeviceType }[] = [
  { label: "Phone", value: "phone" },
  { label: "Tablet", value: "tablet" },
  { label: "Desktop", value: "desktop" },
  { label: "Square", value: "square" },
];

const PLATFORM_OPTIONS: { label: string; value: PlatformType }[] = [
  { label: "Any device", value: "all" },
  { label: "Apple (iPhone / iPad)", value: "apple" },
  { label: "Android", value: "android" },
];

const STATUS_OPTIONS: { label: string; value: ContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

export default function WallpapersList() {
  const { showToast } = useToast();
  const { categories, createCategory } = useCategories();

  const [wallpapers, setWallpapers] = useState<Wallpaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Wallpaper | null>(null);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ContentStatus>("published");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [device, setDevice] = useState<DeviceType>("phone");
  const [platform, setPlatform] = useState<PlatformType>("all");
  const [isNaming, setIsNaming] = useState(false);

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
    setDevice("phone");
    setPlatform("all");
    setIsModalOpen(true);
  }

  function openEditModal(wallpaper: Wallpaper) {
    setEditing(wallpaper);
    setTitle(wallpaper.title);
    setImageUrl(wallpaper.imageUrl);
    setCategoryId(wallpaper.categoryId ?? "");
    setStatus(wallpaper.status);
    setDevice((wallpaper.orientation as DeviceType) ?? "phone");
    setPlatform(wallpaper.platform ?? "all");
    setIsModalOpen(true);
  }

  // For a brand-new upload, guess phone / tablet / desktop from the real picture size.
  useEffect(() => {
    if (!imageUrl || editing) return;
    const img = new Image();
    img.onload = () => setDevice(detectDevice(img.naturalWidth, img.naturalHeight, null));
    img.src = imageUrl;
  }, [imageUrl, editing]);

  async function handleAutoName() {
    if (!wallpapers) return;
    const targets = wallpapers.filter((w) => isGenericTitle(w.title));
    if (targets.length === 0) {
      showToast("Every wallpaper already has a proper name");
      return;
    }
    setIsNaming(true);
    try {
      const used = new Set(wallpapers.map((w) => w.slug));
      let n = highestDgNumber(wallpapers.map((w) => w.slug));
      for (const w of targets) {
        n += 1;
        const catName = categories.find((c) => c.id === w.categoryId)?.name ?? null;
        const title = dgName(`${w.id}`, catName, n);
        const slug = uniqueSlug(slugify(title), used);
        await updateDocumentById("wallpapers", w.id, { title, slug });
      }
      showToast(`${targets.length} wallpapers renamed`);
      load();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsNaming(false);
    }
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
        orientation: device,
        platform,
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
          <h1 className="font-heading text-page-title text-text">Wallpapers</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={ROUTES.dashboardCategories}>
            <Button variant="secondary" type="button">
              <Tags className="h-4 w-4 mr-1.5" />
              Categories
            </Button>
          </Link>
          <Button variant="secondary" onClick={handleAutoName} isLoading={isNaming}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            Name untitled
          </Button>
          <Button variant="secondary" onClick={() => setIsBulkOpen(true)}>
            <Images className="h-4 w-4 mr-1.5" />
            Bulk Upload
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Upload Wallpaper
          </Button>
        </div>
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
              className="group relative min-w-0 overflow-hidden rounded-card border border-border bg-surface"
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
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant={wallpaper.status === "published" ? "accent" : "warning"}>
                    {wallpaper.status}
                  </Badge>
                  {wallpaper.orientation && wallpaper.orientation !== "phone" && (
                    <Badge variant="info">{wallpaper.orientation}</Badge>
                  )}
                  {wallpaper.platform && wallpaper.platform !== "all" && (
                    <span
                      title={wallpaper.platform === "apple" ? "Apple" : "Android"}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-text"
                    >
                      {wallpaper.platform === "apple" ? <Apple className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-caption text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {wallpaper.likeCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {wallpaper.downloadCount}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dropdown
              label="Device"
              value={device}
              onChange={(v) => setDevice(v as DeviceType)}
              options={DEVICE_OPTIONS}
            />
            <Dropdown
              label="Made for"
              value={platform}
              onChange={(v) => setPlatform(v as PlatformType)}
              options={PLATFORM_OPTIONS}
            />
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

      <BulkUpload
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onFinished={load}
        categories={categories}
        existingSlugs={(wallpapers ?? []).map((w) => w.slug)}
        createCategory={createCategory}
      />
    </div>
  );
}
