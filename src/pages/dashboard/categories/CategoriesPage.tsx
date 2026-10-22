import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import {
  createDocument,
  getCollectionDocs,
  permanentlyDeleteDocument,
  updateDocumentById,
} from "@/services/firebase/firestore";
import { slugify } from "@/utils/slugify";
import type { Article, Category, Wallpaper } from "@/types/firestore";

const COLORS = ["#00E676", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7", "#EC4899", "#14B8A6", "#F97316"];

interface Usage {
  wallpapers: number;
  articles: number;
}

/**
 * Categories are shared: the same list is used by wallpapers and articles.
 * Rename or recolor here and it changes everywhere. Deleting one never
 * deletes the content, it just becomes "No category".
 */
export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [usage, setUsage] = useState<Record<string, Usage>>({});
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const [target, setTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cats, wallpapers, articles] = await Promise.all([
        getCollectionDocs<Category>("categories", {}),
        getCollectionDocs<Wallpaper>("wallpapers", { where: [["isDeleted", "==", false]] }),
        getCollectionDocs<Article>("articles", { where: [["isDeleted", "==", false]] }),
      ]);
      cats.sort((a, b) => a.name.localeCompare(b.name));
      const counts: Record<string, Usage> = {};
      for (const c of cats) counts[c.id] = { wallpapers: 0, articles: 0 };
      for (const w of wallpapers) if (w.categoryId && counts[w.categoryId]) counts[w.categoryId].wallpapers += 1;
      for (const a of articles) if (a.categoryId && counts[a.categoryId]) counts[a.categoryId].articles += 1;
      setCategories(cats);
      setUsage(counts);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setIsOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setColor(category.colorHex || COLORS[0]);
    setIsOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const duplicate = (categories ?? []).some(
      (c) => c.id !== editing?.id && slugify(c.name) === slugify(clean)
    );
    if (duplicate) {
      showToast("A category with that name already exists", "error");
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        await updateDocumentById("categories", editing.id, { name: clean, slug: slugify(clean), colorHex: color });
        showToast("Category updated");
      } else {
        await createDocument("categories", { name: clean, slug: slugify(clean), colorHex: color, status: "published" });
        showToast("Category created");
      }
      setIsOpen(false);
      await load();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    setIsDeleting(true);
    try {
      const [wallpapers, articles] = await Promise.all([
        getCollectionDocs<Wallpaper>("wallpapers", { where: [["categoryId", "==", target.id]] }),
        getCollectionDocs<Article>("articles", { where: [["categoryId", "==", target.id]] }),
      ]);
      for (const w of wallpapers) await updateDocumentById("wallpapers", w.id, { categoryId: null });
      for (const a of articles) await updateDocumentById("articles", a.id, { categoryId: "" });
      await permanentlyDeleteDocument("categories", target.id);
      setCategories((prev) => (prev ? prev.filter((c) => c.id !== target.id) : prev));
      showToast("Category deleted. Its content is now uncategorised.");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsDeleting(false);
      setTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-page-title text-text">Categories</h1>
          <p className="text-small text-text-secondary">Shared by wallpapers and articles. Rename, recolor or delete.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New category
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : categories === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet."
          description="Create one here, or let Bulk Upload create them from your folder names."
          actionLabel="New category"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const u = usage[category.id] ?? { wallpapers: 0, articles: 0 };
            return (
              <div
                key={category.id}
                className="flex min-w-0 items-center gap-3 rounded-card border border-border bg-surface p-4"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${category.colorHex || "#00E676"}22`, color: category.colorHex || "#00E676" }}
                >
                  <Tags className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-text">{category.name}</p>
                  <p className="text-caption text-text-secondary">
                    {u.wallpapers} wallpapers, {u.articles} articles
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(category)}
                  aria-label={`Edit ${category.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-button text-text-secondary hover:bg-accent hover:text-background"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTarget(category)}
                  aria-label={`Delete ${category.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-button text-text-secondary hover:bg-danger hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? "Edit category" : "New category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Matchday" required />
          <div>
            <p className="mb-2 text-small font-medium text-text">Colour</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? "#fff" : "transparent" }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isLoading={isSaving}>
              {editing ? "Save changes" : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!target}
        onClose={() => setTarget(null)}
        onConfirm={handleDelete}
        title="Delete this category?"
        description={`"${target?.name}" will be deleted. Wallpapers and articles in it are kept, they just become uncategorised.`}
        confirmLabel="Delete category"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
