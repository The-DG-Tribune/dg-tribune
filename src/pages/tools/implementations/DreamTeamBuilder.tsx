import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { X, RotateCcw, Wand2, Download, Crown, Share2 } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import { FORMATIONS, FORMATION_OPTIONS } from "@/constants/formations";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Player } from "@/types/firestore";
import { cn } from "@/lib/cn";
import { getThumbnailUrl } from "@/services/cloudinary/upload";

const STORAGE_KEY = "dgtribune_dream_team_v2";

type Group = "Goalkeeper" | "Defender" | "Midfielder" | "Forward";

const LABEL_GROUP: Record<string, Group> = {
  GK: "Goalkeeper",
  LB: "Defender",
  RB: "Defender",
  CB: "Defender",
  CDM: "Midfielder",
  CM: "Midfielder",
  CAM: "Midfielder",
  LM: "Midfielder",
  RM: "Midfielder",
  LW: "Forward",
  RW: "Forward",
  ST: "Forward",
};

interface Saved {
  formationKey: string;
  teamName: string;
  captainId: string | null;
  slots: Record<string, string>; // slotId -> playerId
}

/**
 * Moves everyone already picked into the new formation, so switching
 * 4-3-3 to 4-4-2 never wipes the team. Same position first (CB to CB),
 * then same line (defender to defender), then anyone left over.
 */
function carryOver(
  oldKey: string,
  newKey: string,
  assignments: Record<string, Player | null>
): Record<string, Player | null> {
  const oldSlots = FORMATIONS[oldKey].slots;
  const newSlots = FORMATIONS[newKey].slots;
  const pool: { label: string; player: Player }[] = [];
  for (const slot of oldSlots) {
    const player = assignments[slot.id];
    if (player) pool.push({ label: slot.label, player });
  }

  const next: Record<string, Player | null> = {};
  const take = (test: (entry: { label: string; player: Player }) => boolean) => {
    const i = pool.findIndex(test);
    return i === -1 ? null : pool.splice(i, 1)[0].player;
  };

  for (const slot of newSlots) next[slot.id] = take((e) => e.label === slot.label);
  for (const slot of newSlots) {
    if (!next[slot.id]) next[slot.id] = take((e) => LABEL_GROUP[e.label] === LABEL_GROUP[slot.label]);
  }
  for (const slot of newSlots) {
    if (!next[slot.id]) next[slot.id] = take(() => true);
  }
  return next;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function renderCard(
  teamName: string,
  formationKey: string,
  assignments: Record<string, Player | null>,
  captainId: string | null
): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07130f");
  bg.addColorStop(1, "#0b1226");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createLinearGradient(60, 0, 400, 0);
  g.addColorStop(0, "#00E676");
  g.addColorStop(1, "#3B82F6");
  ctx.fillStyle = "#0f1626";
  ctx.beginPath();
  ctx.roundRect(60, 56, 84, 84, 20);
  ctx.fill();
  ctx.strokeStyle = g;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = g;
  ctx.font = "800 44px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DG", 102, 112);

  ctx.textAlign = "left";
  ctx.fillStyle = "#f5f7fa";
  ctx.font = "800 54px Arial, sans-serif";
  const title = (teamName.trim() || "My Dream XI").slice(0, 22).toUpperCase();
  ctx.fillText(title, 170, 92);
  ctx.fillStyle = "#9fb0c8";
  ctx.font = "600 28px Arial, sans-serif";
  ctx.fillText(`${formationKey}  |  Built on DG Tribune`, 172, 132);

  const px = 60;
  const py = 190;
  const pw = W - 120;
  const ph = 1040;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 36);
  ctx.clip();
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#1a4d2e" : "#1f5a35";
    ctx.fillRect(px, py + (ph / 10) * i, pw, ph / 10 + 1);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, py + ph / 2);
  ctx.lineTo(px + pw, py + ph / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const slots = FORMATIONS[formationKey].slots;
  const images = await Promise.all(
    slots.map((slot) => {
      const player = assignments[slot.id];
      return player?.photoUrl ? loadImage(getThumbnailUrl(player.photoUrl, 240)) : Promise.resolve(null);
    })
  );

  slots.forEach((slot, i) => {
    const player = assignments[slot.id];
    const cx = px + (slot.left / 100) * pw;
    const cy = py + (slot.top / 100) * ph;
    const r = 58;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#0f1626";
    ctx.fill();
    ctx.clip();
    const img = images[i];
    if (img) {
      const scale = (r * 2) / Math.min(img.width, img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, cx - dw / 2, cy - r, dw, dh);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 30px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(player ? player.name.slice(0, 1) : slot.label, cx, cy + 10);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = player ? "#00E676" : "rgba(255,255,255,0.45)";
    ctx.stroke();

    if (player && player.id === captainId) {
      ctx.beginPath();
      ctx.arc(cx + r - 8, cy - r + 8, 20, 0, Math.PI * 2);
      ctx.fillStyle = "#F59E0B";
      ctx.fill();
      ctx.fillStyle = "#0b0f19";
      ctx.font = "800 22px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("C", cx + r - 8, cy - r + 16);
    }

    const label = (player ? player.name.split(" ").slice(-1)[0] : slot.label).slice(0, 14);
    ctx.font = "700 26px Arial, sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(label).width + 28;
    ctx.fillStyle = "rgba(7,10,18,0.82)";
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy + r + 8, tw, 38, 10);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, cx, cy + r + 36);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#9fb0c8";
  ctx.font = "600 28px Arial, sans-serif";
  ctx.fillText("Build yours at dg-tribune.vercel.app", W / 2, H - 52);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export default function DreamTeamBuilder() {
  const { showToast } = useToast();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [formationKey, setFormationKey] = useState("4-3-3");
  const [assignments, setAssignments] = useState<Record<string, Player | null>>({});
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const restored = useRef(false);

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

  // Bring back the last saved team once the players have loaded.
  useEffect(() => {
    if (!players || restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (!FORMATIONS[saved.formationKey]) return;
      const byId = new Map(players.map((p) => [p.id, p]));
      const next: Record<string, Player | null> = {};
      for (const [slotId, playerId] of Object.entries(saved.slots ?? {})) {
        next[slotId] = byId.get(playerId) ?? null;
      }
      setFormationKey(saved.formationKey);
      setAssignments(next);
      setTeamName(saved.teamName ?? "");
      setCaptainId(saved.captainId && byId.has(saved.captainId) ? saved.captainId : null);
    } catch {
      /* ignore a broken save */
    }
  }, [players]);

  // Save on every change.
  useEffect(() => {
    if (!restored.current) return;
    try {
      const slots: Record<string, string> = {};
      for (const [slotId, player] of Object.entries(assignments)) if (player) slots[slotId] = player.id;
      const payload: Saved = { formationKey, teamName, captainId, slots };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* private mode: ignore */
    }
  }, [assignments, formationKey, teamName, captainId]);

  const formation = FORMATIONS[formationKey];

  function handleFormationChange(key: string) {
    setAssignments((prev) => carryOver(formationKey, key, prev));
    setFormationKey(key);
  }

  function assignPlayer(player: Player) {
    if (!activeSlot) return;
    setAssignments((prev) => {
      const next = { ...prev };
      // A player can only stand in one place.
      for (const [slotId, p] of Object.entries(next)) if (p?.id === player.id) next[slotId] = null;
      next[activeSlot] = player;
      return next;
    });
    setActiveSlot(null);
    setSearch("");
  }

  function clearSlot(slotId: string, e?: MouseEvent) {
    e?.stopPropagation();
    const removed = assignments[slotId];
    setAssignments((prev) => ({ ...prev, [slotId]: null }));
    if (removed && removed.id === captainId) setCaptainId(null);
  }

  function resetAll() {
    setAssignments({});
    setCaptainId(null);
  }

  function autoFill() {
    if (!players) return;
    const used = new Set(
      Object.values(assignments)
        .filter(Boolean)
        .map((p) => p!.id)
    );
    const next = { ...assignments };
    for (const slot of formation.slots) {
      if (next[slot.id]) continue;
      const group = LABEL_GROUP[slot.label];
      const candidates = players.filter((p) => p.position === group && !used.has(p.id));
      const withPhotos = candidates.filter((p) => p.photoUrl);
      const pool = withPhotos.length > 0 ? withPhotos : candidates;
      if (pool.length === 0) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      used.add(pick.id);
      next[slot.id] = pick;
    }
    setAssignments(next);
  }

  async function handleDownload(share: boolean) {
    setIsRendering(true);
    try {
      const blob = await renderCard(teamName, formationKey, assignments, captainId);
      if (!blob) throw new Error("render failed");
      const file = new File([blob], "dg-tribune-dream-team.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: teamName || "My Dream XI" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dg-tribune-dream-team.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showToast("Dream team saved as an image");
      }
    } catch {
      showToast("Couldn't make the image, try again", "error");
    } finally {
      setIsRendering(false);
    }
  }

  const usedPlayerIds = useMemo(
    () =>
      new Set(
        Object.values(assignments)
          .filter(Boolean)
          .map((p) => p!.id)
      ),
    [assignments]
  );

  const filteredPlayers =
    players?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  const filledCount = Object.values(assignments).filter(Boolean).length;
  const activePlayer = activeSlot ? assignments[activeSlot] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Dropdown value={formationKey} onChange={handleFormationChange} options={FORMATION_OPTIONS} />
        </div>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          maxLength={22}
          placeholder="Name your XI"
          aria-label="Team name"
          className="h-10 min-w-0 flex-1 rounded-button border border-border bg-surface px-3 text-small text-text placeholder:text-text-secondary focus:border-accent focus:outline-none sm:max-w-[14rem]"
        />
        <span className="pb-2 text-small text-text-secondary">{filledCount}/11 picked</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={autoFill}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            Auto-fill
          </Button>
          <Button variant="secondary" size="sm" onClick={resetAll}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
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
        <>
          <div
            className="relative mx-auto aspect-[3/4] w-full max-w-xl overflow-hidden rounded-card border border-border"
            style={{
              background:
                "repeating-linear-gradient(180deg, #1a4d2e, #1a4d2e 10%, #1f5a35 10%, #1f5a35 20%)",
            }}
          >
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
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-[top,left] duration-500 ease-out"
                >
                  <div
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-surface sm:h-14 sm:w-14",
                      player ? "border-accent" : "border-white/40 group-hover:border-white"
                    )}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      {player?.photoUrl ? (
                        <img
                          loading="lazy"
                          decoding="async"
                          src={getThumbnailUrl(player.photoUrl, 240)}
                          alt=""
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-caption font-semibold text-white">
                          {player ? player.name.slice(0, 1) : slot.label}
                        </span>
                      )}
                    </div>
                    {player && player.id === captainId && (
                      <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-extrabold text-background">
                        C
                      </span>
                    )}
                    {player && (
                      <span
                        onClick={(e) => clearSlot(slot.id, e)}
                        role="button"
                        aria-label="Remove player"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-button sm:group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <span className="max-w-[80px] truncate whitespace-nowrap rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {player ? player.name : slot.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.04] p-4">
            <div>
              <p className="font-heading text-card-title text-text">
                {filledCount === 11 ? "Your XI is ready" : "Finish your XI"}
              </p>
              <p className="text-small text-text-secondary">
                {filledCount === 11
                  ? "Save it as an image and share it."
                  : "Fill every spot, or tap Auto-fill to complete it."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleDownload(false)} isLoading={isRendering} disabled={filledCount === 0}>
                <Download className="mr-1.5 h-4 w-4" />
                Save image
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleDownload(true)} disabled={filledCount === 0 || isRendering}>
                <Share2 className="mr-1.5 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-xl text-center text-caption text-text-secondary">
            Your team saves on this device automatically. Change formation anytime, your players move with it.
          </p>
        </>
      )}

      <Modal
        isOpen={!!activeSlot}
        onClose={() => {
          setActiveSlot(null);
          setSearch("");
        }}
        title={activePlayer ? activePlayer.name : "Choose a player"}
      >
        {activePlayer && activeSlot && (
          <div className="mb-4 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setCaptainId(activePlayer.id === captainId ? null : activePlayer.id);
                setActiveSlot(null);
              }}
            >
              <Crown className="mr-1.5 h-4 w-4" />
              {activePlayer.id === captainId ? "Remove captain" : "Make captain"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearSlot(activeSlot);
                setActiveSlot(null);
              }}
            >
              <X className="mr-1.5 h-4 w-4" />
              Remove
            </Button>
          </div>
        )}
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search players…"
          className="mb-4"
        />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {filteredPlayers.length === 0 ? (
            <p className="py-6 text-center text-small text-text-secondary">No players found.</p>
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
                    <img
                      loading="lazy"
                      decoding="async"
                      src={getThumbnailUrl(player.photoUrl, 240)}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  )}
                </div>
                <span className="text-small text-text">{player.name}</span>
                <span className="ml-auto text-caption text-text-secondary">{player.position}</span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
