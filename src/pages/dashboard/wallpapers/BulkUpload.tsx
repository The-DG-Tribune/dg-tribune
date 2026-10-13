import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FolderUp, ImagePlus, Monitor, Smartphone, Square, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/cn";
import { createDocument } from "@/services/firebase/firestore";
import { getThumbnailUrl, uploadImage } from "@/services/cloudinary/upload";
import { slugify } from "@/utils/slugify";
import {
  detectDevice,
  folderCategoryName,
  guessCategory,
  parseFileName,
  prepareFile,
  readImageSize,
  uniqueSlug,
  type DeviceType,
} from "@/utils/wallpaperSmart";
import type { Category, ContentStatus } from "@/types/firestore";

const MAX_FILES = 60;
const CONCURRENCY = 3;

type RowState = "ready" | "uploading" | "done" | "error";

interface Row {
  key: string;
  file: File;
  previewUrl: string;
  title: string;
  /** "" (none), an existing category id, or "new:<Name>" */
  categoryValue: string;
  width: number;
  height: number;
  device: DeviceType;
  state: RowState;
  progress: number;
  error: string;
  warning: string;
  include: boolean;
}

interface BulkUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onFinished: () => void;
  categories: Category[];
  existingSlugs: string[];
  createCategory: (name: string) => Promise<Category>;
}

const DEVICE_LABEL: Record<DeviceType, string> = {
  phone: "Phone",
  desktop: "Desktop",
  square: "Square",
};

function DeviceIcon({ device }: { device: DeviceType }) {
  if (device === "desktop") return <Monitor className="h-3.5 w-3.5" />;
  if (device === "square") return <Square className="h-3.5 w-3.5" />;
  return <Smartphone className="h-3.5 w-3.5" />;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
}

export function BulkUpload({
  isOpen,
  onClose,
  onFinished,
  categories,
  existingSlugs,
  createCategory,
}: BulkUploadProps) {
  const { showToast } = useToast();
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<Row[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<ContentStatus>("published");
  const [isReading, setIsReading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  rowsRef.current = rows;

  // Folder picking needs a non-standard attribute that React's types don't know about.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      rowsRef.current.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    };
  }, []);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const target = prev.find((r) => r.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((r) => r.key !== key);
    });
  }

  function handleClose() {
    if (isUploading) return;
    rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setRows([]);
    onClose();
  }

  async function addFiles(fileList: File[]) {
    const images = fileList.filter(isImageFile);
    if (images.length === 0) {
      showToast("No images found in that selection", "error");
      return;
    }
    const room = MAX_FILES - rowsRef.current.length;
    if (room <= 0) {
      showToast(`Max ${MAX_FILES} wallpapers per batch. Upload these first.`, "error");
      return;
    }
    const accepted = images.slice(0, room);
    if (accepted.length < images.length) {
      showToast(`Added the first ${accepted.length}. Max ${MAX_FILES} per batch.`, "error");
    }

    setIsReading(true);
    const known = new Set(rowsRef.current.map((r) => `${r.file.name}:${r.file.size}`));
    const takenSlugs = new Set(existingSlugs);
    const added: Row[] = [];

    for (const file of accepted) {
      const fingerprint = `${file.name}:${file.size}`;
      if (known.has(fingerprint)) continue;
      known.add(fingerprint);

      const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      const parsed = parseFileName(file.name);
      const size = await readImageSize(file);
      const device = detectDevice(size.width, size.height, parsed.deviceHint);
      const categoryValue = guessCategory(parsed, categories, folderCategoryName(relative));

      let warning = "";
      if (takenSlugs.has(slugify(parsed.title))) {
        warning = "A wallpaper with this title already exists";
      }
      if (size.width === 0) warning = "Couldn't read the image size, check it looks right";

      added.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title: parsed.title,
        categoryValue,
        width: size.width,
        height: size.height,
        device,
        state: "ready",
        progress: 0,
        error: "",
        warning,
        include: true,
      });
    }

    setRows((prev) => [...prev, ...added]);
    setIsReading(false);
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const list: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (list.length > 0) void addFiles(list);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    void addFiles(Array.from(e.dataTransfer.files) as File[]);
  }

  function setCategoryForAll(value: string) {
    setRows((prev) => prev.map((r) => (r.state === "done" ? r : { ...r, categoryValue: value })));
  }

  async function startUpload() {
    const queue = rowsRef.current.filter(
      (r) => r.include && (r.state === "ready" || r.state === "error")
    );
    if (queue.length === 0) {
      showToast("Nothing to upload", "error");
      return;
    }
    setIsUploading(true);

    // Create any brand-new categories once, up front, so parallel uploads can't duplicate them.
    const newCategoryIds = new Map<string, string>();
    const wanted: string[] = Array.from(
      new Set<string>(queue.map((r: Row) => r.categoryValue).filter((v: string) => v.startsWith("new:")))
    );
    for (const value of wanted) {
      try {
        const created = await createCategory(value.slice(4));
        newCategoryIds.set(value, created.id);
      } catch {
        newCategoryIds.set(value, "");
      }
    }

    const usedSlugs = new Set(existingSlugs);
    let uploaded = 0;
    let failed = 0;

    async function uploadOne(row: Row) {
      updateRow(row.key, { state: "uploading", progress: 0, error: "" });
      try {
        const prepared = await prepareFile(row.file);
        const result = await uploadImage(prepared, {
          folder: "dg-tribune/wallpapers",
          onProgress: (percent: number) => updateRow(row.key, { progress: percent }),
        });
        const title = row.title.trim() || "Wallpaper";
        const slug = uniqueSlug(slugify(title) || "wallpaper", usedSlugs);
        const categoryId = row.categoryValue.startsWith("new:")
          ? newCategoryIds.get(row.categoryValue) || null
          : row.categoryValue || null;

        await createDocument("wallpapers", {
          title,
          slug,
          imageUrl: result.url,
          thumbnailUrl: getThumbnailUrl(result.url),
          categoryId,
          status,
          downloadCount: 0,
          likeCount: 0,
          width: result.width || row.width,
          height: result.height || row.height,
          orientation: row.device,
        });
        uploaded += 1;
        updateRow(row.key, { state: "done", progress: 100 });
      } catch (err) {
        failed += 1;
        updateRow(row.key, { state: "error", error: (err as Error).message });
      }
    }

    async function worker() {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        await uploadOne(next);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    setIsUploading(false);
    if (uploaded > 0) onFinished();
    showToast(
      failed === 0
        ? `${uploaded} wallpapers uploaded`
        : `${uploaded} uploaded, ${failed} failed. Press Upload again to retry them.`,
      failed === 0 ? "success" : "error"
    );
  }

  const pending = rows.filter((r) => r.include && (r.state === "ready" || r.state === "error")).length;
  const doneCount = rows.filter((r) => r.state === "done").length;
  const categoryOptions = [
    { label: "No category", value: "" },
    ...categories.map((c) => ({ label: c.name, value: c.id })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Upload Wallpapers" className="max-w-4xl">
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-card border-2 border-dashed p-6 text-center transition-colors",
            isDragging ? "border-accent bg-accent/10" : "border-border bg-surface"
          )}
        >
          <ImagePlus className="mx-auto mb-2 h-8 w-8 text-accent" />
          <p className="text-body text-text">Drop wallpapers here, or choose them</p>
          <p className="mt-1 text-caption text-text-secondary">
            Titles, categories and phone/desktop type are read from the file names and real image
            size. Folder names become categories. Up to {MAX_FILES} per batch.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" onClick={() => filesInputRef.current?.click()} disabled={isUploading}>
              <ImagePlus className="mr-1.5 h-4 w-4" /> Choose images
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => folderInputRef.current?.click()}
              disabled={isUploading}
            >
              <FolderUp className="mr-1.5 h-4 w-4" /> Choose folder
            </Button>
          </div>
          <input ref={filesInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
          <input ref={folderInputRef} type="file" multiple className="hidden" onChange={onPick} />
        </div>

        {isReading && <p className="text-small text-text-secondary">Reading images...</p>}

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Dropdown
                  label="Status for all"
                  value={status}
                  onChange={(v) => setStatus(v as ContentStatus)}
                  options={[
                    { label: "Published", value: "published" },
                    { label: "Draft", value: "draft" },
                  ]}
                />
              </div>
              <div className="w-56">
                <Dropdown
                  label="Set category for all"
                  value=""
                  placeholder="Choose..."
                  onChange={setCategoryForAll}
                  options={categoryOptions}
                />
              </div>
              <p className="ml-auto text-small text-text-secondary">
                {rows.length} selected{doneCount > 0 ? `, ${doneCount} uploaded` : ""}
              </p>
            </div>

            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {rows.map((row) => {
                const rowCategoryOptions = row.categoryValue.startsWith("new:")
                  ? [...categoryOptions, { label: `New: ${row.categoryValue.slice(4)}`, value: row.categoryValue }]
                  : categoryOptions;
                const locked = row.state === "uploading" || row.state === "done";
                return (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-2.5"
                  >
                    <img
                      src={row.previewUrl}
                      alt=""
                      className="h-20 w-14 shrink-0 rounded-button bg-background object-cover"
                    />
                    <div className="min-w-[10rem] flex-1">
                      <Input
                        value={row.title}
                        onChange={(e) => updateRow(row.key, { title: e.target.value })}
                        disabled={locked}
                        aria-label="Title"
                      />
                      <p className="mt-1 truncate text-caption text-text-secondary">
                        {row.file.name}
                        {row.width > 0 ? ` - ${row.width}x${row.height}` : ""}
                      </p>
                      {row.warning && row.state === "ready" && (
                        <p className="mt-0.5 text-caption text-warning">{row.warning}</p>
                      )}
                      {row.error && <p className="mt-0.5 text-caption text-danger">{row.error}</p>}
                    </div>
                    <div className="w-44">
                      <Dropdown
                        value={row.categoryValue}
                        onChange={(v) => updateRow(row.key, { categoryValue: v })}
                        options={rowCategoryOptions}
                      />
                    </div>
                    <div className="flex w-24 flex-col items-start gap-1">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          const order: DeviceType[] = ["phone", "desktop", "square"];
                          updateRow(row.key, { device: order[(order.indexOf(row.device) + 1) % order.length] });
                        }}
                        title="Click to change"
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-caption text-text"
                      >
                        <DeviceIcon device={row.device} />
                        {DEVICE_LABEL[row.device]}
                      </button>
                      {row.state === "uploading" && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full bg-accent transition-all" style={{ width: `${row.progress}%` }} />
                        </div>
                      )}
                      {row.state === "done" && (
                        <span className="inline-flex items-center gap-1 text-caption text-accent">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                        </span>
                      )}
                      {row.state === "error" && (
                        <span className="inline-flex items-center gap-1 text-caption text-danger">
                          <AlertCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={row.state === "uploading"}
                      onClick={() => removeRow(row.key)}
                      aria-label="Remove"
                      className="flex h-8 w-8 items-center justify-center rounded-button text-text-secondary hover:bg-danger hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="button" onClick={startUpload} isLoading={isUploading} disabled={pending === 0 || isReading}>
            {pending > 0 ? `Upload ${pending} wallpaper${pending === 1 ? "" : "s"}` : "Upload"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isUploading}>
            {doneCount > 0 && pending === 0 ? "Close" : "Cancel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
