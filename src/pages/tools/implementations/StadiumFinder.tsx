import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Trophy, Calendar } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/cards/Card";
import { ROUTES } from "@/constants/routes";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Team } from "@/types/firestore";
import { cn } from "@/lib/cn";

export default function StadiumFinder() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getCollectionDocs<Team>("teams", {
        where: [["isDeleted", "==", false], ["status", "==", "published"]],
      });
      data.sort((a, b) => (a.stadium || "").localeCompare(b.stadium || ""));
      setTeams(data);
      if (data.length > 0) setSelectedId(data.find((t) => t.stadium)?.id ?? null);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!teams) return [];
    const q = search.toLowerCase();
    return teams.filter((t) => (t.stadium || "").toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [teams, search]);

  if (teams === null) return <div className="flex justify-center py-16"><Loader label="Loading stadiums..." /></div>;

  const teamsWithStadiums = filtered.filter((t) => t.stadium);
  const selected = teams.find((t) => t.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search by stadium or team name..." className="mb-6 max-w-md" />
        {teamsWithStadiums.length === 0 ? (
          <EmptyState icon={<MapPin className="h-6 w-6" strokeWidth={1.5} />} title="No stadiums found." description="Add a stadium name to a team in the CMS to have it show up here." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teamsWithStadiums.map((team) => (
              <button key={team.id} type="button" onClick={() => setSelectedId(team.id)} className={cn("flex items-center gap-3 rounded-card border p-4 text-left transition-colors duration-button", selectedId === team.id ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/50")}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-background p-1.5">
                  {team.logoUrl && <img src={team.logoUrl} alt="" className="h-full w-full object-contain" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-body text-text">{team.stadium}</p>
                  <p className="truncate text-small text-text-secondary">{team.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        <Card className="p-6 sticky top-20">
          {!selected ? (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 text-text-secondary mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-small text-text-secondary">Select a stadium to see full details here.</p>
            </div>
          ) : (
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-card bg-background p-2 mb-4">
                {selected.logoUrl && <img src={selected.logoUrl} alt="" className="h-full w-full object-contain" />}
              </div>
              <h3 className="font-heading text-card-title text-text mb-1">{selected.stadium}</h3>
              <p className="text-small text-text-secondary mb-4">Home of {selected.name}</p>
              <div className="space-y-2 mb-5">
                {selected.founded && <p className="flex items-center gap-2 text-small text-text-secondary"><Calendar className="h-4 w-4" />Club founded {selected.founded}</p>}
                <p className="flex items-center gap-2 text-small text-text-secondary"><Trophy className="h-4 w-4" />{selected.name}</p>
              </div>
              <Link to={ROUTES.team(selected.slug)} className="block w-full rounded-button border border-border text-center py-2.5 text-small font-medium text-text hover:border-accent transition-colors duration-button">
                View full team profile
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
