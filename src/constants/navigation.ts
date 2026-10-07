import { ROUTES } from "@/constants/routes";

/**
 * Primary navigation - Document 02/06A: identical on desktop nav
 * and the mobile drawer. No Login/Register/Donate items - admin
 * never appears in public navigation.
 */
export const NAV_ITEMS = [
  { label: "Football", href: ROUTES.football },
  { label: "Hot Takes", href: ROUTES.hotTakes },
  { label: "Players", href: ROUTES.players },
  { label: "Teams", href: ROUTES.teams },
  { label: "Leagues", href: ROUTES.leagues },
  { label: "Tools", href: ROUTES.tools },
  { label: "Quizzes", href: ROUTES.quizzes },
  { label: "Wallpapers", href: ROUTES.wallpapers },
] as const;
