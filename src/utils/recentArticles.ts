const KEY = "dg-recent-articles";
const MAX_ITEMS = 6;

export interface RecentArticle {
  slug: string;
  title: string;
  coverImageUrl: string;
  viewedAt: number;
}

export function getRecentArticles(): RecentArticle[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentArticle =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentArticle).slug === "string" &&
        typeof (item as RecentArticle).title === "string"
    );
  } catch {
    return [];
  }
}

export function recordRecentArticle(article: { slug: string; title: string; coverImageUrl?: string }): void {
  try {
    const rest = getRecentArticles().filter((a) => a.slug !== article.slug);
    const next: RecentArticle[] = [
      { slug: article.slug, title: article.title, coverImageUrl: article.coverImageUrl ?? "", viewedAt: Date.now() },
      ...rest,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private mode). Reading history is a nice-to-have, so ignore.
  }
}

export function clearRecentArticles(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
