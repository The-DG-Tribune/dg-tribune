import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  FileText,
  Users,
  Shield,
  Trophy,
  Image as ImageIcon,
  HelpCircle,
  Flame,
  Plus,
  Download,
  LayoutDashboard,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard";
import { getCollectionCount } from "@/services/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import type { DashboardOutletContext } from "@/layouts/DashboardLayout";

interface Counts {
  articles: number;
  players: number;
  teams: number;
  leagues: number;
  wallpapers: number;
  quizzes: number;
  hotTakes: number;
}

const CARD_CONFIG: {
  key: keyof Counts;
  label: string;
  icon: typeof FileText;
  accentClassName?: string;
}[] = [
  { key: "articles", label: "Articles", icon: FileText },
  {
    key: "players",
    label: "Players",
    icon: Users,
    accentClassName: "bg-accent-secondary/10 text-accent-secondary",
  },
  { key: "teams", label: "Teams", icon: Shield },
  {
    key: "leagues",
    label: "Leagues",
    icon: Trophy,
    accentClassName: "bg-warning/10 text-warning",
  },
  { key: "wallpapers", label: "Wallpapers", icon: ImageIcon },
  {
    key: "hotTakes",
    label: "Hot Takes",
    icon: Flame,
    accentClassName: "bg-warning/10 text-warning",
  },
  {
    key: "quizzes",
    label: "Quizzes",
    icon: HelpCircle,
    accentClassName: "bg-accent-secondary/10 text-accent-secondary",
  },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const { searchValue } = useOutletContext<DashboardOutletContext>();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCounts() {
    setError(null);
    setCounts(null);
    try {
      const [articles, players, teams, leagues, wallpapers, quizzes, hotTakes] =
        await Promise.all([
          getCollectionCount("articles", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("players", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("teams", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("leagues", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("wallpapers", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("quizzes", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("shortUpdates", { where: [["isDeleted", "==", false]] }),
        ]);
      setCounts({ articles, players, teams, leagues, wallpapers, quizzes, hotTakes });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.email?.split("@")[0] ?? "Admin";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-page-title text-text">
          Welcome back, {firstName}
        </h1>
        <p className="text-body text-text-secondary mt-1">
          Here's what's happening on DG Tribune.
        </p>
      </div>

      {searchValue ? (
        <EmptyState
          title={`No results for "${searchValue}"`}
          description="Try a different word, or use the sidebar to open a section directly."
        />
      ) : error ? (
        <ErrorState description={error} onRetry={loadCounts} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {CARD_CONFIG.map((card) => (
            <AnalyticsCard
              key={card.key}
              label={card.label}
              value={counts ? counts[card.key] : null}
              icon={card.icon}
              accentClassName={card.accentClassName}
            />
          ))}
        </div>
      )}

      {!searchValue && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: ROUTES.dashboardArticleNew, label: "New article", icon: Plus },
            { to: ROUTES.dashboardShortUpdates, label: "Hot Takes", icon: Flame },
            { to: ROUTES.dashboardWallpaperNew, label: "Add wallpaper", icon: ImageIcon },
            { to: "/dashboard/import", label: "Import content", icon: Download },
            { to: ROUTES.dashboardHomepage, label: "Edit homepage", icon: LayoutDashboard },
            { to: ROUTES.dashboardQuizNew, label: "New quiz", icon: HelpCircle },
            { to: ROUTES.dashboardPlayerNew, label: "Add player", icon: Users },
            { to: ROUTES.dashboardTeamNew, label: "Add team", icon: Shield },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="flex items-center gap-2 rounded-container border border-white/10 bg-white/[0.04] px-3 py-3 text-small font-medium text-text transition-colors hover:border-accent/40 hover:text-accent"
            >
              <a.icon className="h-4 w-4 shrink-0" />
              {a.label}
            </Link>
          ))}
        </div>
      )}

      {counts && Object.values(counts).every((c) => c === 0) && !searchValue && (
        <div className="mt-6">
          <EmptyState
            title="Nothing published yet"
            description="Use the Import tool to load leagues, teams, players and quizzes in a few clicks, or add content by hand from the sidebar."
          />
        </div>
      )}
    </div>
  );
}
