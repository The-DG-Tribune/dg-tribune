/**
 * Firestore types - Document 04 Data Model.
 * Base fields shared by every content collection, plus one interface
 * per collection. Extend these as later phases need more fields -
 * never bypass them with inline object shapes in components.
 */

export type ContentStatus = "draft" | "published" | "archived";

export interface BaseDocument {
  id: string;
  slug: string;
  status: ContentStatus;
  isDeleted: boolean;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  deletedAt: number | null;
}

export interface Article extends BaseDocument {
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  categoryId: string;
  tags: string[];
  authorName: string; // the single administrator's display name
  isFeatured: boolean;
  viewCount: number;
}

export interface ShortUpdate extends BaseDocument {
  text: string;
  imageUrl: string | null;
  linkedArticleId: string | null;
  likeCount: number;
}

export interface Player extends BaseDocument {
  name: string;
  photoUrl: string;
  position: string;
  nationality: string;
  dateOfBirth: string; // ISO date
  currentTeamId: string | null;
  jerseyNumber: number | null;
  bio: string;
  stats: Record<string, number>;
  /** Only meaningful for goalkeepers - kept separate from `stats`
   * since it's the one metric outfield players don't have. */
  cleanSheets?: number;
}

export interface Team extends BaseDocument {
  name: string;
  logoUrl: string;
  leagueId: string | null;
  founded: number | null;
  stadium: string;
  bio: string;
}

export interface League extends BaseDocument {
  name: string;
  logoUrl: string;
  country: string;
  bio: string;
}

export interface Category extends BaseDocument {
  name: string;
  colorHex: string;
}

export interface Wallpaper extends BaseDocument {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  categoryId: string | null;
  downloadCount: number;
  likeCount: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface Quiz extends BaseDocument {
  title: string;
  description: string;
  coverImageUrl: string;
  questions: QuizQuestion[];
  playCount: number;
}

export interface Tool extends BaseDocument {
  name: string;
  description: string;
  iconName: string; // lucide-react icon name
  isEnabled: boolean;
  order: number;
}

export interface HomepageSection {
  id: string;
  type: "hero" | "featured" | "latest" | "trending" | "tools" | "wallpapers" | "quiz-spotlight" | "leagues";
  title: string;
  itemIds: string[];
  order: number;
}

export interface HomepageConfig {
  id: "homepage";
  sections: HomepageSection[];
  updatedAt: number;
}

export interface SiteSettings {
  id: "settings";
  siteName: string;
  tagline: string;
  logoUrl: string;
  contactEmail: string;
  /** Whether the contact email shows in the footer - unlike social
   * links (where clearing the URL hides the icon), an email is
   * useful to have on file without necessarily displaying it. */
  showEmailInFooter?: boolean;
  socialLinks: Record<string, string>;
  updatedAt: number;
}

export interface MediaAsset {
  id: string;
  url: string;
  cloudinaryPublicId: string;
  width: number;
  height: number;
  uploadedAt: number;
  usedIn: string[]; // document IDs referencing this asset
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface FeaturedItem {
  id: string;
  contentType: "article" | "player" | "team" | "league";
  contentId: string;
  order: number;
}

export interface AnalyticsSnapshot {
  id: string;
  date: string; // ISO date
  pageViews: number;
  topArticles: { articleId: string; views: number }[];
}

export interface SearchIndexEntry {
  id: string;
  contentType: "article" | "player" | "team" | "league" | "tool" | "quiz";
  contentId: string;
  title: string;
  slug: string;
  keywords: string[];
}

export interface LegalPages {
  id: "content";
  privacy: string;
  terms: string;
  disclaimer: string;
  updatedAt: number;
}

export interface Admin {
  id: string;
  uid: string;
  email: string;
  displayName: string;
}
