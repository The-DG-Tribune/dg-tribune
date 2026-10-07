/**
 * Centralized route paths - Document 03 (Technical Architecture & Project Setup).
 * Never hardcode path strings elsewhere; import from here.
 */

export const ROUTES = {
  // Public routes
  home: "/",
  football: "/football",
  article: (slug: string = ":slug") => `/article/${slug}`,
  players: "/players",
  player: (slug: string = ":slug") => `/player/${slug}`,
  teams: "/teams",
  team: (slug: string = ":slug") => `/team/${slug}`,
  leagues: "/leagues",
  league: (slug: string = ":slug") => `/league/${slug}`,
  tools: "/tools",
  tool: (slug: string = ":slug") => `/tools/${slug}`,
  quizzes: "/quizzes",
  quiz: (slug: string = ":slug") => `/quiz/${slug}`,
  wallpapers: "/wallpapers",
  hotTakes: "/hot-takes",
  search: "/search",
  privacy: "/privacy",
  terms: "/terms",
  contact: "/contact",
  disclaimer: "/disclaimer",

  // Admin routes
  adminLogin: "/admin-login",
  dashboard: "/dashboard",
  dashboardArticles: "/dashboard/articles",
  dashboardArticleNew: "/dashboard/articles/new",
  dashboardArticleEdit: (id: string = ":id") => `/dashboard/articles/${id}/edit`,
  dashboardShortUpdates: "/dashboard/short-updates",
  dashboardPlayers: "/dashboard/players",
  dashboardPlayerNew: "/dashboard/players/new",
  dashboardPlayerEdit: (id: string = ":id") => `/dashboard/players/${id}/edit`,
  dashboardTeams: "/dashboard/teams",
  dashboardTeamNew: "/dashboard/teams/new",
  dashboardTeamEdit: (id: string = ":id") => `/dashboard/teams/${id}/edit`,
  dashboardLeagues: "/dashboard/leagues",
  dashboardLeagueNew: "/dashboard/leagues/new",
  dashboardLeagueEdit: (id: string = ":id") => `/dashboard/leagues/${id}/edit`,
  dashboardTools: "/dashboard/tools",
  // Tools uses a modal editor (like Short Updates/Wallpapers) - no separate new/edit routes needed.
  dashboardQuizzes: "/dashboard/quizzes",
  dashboardQuizNew: "/dashboard/quizzes/new",
  dashboardQuizEdit: (id: string = ":id") => `/dashboard/quizzes/${id}/edit`,
  dashboardWallpapers: "/dashboard/wallpapers",
  dashboardWallpaperNew: "/dashboard/wallpapers/new",
  dashboardWallpaperEdit: (id: string = ":id") => `/dashboard/wallpapers/${id}/edit`,
  dashboardMedia: "/dashboard/media",
  dashboardHomepage: "/dashboard/homepage",
  dashboardTrash: "/dashboard/trash",
  dashboardSettings: "/dashboard/settings",
  dashboardAnalytics: "/dashboard/analytics",
} as const;
