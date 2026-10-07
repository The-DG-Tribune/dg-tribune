import { useEffect } from "react";

interface DocumentHeadOptions {
  title: string;
  description?: string;
  image?: string;
  /** Defaults to "website" - use "article" for article pages. */
  type?: "website" | "article";
}

const SITE_NAME = "DG Tribune";
const DEFAULT_DESCRIPTION =
  "DG Tribune - football news, players, teams, leagues, quizzes, wallpapers and interactive tools in one modern platform.";

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * useDocumentHead - sets the page title, meta description, and Open
 * Graph / Twitter Card tags for the current route. Every public page
 * that represents a distinct piece of content (an article, a player,
 * a team...) should call this with real values from its own data,
 * so browser tabs, search results, and shared links all show
 * something specific instead of the same generic homepage text.
 */
export function useDocumentHead({ title, description, image, type = "website" }: DocumentHeadOptions) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    const desc = description || DEFAULT_DESCRIPTION;

    document.title = fullTitle;
    setMetaTag("name", "description", desc);

    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", desc);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:site_name", SITE_NAME);
    if (image) setMetaTag("property", "og:image", image);

    setMetaTag("name", "twitter:card", image ? "summary_large_image" : "summary");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", desc);
    if (image) setMetaTag("name", "twitter:image", image);

    // Canonical URL - the current path, without query params.
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}${window.location.pathname}`);
  }, [title, description, image, type]);
}
