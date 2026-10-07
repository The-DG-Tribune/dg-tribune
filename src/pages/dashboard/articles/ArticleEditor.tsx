import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dropdown } from "@/components/ui/Dropdown";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { useToast } from "@/context/ToastContext";
import { useCategories } from "@/hooks/useCategories";
import { slugify } from "@/utils/slugify";
import { ROUTES } from "@/constants/routes";
import type { Article, ContentStatus } from "@/types/firestore";
import {
  createDocument,
  getDocumentById,
  updateDocumentById,
} from "@/services/firebase/firestore";
import { useAuth } from "@/context/AuthContext";

const STATUS_OPTIONS: { label: string; value: ContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { categories, createCategory } = useCategories();

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (!isEditMode || !id) return;
    (async () => {
      try {
        const article = await getDocumentById<Article>("articles", id);
        if (!article) {
          setLoadError("This article couldn't be found.");
          return;
        }
        setTitle(article.title);
        setSlug(article.slug);
        setSlugManuallyEdited(true);
        setExcerpt(article.excerpt);
        setBody(article.body);
        setCoverImageUrl(article.coverImageUrl || null);
        setCategoryId(article.categoryId || "");
        setTagsInput((article.tags || []).join(", "));
        setStatus(article.status);
        setIsFeatured(article.isFeatured);
      } catch (err) {
        setLoadError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isEditMode]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) setSlug(slugify(value));
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
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        excerpt: excerpt.trim(),
        body,
        coverImageUrl: coverImageUrl || "",
        categoryId: categoryId || null,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status,
        isFeatured,
        authorName: user?.email?.split("@")[0] ?? "Admin",
        viewCount: 0,
      };

      if (isEditMode && id) {
        await updateDocumentById("articles", id, payload);
        showToast("Article updated");
      } else {
        await createDocument("articles", payload);
        showToast("Article Published");
      }
      navigate(ROUTES.dashboardArticles);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader label="Loading article…" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState description={loadError} />;
  }

  return (
    <div className="max-w-3xl">
      <Link
        to={ROUTES.dashboardArticles}
        className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-4 transition-colors duration-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Articles
      </Link>

      <Badge variant="accent" className="mb-3">
        Phase 6 · Write Article
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-6">
        {isEditMode ? "Edit Article" : "New Article"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ImageUploader value={coverImageUrl} onChange={setCoverImageUrl} />

        <Input
          label="Title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. Messi Signs New Deal"
          required
        />

        <Input
          label="URL slug"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugManuallyEdited(true);
          }}
          hint={`dgtribune.com/article/${slug || "your-slug"}`}
          required
        />

        <Textarea
          label="Excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="A short summary shown on article cards"
          rows={2}
          required
        />

        <Textarea
          label="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the full article…"
          rows={12}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  placeholder="e.g. Transfer News"
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
                  categories.length === 0
                    ? "No categories yet - add one"
                    : "Choose a category"
                }
                options={categories.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            )}
          </div>

          <Dropdown
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as ContentStatus)}
            options={STATUS_OPTIONS}
          />
        </div>

        <Input
          label="Tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="transfer, premier-league, messi"
          hint="Comma-separated"
        />

        <label className="flex items-center gap-2 text-body text-text">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Feature this article on the homepage
        </label>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSaving}>
            {isEditMode ? "Save Changes" : "Publish Article"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(ROUTES.dashboardArticles)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
