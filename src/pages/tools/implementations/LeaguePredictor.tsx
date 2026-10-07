import { useEffect, useRef, useState } from "react";
import { GripVertical, RotateCcw, Trophy } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { League, Team } from "@/types/firestore";
import { cn } from "@/lib/cn";

export default function LeaguePredictor() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [leagueId, setLeagueId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getCollectionDocs<League>("leagues", {
        where: [["isDeleted", "==", false]],
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setLeagues(data);
    })();
  }, []);

  async function handleLeagueChange(id: string) {
    setLeagueId(id);
    setIsLoadingTeams(true);
    const data = await getCollectionDocs<Team>("teams", {
      where: [["isDeleted", "==", false], ["leagueId", "==", id]],
    });
    data.sort((a, b) => a.name.localeCompare(b.name));
    setTeams(data);
    setIsLoadingTeams(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= teams.length) return;
    const reordered = [...teams];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setTeams(reordered);
  }

  function reset() {
    setTeams((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null || dragIndex.current === targetIndex) {
      setDragOverIndex(null);
      return;
    }
    const reordered = [...teams];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(targetIndex, 0, moved);
    setTeams(reordered);
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  const podium = teams.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2">
        <Dropdown
          label="League"
          value={leagueId}
          onChange={handleLeagueChange}
          options={leagues?.map((l) => ({ label: l.name, value: l.id })) ?? []}
          placeholder={leagues === null ? "Loading leagues..." : "Choose a league"}
          className="mb-6"
        />

        {isLoadingTeams ? (
          <div className="flex justify-center py-10"><Loader label="Loading teams..." /></div>
        ) : leagueId && teams.length === 0 ? (
          <EmptyState title="No teams assigned to this league yet." />
        ) : teams.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-small text-text-secondary">Drag teams to reorder, or use the arrows</p>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            </div>
            <div className="space-y-2">
              {teams.map((team, index) => (
                <div
                  key={team.id}
                  draggable
                  onDragStart={() => (dragIndex.current = index)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                  onDragLeave={() => setDragOverIndex((v) => (v === index ? null : v))}
                  onDrop={() => handleDrop(index)}
                  className={cn(
                    "flex items-center gap-3 rounded-card border bg-surface p-3 cursor-grab active:cursor-grabbing transition-colors",
                    dragOverIndex === index ? "border-accent bg-accent/5" : "border-border"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-text-secondary shrink-0" />
                  <span className="w-6 text-center text-small font-semibold text-text-secondary">{index + 1}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-button bg-background p-1">
                    {team.logoUrl && <img src={team.logoUrl} alt="" className="h-full w-full object-contain" />}
                  </div>
                  <span className="flex-1 truncate text-small text-text">{team.name}</span>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" className="text-text-secondary hover:text-text disabled:opacity-30">▲</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === teams.length - 1} aria-label="Move down" className="text-text-secondary hover:text-text disabled:opacity-30">▼</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-small text-text-secondary text-center py-10">Choose a league to start predicting.</p>
        )}
      </div>

      <div className="hidden lg:block">
        <div className="rounded-card border border-border bg-surface p-5 sticky top-20">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="h-4 w-4 text-warning" />
            <h3 className="text-small font-semibold text-text">Top 3</h3>
          </div>
          {podium.length === 0 ? (
            <p className="text-small text-text-secondary">Pick a league to see your predicted top 3.</p>
          ) : (
            <div className="flex items-end justify-center gap-2 h-40">
              {[podium[1], podium[0], podium[2]].map((team, visualIndex) => {
                if (!team) return <div key={visualIndex} className="flex-1" />;
                const place = visualIndex === 1 ? 1 : visualIndex === 0 ? 2 : 3;
                const height = place === 1 ? "h-32" : place === 2 ? "h-24" : "h-16";
                return (
                  <div key={team.id} className="flex flex-1 flex-col items-center justify-end gap-2 transition-all duration-500 ease-out">
                    <div className="flex h-8 w-8 items-center justify-center rounded-button bg-background p-1">
                      {team.logoUrl && <img src={team.logoUrl} alt="" className="h-full w-full object-contain" />}
                    </div>
                    <p className="text-caption text-text text-center truncate w-full">{team.name}</p>
                    <div className={cn("w-full rounded-t-md flex items-start justify-center pt-1 text-caption font-bold transition-all duration-500 ease-out", height, place === 1 ? "bg-accent text-background" : "bg-border text-text-secondary")}>
                      {place}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
