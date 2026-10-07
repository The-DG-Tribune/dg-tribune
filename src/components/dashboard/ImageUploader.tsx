import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { uploadImage } from "@/services/cloudinary/upload";
import { createDocument } from "@/services/firebase/firestore";
import { cn } from "@/lib/cn";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  aspectClassName?: string;
}

/**
 * ImageUploader - the single reusable upload component every CMS
 * module uses (articles, players, teams, wallpapers, etc.). Always
 * goes through services/cloudinary/upload.ts - never a bespoke
 * upload implementation per module.
 */
export function ImageUploader({
  value,
  onChange,
  folder = "dg-tribune",
  label = "Cover image",
  aspectClassName = "aspect-[16/9]",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setIsUploading(true);
    setProgress(0);
    try {
      const result = await uploadImage(file, {
        folder,
        onProgress: setProgress,
      });
      onChange(result.url);

      // Log to the Photos library - non-blocking, never fails the upload itself.
      createDocument("media", {
        url: result.url,
        cloudinaryPublicId: result.publicId,
        width: result.width,
        height: result.height,
        uploadedAt: Date.now(),
        usedIn: [],
      }).catch(() => {
        /* Library indexing is best-effort; the upload itself already succeeded. */
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {label && (
        <label className="mb-2 block text-small font-medium text-text">
          {label}
        </label>
      )}

      {value ? (
        <div className={cn("relative w-full overflow-hidden rounded-card border border-border", aspectClassName)}>
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove image"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-text hover:bg-danger hover:text-white transition-colors duration-button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed bg-surface transition-colors duration-button",
            aspectClassName,
            isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-small text-text-secondary">{progress}%</p>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-text-secondary" />
              <p className="text-small text-text-secondary">
                Click or drag an image here
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {error && <p className="mt-2 text-caption text-danger">{error}</p>}
    </div>
  );
}
