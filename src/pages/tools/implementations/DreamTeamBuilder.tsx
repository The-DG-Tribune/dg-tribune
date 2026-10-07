import { useEffect, useState, type MouseEvent } from "react";
import { X, RotateCcw } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FORMATIONS, FORMATION_OPTIONS } from "@/constants/formations";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Player } from "@/types/firestore";
import { cn } from "@/lib/cn";

export default function DreamTeamBuilder() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [formationKey, setFormationKey] = useState("4-3-3");
  const [assignments, setAssignments] = useState<Record<string, Player | null>>({});
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const data = await getCollectionDocs<Player>("players", {
        where: [
          ["isDeleted", "==", false],
          ["status", "==", "published"],
        ],
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setPlayers(data);
    })();
  }, []);

  const formation = FORMATIONS[formationKey];

  function handleFormationChange(key: string) {
    setFormationKey(key);
    setAssignments({});
  }

  function assignPlayer(player: Player) {
    if (!activeSlot) return;
    setAssignments((prev) => ({ ...prev, [activeSlot]: player }));
    setActiveSlot(null);
    setSearch("");
  }

  function clearSlot(slotId: string, e: MouseEvent) {
    e.stopPropagation();
    setAssignments((prev) => ({ ...prev, [slotId]: null }));
  }

  function resetAll() {
    setAssignments({});
  }

  const usedPlayerIds = new Set(
    Object.values(assignments)
      .filter(Boolean)
      .map((p) => p!.id)
  );

  const filteredPlayers =
    players?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  const filledCount = Object.values(assignments).filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Dropdown
            value={formationKey}
            onChange={handleFormationChange}
            options={FORMATION_OPTIONS}
            className="w-32"
          />
          <span className="text-small text-text-secondary">
            {filledCount}/11 selected
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={resetAll}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset
        </Button>
      </div>

      {players === null ? (
        <div className="flex justify-center py-16">
          <Loader label="Loading players…" />
        </div>
      ) : players.length === 0 ? (
        <EmptyState
          title="No players available yet."
          description="Add published players in the CMS to build your dream team."
        />
      ) : (
        <div
          className="relative w-full max-w-xl mx-auto aspect-[3/4] rounded-card overflow-hidden border border-border"
          style={{
            background:
              "repeating-linear-gradient(180deg, #1a4d2e, #1a4d2e 10%, #1f5a35 10%, #1f5a35 20%)",
          }}
        >
          {/* Center circle + halfway line for a basic pitch look */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />

          {formation.slots.map((slot) => {
            const player = assignments[slot.id];
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveSlot(slot.id)}
                style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
              >
                <div
                  className={cn(
                    "relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 overflow-hidden bg-surface transition-colors duration-button",
                    player ? "border-accent" : "border-white/40 group-hover:border-white"
                  )}
                >
                  {player?.photoUrl ? (
                    <img
                      src={player.photoUrl}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-caption font-semibold text-white">
                      {slot.label}
                    </span>
                  )}
                  {player && (
                    <span
                      onClick={(e) => clearSlot(slot.id, e)}
                      role="button"
                      aria-label="Remove player"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-0 group-hover:opacity-100 transition-opacity duration-button"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-white whitespace-nowrap max-w-[80px] truncate">
                  {player ? player.name : slot.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!activeSlot}
        onClose={() => {
          setActiveSlot(null);
          setSearch("");
        }}
        title="Choose a player"
      >
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search players…"
          className="mb-4"
        />
        <div className="max-h-72 overflow-y-auto space-y-1">
          {filteredPlayers.length === 0 ? (
            <p className="text-small text-text-secondary text-center py-6">
              No players found.
            </p>
          ) : (
            filteredPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => assignPlayer(player)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-button px-3 py-2 text-left transition-colors duration-button hover:bg-background",
                  usedPlayerIds.has(player.id) && "opacity-50"
                )}
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-background">
                  {player.photoUrl && (
                    <img src={player.photoUrl} alt="" className="h-full w-full object-cover object-top" />
                  )}
                </div>
                <span className="text-small text-text">{player.name}</span>
                <span className="ml-auto text-caption text-text-secondary">
                  {player.position}
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
