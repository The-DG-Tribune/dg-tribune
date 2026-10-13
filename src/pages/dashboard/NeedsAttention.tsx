import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getCollectionCount } from "@/services/firebase/firestore";

interface Item {
  label: string;
  count: number;
  to: string;
}

/** Quick to-do list for the admin: drafts waiting and wallpapers with no category. */
export function NeedsAttention() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [draftArticles, draftWallpapers, loose, draftQuizzes] = await Promise.all([
          getCollectionCount("articles", { where: [["isDeleted", "==", false], ["status", "==", "draft"]] }),
          getCollectionCount("wallpapers", { where: [["isDeleted", "==", false], ["status", "==", "draft"]] }),
          getCollectionCount("wallpapers", { where: [["isDeleted", "==", false], ["categoryId", "==", null]] }),
          getCollectionCount("quizzes", { where: [["isDeleted", "==", false], ["status", "==", "draft"]] }),
        ]);
        if (cancelled) return;
        setItems([
          { label: "draft articles waiting to publish", count: draftArticles, to: ROUTES.dashboardArticles },
          { label: "draft wallpapers", count: draftWallpapers, to: ROUTES.dashboardWallpapers },
          { label: "wallpapers with no category", count: loose, to: ROUTES.dashboardWallpapers },
          { label: "draft quizzes", count: draftQuizzes, to: ROUTES.dashboardQuizzes },
        ]);
      } catch {
        if (!cancelled) setItems([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) return null;
  const open = items.filter((i) => i.count > 0);

  return (
    <div className="mt-6 rounded-card border border-white/10 bg-white/[0.04] p-4">
      <h2 className="mb-2 font-heading text-card-title text-text">Needs attention</h2>
      {open.length === 0 ? (
        <p className="flex items-center gap-2 text-small text-text-secondary">
          <CheckCircle2 className="h-4 w-4 text-accent" /> All clear. Nothing waiting on you.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {open.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                className="flex items-center gap-2 text-small text-text hover:text-accent"
              >
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="font-semibold">{item.count}</span> {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
