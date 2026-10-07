import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

// Dev-only checkpoint screens (kept reachable for reference only)
const Phase3Status = lazy(() => import("@/pages/home/Phase3Status"));
const Phase2Showcase = lazy(() => import("@/pages/home/Phase2Showcase"));

// Public site
import { PublicLayout } from "@/layouts/PublicLayout";
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const SearchPage = lazy(() => import("@/pages/search/SearchPage"));
const PrivacyPage = lazy(() => import("@/pages/legal/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/legal/TermsPage"));
const DisclaimerPage = lazy(() => import("@/pages/legal/DisclaimerPage"));
const ContactPage = lazy(() => import("@/pages/contact/ContactPage"));
const NotFoundPage = lazy(() => import("@/pages/not-found/NotFoundPage"));
const FootballHub = lazy(() => import("@/pages/football/FootballHub"));
const ArticlePage = lazy(() => import("@/pages/article/ArticlePage"));
const PlayersPage = lazy(() => import("@/pages/players/PlayersPage"));
const PlayerProfilePage = lazy(() => import("@/pages/player/PlayerProfilePage"));
const TeamsPage = lazy(() => import("@/pages/teams/TeamsPage"));
const TeamProfilePage = lazy(() => import("@/pages/team/TeamProfilePage"));
const LeaguesPage = lazy(() => import("@/pages/leagues/LeaguesPage"));
const LeagueProfilePage = lazy(() => import("@/pages/league/LeagueProfilePage"));
const ToolsIndexPage = lazy(() => import("@/pages/tools/ToolsIndexPage"));
const ToolPage = lazy(() => import("@/pages/tools/ToolPage"));
const QuizzesPage = lazy(() => import("@/pages/quizzes/QuizzesPage"));
const QuizPlayPage = lazy(() => import("@/pages/quizzes/QuizPlayPage"));
const WallpapersPage = lazy(() => import("@/pages/wallpapers/WallpapersPage"));
const HotTakesPage = lazy(() => import("@/pages/hot-takes/HotTakesPage"));

// Auth
const AdminLogin = lazy(() => import("@/pages/auth/AdminLogin"));
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Dashboard / CMS
import { DashboardLayout } from "@/layouts/DashboardLayout";
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const ArticlesList = lazy(() => import("@/pages/dashboard/articles/ArticlesList"));
const ArticleEditor = lazy(() => import("@/pages/dashboard/articles/ArticleEditor"));
const ShortUpdatesList = lazy(() => import("@/pages/dashboard/short-updates/ShortUpdatesList"));
const PlayersList = lazy(() => import("@/pages/dashboard/players/PlayersList"));
const PlayerEditor = lazy(() => import("@/pages/dashboard/players/PlayerEditor"));
const TeamsList = lazy(() => import("@/pages/dashboard/teams/TeamsList"));
const TeamEditor = lazy(() => import("@/pages/dashboard/teams/TeamEditor"));
const LeaguesList = lazy(() => import("@/pages/dashboard/leagues/LeaguesList"));
const LeagueEditor = lazy(() => import("@/pages/dashboard/leagues/LeagueEditor"));
const WallpapersList = lazy(() => import("@/pages/dashboard/wallpapers/WallpapersList"));
const QuizzesList = lazy(() => import("@/pages/dashboard/quizzes/QuizzesList"));
const QuizEditor = lazy(() => import("@/pages/dashboard/quizzes/QuizEditor"));
const ToolsList = lazy(() => import("@/pages/dashboard/tools/ToolsList"));
const HomepageManager = lazy(() => import("@/pages/dashboard/homepage/HomepageManager"));
const MediaLibrary = lazy(() => import("@/pages/dashboard/media/MediaLibrary"));
const Settings = lazy(() => import("@/pages/dashboard/settings/Settings"));
const TrashPage = lazy(() => import("@/pages/dashboard/trash/TrashPage"));
const AnalyticsPage = lazy(() => import("@/pages/dashboard/analytics/AnalyticsPage"));
const DataImport = lazy(() => import("@/pages/dashboard/import/DataImport"));
const LegalPagesEditor = lazy(() => import("@/pages/dashboard/legal/LegalPagesEditor"));
const ContactMessages = lazy(() => import("@/pages/dashboard/messages/ContactMessages"));

/**
 * Root router.
 *
 * Every page component is lazy-loaded (Phase 13 - Optimization): a
 * public visitor's browser only ever downloads the public-site bundle
 * plus whichever single page they're viewing, never the entire
 * dashboard/CMS (25+ admin pages) that only the administrator uses.
 * PublicLayout and DashboardLayout each wrap their <Outlet /> in a
 * Suspense boundary, so route-level lazy imports here just work
 * without repeating a fallback on every single route.
 *
 * Public site (Phase 7): home, search, privacy, terms, disclaimer,
 * contact, 404. Football pages (articles, players, teams, leagues
 * detail pages) and Tools/Wallpapers public listing pages come in
 * Phase 8/9/10 - until then, their linked routes correctly 404
 * rather than showing a placeholder.
 */
export const router = createBrowserRouter(
  [
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.home, element: <HomePage /> },
      { path: ROUTES.football, element: <FootballHub /> },
      { path: ROUTES.article(), element: <ArticlePage /> },
      { path: ROUTES.players, element: <PlayersPage /> },
      { path: ROUTES.player(), element: <PlayerProfilePage /> },
      { path: ROUTES.teams, element: <TeamsPage /> },
      { path: ROUTES.team(), element: <TeamProfilePage /> },
      { path: ROUTES.leagues, element: <LeaguesPage /> },
      { path: ROUTES.league(), element: <LeagueProfilePage /> },
      { path: ROUTES.tools, element: <ToolsIndexPage /> },
      { path: ROUTES.tool(), element: <ToolPage /> },
      { path: ROUTES.quizzes, element: <QuizzesPage /> },
      { path: ROUTES.quiz(), element: <QuizPlayPage /> },
      { path: ROUTES.wallpapers, element: <WallpapersPage /> },
      { path: ROUTES.hotTakes, element: <HotTakesPage /> },
      { path: ROUTES.search, element: <SearchPage /> },
      { path: ROUTES.privacy, element: <PrivacyPage /> },
      { path: ROUTES.terms, element: <TermsPage /> },
      { path: ROUTES.disclaimer, element: <DisclaimerPage /> },
      { path: ROUTES.contact, element: <ContactPage /> },
    ],
  },
  {
    // Kept reachable for reference - not real site routes.
    path: "/dev/connections",
    element: (
      <Suspense fallback={<PageLoadingFallback />}>
        <Phase3Status />
      </Suspense>
    ),
  },
  {
    path: "/dev/components",
    element: (
      <Suspense fallback={<PageLoadingFallback />}>
        <Phase2Showcase />
      </Suspense>
    ),
  },
  {
    path: ROUTES.adminLogin,
    element: (
      <Suspense fallback={<PageLoadingFallback />}>
        <AdminLogin />
      </Suspense>
    ),
  },
  {
    path: ROUTES.dashboard,
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardHome /> },
      { path: "articles", element: <ArticlesList /> },
      { path: "articles/new", element: <ArticleEditor /> },
      { path: "articles/:id/edit", element: <ArticleEditor /> },
      { path: "short-updates", element: <ShortUpdatesList /> },
      { path: "players", element: <PlayersList /> },
      { path: "players/new", element: <PlayerEditor /> },
      { path: "players/:id/edit", element: <PlayerEditor /> },
      { path: "teams", element: <TeamsList /> },
      { path: "teams/new", element: <TeamEditor /> },
      { path: "teams/:id/edit", element: <TeamEditor /> },
      { path: "leagues", element: <LeaguesList /> },
      { path: "leagues/new", element: <LeagueEditor /> },
      { path: "leagues/:id/edit", element: <LeagueEditor /> },
      { path: "wallpapers", element: <WallpapersList /> },
      { path: "quizzes", element: <QuizzesList /> },
      { path: "quizzes/new", element: <QuizEditor /> },
      { path: "quizzes/:id/edit", element: <QuizEditor /> },
      { path: "tools", element: <ToolsList /> },
      { path: "homepage", element: <HomepageManager /> },
      { path: "media", element: <MediaLibrary /> },
      { path: "settings", element: <Settings /> },
      { path: "trash", element: <TrashPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "import", element: <DataImport /> },
      { path: "legal", element: <LegalPagesEditor /> },
      { path: "messages", element: <ContactMessages /> },
    ],
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<PageLoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
  ],
  { basename: import.meta.env.BASE_URL }
);
