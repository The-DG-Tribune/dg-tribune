import type { Category } from "@/types/firestore";

export type DeviceType = "phone" | "tablet" | "desktop" | "square";
export type PlatformType = "all" | "apple" | "android";

const NOISE = new Set([
  "wallpaper", "wallpapers", "wall", "paper", "hd", "fhd", "uhd", "qhd", "4k", "8k", "2k",
  "desktop", "mobile", "phone", "pc", "laptop", "iphone", "android", "tablet", "ipad",
  "copy", "img", "image", "photo", "screenshot", "download", "downloaded", "compressed",
  "resized", "scaled", "jpeg", "jpg", "png", "webp", "by", "new", "final", "edit", "edited",
  "gemini", "generated", "chatgpt", "midjourney", "dalle", "firefly", "ai", "whatsapp", "pxl",
  "dsc", "untitled", "unsplash", "pexels", "pixabay", "ios", "pixel", "samsung", "galaxy", "apple",
  "design", "export", "version", "v1", "v2", "v3", "a", "an", "the", "of", "and",
]);

const GENERIC_FOLDERS = new Set([
  "wallpapers", "wallpaper", "images", "image", "photos", "pictures", "downloads",
  "desktop", "phone", "mobile", "uploads", "upload", "new folder", "dg tribune",
]);

/** Words in a filename that point at a category, when a category with that key exists. */
const SYNONYMS: { key: string; words: string[] }[] = [
  { key: "matchday", words: ["matchday", "match", "game", "fixture", "kickoff"] },
  { key: "celebration", words: ["celebration", "celebrate", "celebrates", "celebrating"] },
  { key: "legend", words: ["legend", "legends", "icon", "icons", "retro", "classic", "vintage"] },
  { key: "stadium", words: ["stadium", "arena", "ground", "stands"] },
  { key: "trophy", words: ["trophy", "trophies", "cup", "champion", "champions", "winner", "winners"] },
  { key: "minimal", words: ["minimal", "minimalist", "clean", "simple"] },
  { key: "goal", words: ["goal", "goals", "scorer", "strike"] },
  { key: "fan", words: ["fan", "fans", "ultras", "supporters", "crowd"] },
  { key: "transfer", words: ["transfer", "signing", "unveil", "unveiled"] },
];

export interface ParsedName {
  title: string;
  tokens: string[];
  deviceHint: DeviceType | null;
  platformHint: PlatformType | null;
  /** True when the file name has real words in it (not IMG_0033 or a random code). */
  meaningful: boolean;
}

function lettersOnly(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}

/** Turns "Messi_Barca-1080x1920 (2).jpg" into a clean title plus useful hints. */
export function parseFileName(fileName: string): ParsedName {
  let base = fileName.replace(/\.[a-z0-9]{2,5}$/i, "");
  base = base.replace(/\(\d+\)/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  base = base.replace(/\b\d{3,5}\s*[x\u00d7]\s*\d{3,5}\b/gi, " ");
  base = base.replace(/\b\d{3,4}p\b/gi, " ");
  base = base.replace(/[_\-.+~]+/g, " ");

  const rawTokens = base.split(/\s+/).filter((t) => t.length > 0);
  let deviceHint: DeviceType | null = null;
  let platformHint: PlatformType | null = null;
  const kept: string[] = [];

  for (const token of rawTokens) {
    const lower = token.toLowerCase();
    if (["iphone", "ios", "apple", "ipad"].includes(lower)) platformHint = "apple";
    if (["android", "pixel", "samsung", "galaxy"].includes(lower)) platformHint = "android";
    if (["tablet", "ipad"].includes(lower)) deviceHint = "tablet";
    if (["desktop", "pc", "laptop", "wide", "widescreen", "landscape"].includes(lower)) {
      deviceHint = "desktop";
    }
    if (["mobile", "phone", "iphone", "android", "portrait"].includes(lower)) {
      deviceHint = "phone";
    }
    if (NOISE.has(lower)) continue;
    if (/^\d{6,}$/.test(token)) continue; // timestamps / IDs
    // Random codes like "a8f3k2x9" or "IMG0033" are not words.
    if (/\d/.test(token) && /[a-z]/i.test(token) && token.length >= 5) continue;
    kept.push(token);
  }

  // Drop trailing "1", "02" style counters, but never empty the title.
  while (kept.length > 1 && /^\d{1,3}$/.test(kept[kept.length - 1])) kept.pop();

  const words = kept.map((t) =>
    t === t.toUpperCase() && t.length <= 4 ? t : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  );
  const wordish = kept.filter((t) => /^[a-z]{3,}$/i.test(t));
  const meaningful = wordish.length > 0;
  const title = words.slice(0, 5).join(" ").trim() || "Wallpaper";
  return { title, tokens: kept.map((t) => t.toLowerCase()), deviceHint, platformHint, meaningful };
}

/** Looks at the folder a file came from (folder uploads only) for a category name. */
export function folderCategoryName(relativePath: string | undefined): string | null {
  if (!relativePath) return null;
  const parts = relativePath.split("/").filter((p) => p.length > 0);
  if (parts.length < 2) return null;
  const parent = parts[parts.length - 2].trim();
  if (!parent || GENERIC_FOLDERS.has(parent.toLowerCase())) return null;
  return parent;
}

/**
 * Picks a category value for the dropdown: an existing category id, or
 * "new:<Name>" when the folder name suggests a category that doesn't exist yet,
 * or "" when nothing matches.
 */
export function guessCategory(
  parsed: ParsedName,
  categories: Category[],
  folderName: string | null
): string {
  if (folderName) {
    const wanted = lettersOnly(folderName);
    const exact = categories.find((c) => lettersOnly(c.name) === wanted || singular(lettersOnly(c.name)) === singular(wanted));
    if (exact) return exact.id;
  }

  const haystack = lettersOnly(parsed.tokens.join(""));
  let best: Category | null = null;
  for (const category of categories) {
    const name = lettersOnly(category.name);
    if (name.length < 3) continue;
    const words = category.name.toLowerCase().split(/\s+/).map(lettersOnly).filter((w) => w.length >= 4);
    const direct =
      haystack.includes(name) ||
      haystack.includes(singular(name)) ||
      words.some((w) => parsed.tokens.map((t) => singular(lettersOnly(t))).includes(singular(w)));
    if (direct && (!best || name.length > lettersOnly(best.name).length)) best = category;
  }
  if (best) return best.id;

  for (const group of SYNONYMS) {
    if (!parsed.tokens.some((t) => group.words.includes(t))) continue;
    const category = categories.find((c) => lettersOnly(c.name).includes(group.key));
    if (category) return category.id;
  }

  if (folderName) return `new:${folderName}`;
  return "";
}

/** Phone / desktop / square from the real pixel size. Pixels beat filenames. */
export function detectDevice(width: number, height: number, hint: DeviceType | null): DeviceType {
  if (width > 0 && height > 0) {
    const ratio = width / height;
    // Phones are tall and thin (9:16, 9:19.5). Tablets are chunkier (3:4, 4:3, 5:4).
    if (ratio <= 0.62) return "phone";
    if (ratio <= 0.85) return "tablet";
    if (ratio < 1.18) return "square";
    if (ratio <= 1.45) return "tablet";
    return "desktop";
  }
  return hint ?? "phone";
}

export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

const MAX_BYTES = 9.5 * 1024 * 1024; // Cloudinary free plan limit is 10 MB
const MAX_SIDE = 3840;

/** Shrinks files over the Cloudinary limit to a 4K JPEG. Smaller files pass through untouched. */
export async function prepareFile(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read this image to shrink it"));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't shrink this image");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("Couldn't shrink this image");
    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base || "wallpaper";
  let n = 2;
  while (used.has(slug)) {
    slug = `${base || "wallpaper"}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

/* ---------- DG naming ---------- */

const CODENAMES = [
  "Apex", "Nova", "Vortex", "Ember", "Onyx", "Pulse", "Surge", "Rift", "Volt", "Blaze",
  "Titan", "Phantom", "Zenith", "Echo", "Strike", "Prime", "Orbit", "Flux", "Havoc", "Slate",
  "Comet", "Raven", "Glacier", "Mirage", "Crest", "Vanta", "Kinetic", "Halo", "Rogue", "Aero",
];

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

/** Highest DG number already used, read from slugs like "dg-legends-014". */
export function highestDgNumber(slugs: string[]): number {
  let max = 0;
  for (const slug of slugs) {
    const m = /^dg-.*-(\d{2,4})$/.exec(slug);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

/** "DG Legends 014" when a category is known, otherwise "DG Apex 014". Always unique by number. */
export function dgName(seed: string, categoryName: string | null, number: number): string {
  const label = categoryName
    ? categoryName.replace(/[^a-z0-9 ]/gi, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 2).join(" ")
    : "";
  const word = label || CODENAMES[hashString(seed) % CODENAMES.length];
  return `DG ${word} ${String(number).padStart(3, "0")}`;
}

/** True for titles that tell the visitor nothing, like "Wallpaper" or "IMG 0033". */
export function isGenericTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (!t) return true;
  if (/^wallpaper( \d+)?$/.test(t)) return true;
  if (/^(img|image|photo|screenshot|untitled|download|pxl|dsc)[\s_-]*\d*$/.test(t)) return true;
  return false;
}
