/** Formats an epoch-ms timestamp as a short, human-readable date. e.g. "Jul 16, 2026" */
export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
