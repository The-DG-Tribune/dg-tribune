/**
 * Downloads an image as a real file (not just opening it in a new
 * tab). Fetches the bytes and triggers a browser download with a
 * clean filename.
 */
export async function downloadImageFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download this image");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** A safe, filesystem-friendly filename derived from a wallpaper title. */
export function wallpaperFilename(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `dg-tribune-${base || "wallpaper"}.jpg`;
}

/**
 * Shares a page URL via the native share sheet where available,
 * falling back to copying the link to the clipboard.
 */
export async function shareUrl(url: string, title: string): Promise<"shared" | "copied" | "cancelled"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    // Clipboard API can throw in non-secure contexts, when the tab
    // isn't focused, or when permission is denied - fall back to a
    // manual prompt rather than silently failing with no feedback.
    window.prompt("Copy this link:", url);
    return "copied";
  }
}
