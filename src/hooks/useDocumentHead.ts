import { useEffect } from "react";
import { DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/constants/site";

interface DocumentHeadOptions {
  title: string;
  description?: string;
  image?: string;
  /** Defaults to "website" - use "article" for article pages. */
  type?: "website" | "article";
  keywords?: string[];
  /** Optional schema.org JSON-LD for this page (Article, Person, SportsTeam...). */
  jsonLd?: Record<string, unknown>;
  /** Set true on pages that should stay out of Google (empty search results, etc). */
  noIndex?: boolean;
}

const DEFAULT_DESCRIPTION =
  "DG Tribune is your home for football: daily news, player and team profiles, quizzes, trivia, HD wallpapers, a dream team builder and more.";

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function trim(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * useDocumentHead - sets the page title, meta description, keywords,
 * Open Graph / Twitter tags, canonical URL and optional JSON-LD for
 * the current route.
 */
export function useDocumentHead({
  title,
  description,
  image,
  type = "website",
  keywords,
  jsonLd,
  noIndex,
}: DocumentHeadOptions) {
  const keywordText = keywords?.join(", ") ?? "";
  const jsonText = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const desc = trim(description || DEFAULT_DESCRIPTION, 158);
    const ogImage = image || DEFAULT_OG_IMAGE;
    const url = `${SITE_URL}${window.location.pathname}`;

    document.title = fullTitle;
    setMetaTag("name", "description", desc);
    setMetaTag("name", "keywords", keywordText ? `${keywordText}, ${DEFAULT_KEYWORDS}` : DEFAULT_KEYWORDS);
    setMetaTag("name", "robots", noIndex ? "noindex, follow" : "index, follow, max-image-preview:large");

    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", desc);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:site_name", SITE_NAME);
    setMetaTag("property", "og:url", url);
    setMetaTag("property", "og:image", ogImage);

    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", desc);
    setMetaTag("name", "twitter:image", ogImage);

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    const ldId = "dg-page-jsonld";
    document.getElementById(ldId)?.remove();
    if (jsonText) {
      const el = document.createElement("script");
      el.id = ldId;
      el.type = "application/ld+json";
      el.text = jsonText;
      document.head.appendChild(el);
    }
    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, [title, description, image, type, keywordText, jsonText, noIndex]);
}
