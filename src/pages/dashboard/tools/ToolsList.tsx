import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { TOOL_ICONS, TOOL_ICON_OPTIONS } from "@/constants/toolIcons";
import type { Tool } from "@/types/firestore";
import {
  getCollectionDocs,
  createDocument,
  updateDocumentById,
  softDeleteDocument,
} from "@/services/firebase/firestore";
import { slugify } from "@/utils/slugify";

export default function ToolsList() {
  const { showToast } = useToast();

  const [tools, setTools] = useState<Tool[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState("Wrench");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Tool>("tools", {
        where: [["isDeleted", "==", false]],
      });
      data.sort((a, b) => a.order - b.order);
      setTools(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateModal() {
    setEditing(null);
    setName("");
    setDescription("");
    setIconName("Wrench");
    setIsModalOpen(true);
  }

  function openEditModal(tool: Tool) {
    setEditing(tool);
    setName(tool.name);
    setDescription(tool.description);
    setIconName(tool.iconName || "Wrench");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slugify(name.trim()),
        description: description.trim(),
        iconName,
        isEnabled: editing?.isEnabled ?? false,
        order: editing?.order ?? (tools?.length ?? 0),
        status: "published" as const,
      };

      if (editing) {
        await updateDocumentById("tools", editing.id, payload);
        showToast("Tool updated");
      } else {
        await createDocument("tools", payload);
        showToast("Tool added");
      }
      setIsModalOpen(false);
      load();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleEnabled(tool: Tool) {
    try {
      await updateDocumentById("tools", tool.id, { isEnabled: !tool.isEnabled });
      setTools((prev) =>
        prev
          ? prev.map((t) =>
              t.id === tool.id ? { ...t, isEnabled: !t.isEnabled } : t
            )
          : prev
      );
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function moveOrder(index: number, direction: -1 | 1) {
    if (!tools) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tools.length) return;

    const reordered = [...tools];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    const withOrders = reordered.map((t, i) => ({ ...t, order: i }));
    setTools(withOrders);

    try {
      await Promise.all([
        updateDocumentById("tools", withOrders[index].id, {
          order: withOrders[index].order,
        }),
        updateDocumentById("tools", withOrders[targetIndex].id, {
          order: withOrders[targetIndex].order,
        }),
      ]);
    } catch (err) {
      showToast((err as Error).message, "error");
      load();
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await softDeleteDocument("tools", deleteTarget.id);
      setTools((prev) =>
        prev ? prev.filter((t) => t.id !== deleteTarget.id) : prev
      );
      showToast("Tool moved to Trash");
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
          <h1 className="font-heading text-page-title text-text">Tools</h1>
          <p className="text-small text-text-secondary mt-1">
            Manage which interactive tools appear on the site. The tools
            themselves are built one at a time in Phase 9 - this registry
            controls their name, icon, order, and visibility.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Tool
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : tools === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <EmptyState
          title="No tools yet."
          description="Add the first tool to the registry."
          actionLabel="Add Tool"
          onAction={openCreateModal}
        />
      ) : (
        <div className="space-y-2 max-w-2xl">
          {tools.map((tool, index) => {
            const Icon = TOOL_ICONS[tool.iconName] ?? Wrench;
            return (
              <div
                key={tool.id}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveOrder(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="text-text-secondary hover:text-text disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOrder(index, 1)}
                    disabled={index === tools.length - 1}
                    aria-label="Move down"
                    className="text-text-secondary hover:text-text disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-text">
                    {tool.name}
                  </p>
                  <p className="truncate text-small text-text-secondary">
                    {tool.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleEnabled(tool)}
                  aria-pressed={tool.isEnabled}
                  aria-label={tool.isEnabled ? "Disable tool" : "Enable tool"}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-button ${
                    tool.isEnabled ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-button ${
                      tool.isEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(tool)}
                  aria-label={`Edit ${tool.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border text-text-secondary hover:border-accent hover:text-text transition-colors duration-button"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(tool)}
                  aria-label={`Delete ${tool.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button border border-border text-text-secondary hover:border-danger hover:text-danger transition-colors duration-button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Tool" : "Add Tool"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dream Team Builder"
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A one-line description shown on the Tools page"
            rows={2}
            required
          />
          <Dropdown
            label="Icon"
            value={iconName}
            onChange={setIconName}
            options={TOOL_ICON_OPTIONS}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isLoading={isSaving}>
              {editing ? "Save Changes" : "Add Tool"}
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
        description={`"${deleteTarget?.name}" will be moved to Trash. You can restore it later.`}
        confirmLabel="Move to Trash"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
