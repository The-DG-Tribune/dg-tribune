import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  FileText,
  Users,
  Shield,
  Trophy,
  Image as ImageIcon,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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
      const [articles, players, teams, leagues, wallpapers, quizzes] =
        await Promise.all([
          getCollectionCount("articles", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("players", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("teams", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("leagues", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("wallpapers", { where: [["isDeleted", "==", false]] }),
          getCollectionCount("quizzes", { where: [["isDeleted", "==", false]] }),
        ]);
      setCounts({ articles, players, teams, leagues, wallpapers, quizzes });
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
        <Badge variant="accent" className="mb-3">
          Phase 5 · CMS Foundation
        </Badge>
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
          description="Full site-wide search (articles, players, teams, and more) is built in Phase 11. This bar will search live content once it exists."
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

      {counts && Object.values(counts).every((c) => c === 0) && !searchValue && (
        <div className="mt-6">
          <EmptyState
            title="Nothing published yet"
            description="Your content modules (articles, players, teams, and more) are built in Phase 6. Once they're live, this dashboard will reflect real numbers."
          />
        </div>
      )}
    </div>
  );
}
