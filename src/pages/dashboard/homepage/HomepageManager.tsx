import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  LayoutTemplate,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/context/ToastContext";
import type { Article, HomepageConfig, HomepageSection } from "@/types/firestore";
import {
  getCollectionDocs,
  getDocumentById,
  setDocumentById,
} from "@/services/firebase/firestore";

const SECTION_TYPE_OPTIONS: { label: string; value: HomepageSection["type"] }[] = [
  { label: "Hero (manually chosen)", value: "hero" },
  { label: "Featured (manually chosen)", value: "featured" },
  { label: "Latest Articles (automatic)", value: "latest" },
  { label: "Trending (automatic)", value: "trending" },
  { label: "Tools Spotlight (automatic)", value: "tools" },
  { label: "Quiz Spotlight (automatic)", value: "quiz-spotlight" },
  { label: "Explore Leagues (automatic)", value: "leagues" },
  { label: "Wallpapers Spotlight (automatic)", value: "wallpapers" },
];

const NEEDS_ITEMS = new Set(["hero", "featured"]);

export default function HomepageManager() {
  const { showToast } = useToast();

  const [sections, setSections] = useState<HomepageSection[] | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [sectionType, setSectionType] = useState<HomepageSection["type"]>("hero");
  const [sectionTitle, setSectionTitle] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  async function load() {
    setError(null);
    try {
      const [homepage, articleData] = await Promise.all([
        getDocumentById<HomepageConfig>("homepage", "homepage"),
        getCollectionDocs<Article>("articles", {
          where: [
            ["isDeleted", "==", false],
            ["status", "==", "published"],
          ],
        }),
      ]);
      setSections(homepage?.sections ?? []);
      setArticles(articleData);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateModal() {
    setEditingIndex(null);
    setSectionType("hero");
    setSectionTitle("");
    setSelectedItemIds([]);
    setIsModalOpen(true);
  }

  function openEditModal(index: number) {
    const section = sections![index];
    setEditingIndex(index);
    setSectionType(section.type);
    setSectionTitle(section.title);
    setSelectedItemIds(section.itemIds);
    setIsModalOpen(true);
  }

  function handleModalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sections) return;

    const section: HomepageSection = {
      id: editingIndex !== null ? sections[editingIndex].id : crypto.randomUUID(),
      type: sectionType,
      title: sectionTitle.trim(),
      itemIds: NEEDS_ITEMS.has(sectionType) ? selectedItemIds : [],
      order: editingIndex !== null ? sections[editingIndex].order : sections.length,
    };

    if (editingIndex !== null) {
      setSections(sections.map((s, i) => (i === editingIndex ? section : s)));
    } else {
      setSections([...sections, section]);
    }
    setIsModalOpen(false);
  }

  function removeSection(index: number) {
    if (!sections) return;
    setSections(sections.filter((_, i) => i !== index));
  }

  function moveSection(index: number, direction: -1 | 1) {
    if (!sections) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setSections(reordered.map((s, i) => ({ ...s, order: i })));
  }

  function toggleItem(id: string) {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSaveLayout() {
    if (!sections) return;
    setIsSaving(true);
    try {
      await setDocumentById("homepage", "homepage", { sections });
      showToast("Homepage layout saved");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (error) return <ErrorState description={error} onRetry={load} />;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge variant="accent" className="mb-3">
            Phase 6 · CMS Modules
          </Badge>
          <h1 className="font-heading text-page-title text-text">
            Homepage Manager
          </h1>
          <p className="text-small text-text-secondary mt-1">
            Arrange the sections that appear on the homepage - built in
            Phase 7. "Automatic" sections pull live content on their own;
            "manually chosen" sections use the articles you pick here.
          </p>
        </div>
      </div>

      {sections === null ? (
        <div className="flex justify-center py-12">
          <Loader label="Loading homepage layout…" />
        </div>
      ) : (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="secondary" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Section
            </Button>
            <Button onClick={handleSaveLayout} isLoading={isSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Layout
            </Button>
          </div>

          {sections.length === 0 ? (
            <EmptyState
              title="No homepage sections yet."
              description="Add a hero, featured stories, or an automatic section to build the homepage layout."
              actionLabel="Add Section"
              onAction={openCreateModal}
            />
          ) : (
            <div className="space-y-2">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="text-text-secondary hover:text-text disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === sections.length - 1}
                      aria-label="Move down"
                      className="text-text-secondary hover:text-text disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-accent/10 text-accent">
                    <LayoutTemplate className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-text">
                      {section.title || "(untitled section)"}
                    </p>
                    <p className="truncate text-small text-text-secondary capitalize">
                      {section.type}
                      {NEEDS_ITEMS.has(section.type) &&
                        ` · ${section.itemIds.length} selected`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(index)}
                    aria-label="Edit section"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border text-text-secondary hover:border-accent hover:text-text transition-colors duration-button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    aria-label="Remove section"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border text-text-secondary hover:border-danger hover:text-danger transition-colors duration-button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? "Edit Section" : "Add Section"}
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <Dropdown
            label="Section type"
            value={sectionType}
            onChange={(v) => setSectionType(v as HomepageSection["type"])}
            options={SECTION_TYPE_OPTIONS}
          />
          <Input
            label="Section title"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="e.g. Top Stories"
            required
          />

          {NEEDS_ITEMS.has(sectionType) && (
            <div>
              <p className="mb-2 text-small font-medium text-text">
                Choose articles
              </p>
              {articles.length === 0 ? (
                <p className="text-small text-text-secondary">
                  No published articles yet - publish one first.
                </p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-input border border-border p-2">
                  {articles.map((article) => (
                    <label
                      key={article.id}
                      className="flex items-center gap-2 rounded-button px-2 py-2 text-small text-text hover:bg-background cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(article.id)}
                        onChange={() => toggleItem(article.id)}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      {article.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">
              {editingIndex !== null ? "Save Section" : "Add Section"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
