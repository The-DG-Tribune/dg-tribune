import {
  LayoutDashboard,
  FileText,
  Zap,
  Users,
  Shield,
  Trophy,
  Image,
  HelpCircle,
  Wrench,
  Home,
  Camera,
  Settings,
  Trash2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Dashboard sidebar navigation - Document 03/05 CMS Modules.
 * Each item's route is added as its module is built in Phase 6;
 * visiting one before then correctly shows the 404 page rather than
 * a broken/placeholder screen.
 */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Write Article", href: ROUTES.dashboardArticles, icon: FileText },
  { label: "Short Updates", href: ROUTES.dashboardShortUpdates, icon: Zap },
  { label: "Players", href: ROUTES.dashboardPlayers, icon: Users },
  { label: "Teams", href: ROUTES.dashboardTeams, icon: Shield },
  { label: "Leagues", href: ROUTES.dashboardLeagues, icon: Trophy },
  { label: "Wallpapers", href: ROUTES.dashboardWallpapers, icon: Image },
  { label: "Quizzes", href: ROUTES.dashboardQuizzes, icon: HelpCircle },
  { label: "Tools", href: ROUTES.dashboardTools, icon: Wrench },
  { label: "Homepage Manager", href: ROUTES.dashboardHomepage, icon: Home },
  { label: "Photos", href: ROUTES.dashboardMedia, icon: Camera },
  { label: "Analytics", href: ROUTES.dashboardAnalytics, icon: BarChart3 },
  { label: "Trash", href: ROUTES.dashboardTrash, icon: Trash2 },
  { label: "Settings", href: ROUTES.dashboardSettings, icon: Settings },
];
