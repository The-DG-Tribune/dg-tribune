/**
 * Reads everything dropped onto the page, including whole folders
 * (and folders inside folders). Each file is remembered with the path
 * it came from, so the folder name can become the category.
 */
export const relativePaths = new WeakMap<File, string>();

interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
  file?: (ok: (f: File) => void, fail: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (e: FsEntry[]) => void, fail: (e: unknown) => void) => void };
}

function readAllEntries(entry: FsEntry): Promise<FsEntry[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader?.();
    if (!reader) return resolve([]);
    const all: FsEntry[] = [];
    const next = () =>
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) return resolve(all);
          all.push(...batch);
          next();
        },
        () => resolve(all)
      );
    next();
  });
}

async function walk(entry: FsEntry, out: File[]): Promise<void> {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File | null>((resolve) => entry.file!(resolve, () => resolve(null)));
    if (file) {
      relativePaths.set(file, (entry.fullPath ?? file.name).replace(/^\//, ""));
      out.push(file);
    }
    return;
  }
  if (entry.isDirectory) {
    const children = await readAllEntries(entry);
    for (const child of children) await walk(child, out);
  }
}

export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const items = Array.from(dt.items ?? []);
  const entries: FsEntry[] = [];
  for (const item of items) {
    const getEntry = (item as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry;
    const entry = getEntry ? getEntry.call(item) : null;
    if (entry) entries.push(entry);
  }
  if (entries.length === 0) return Array.from(dt.files);
  for (const entry of entries) await walk(entry, out);
  return out;
}
