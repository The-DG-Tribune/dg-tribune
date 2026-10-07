import { useEffect, useState } from "react";
import { Trash2, ImageIcon, Copy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import type { MediaAsset } from "@/types/firestore";
import {
  getCollectionDocs,
  permanentlyDeleteDocument,
} from "@/services/firebase/firestore";
import { getThumbnailUrl } from "@/services/cloudinary/upload";

export default function MediaLibrary() {
  const { showToast } = useToast();

  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<MediaAsset>("media", {});
      data.sort((a, b) => b.uploadedAt - a.uploadedAt);
      setAssets(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await permanentlyDeleteDocument("media", deleteTarget.id);
      setAssets((prev) =>
        prev ? prev.filter((a) => a.id !== deleteTarget.id) : prev
      );
      showToast("Removed from library");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    showToast("Image URL copied");
  }

  return (
    <div>
      <div className="mb-6">
        <Badge variant="accent" className="mb-3">
          Phase 6 · CMS Modules
        </Badge>
        <h1 className="font-heading text-page-title text-text">Photos</h1>
        <p className="text-small text-text-secondary mt-1">
          Every image uploaded anywhere in the CMS shows up here
          automatically. Removing one only removes it from this library -
          it won't affect articles, players, or anything already using it.
        </p>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : assets === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-6 w-6" strokeWidth={1.5} />}
          title="No photos uploaded yet."
          description="Upload a cover image, player photo, or wallpaper anywhere in the CMS and it will appear here."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative aspect-square overflow-hidden rounded-card border border-border bg-surface"
            >
              <img
                src={getThumbnailUrl(asset.url, 300)}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-start justify-end gap-1.5 bg-background/0 p-2 opacity-0 transition-all duration-button group-hover:bg-background/40 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => copyUrl(asset.url)}
                  aria-label="Copy image URL"
                  className="flex h-8 w-8 items-center justify-center rounded-button bg-background/90 text-text hover:bg-accent hover:text-background transition-colors duration-button"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(asset)}
                  aria-label="Remove from library"
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
        title="Remove from library?"
        description="This only removes the entry from Photos - it will not affect anything already using this image."
        confirmLabel="Remove"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}
