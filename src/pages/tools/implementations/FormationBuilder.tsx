import { useState } from "react";
import { RotateCcw, Copy, Sparkles } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { FORMATIONS, FORMATION_OPTIONS } from "@/constants/formations";
import { useToast } from "@/context/ToastContext";

/**
 * Formation Builder - a lightweight tactical whiteboard. Unlike Dream
 * Team Builder (which uses real player profiles), this is a quick
 * "sketch a shape and jot down names/numbers" tool - no player
 * database required.
 *
 * Labels are keyed by POSITION LABEL (e.g. "CB", "ST") rather than by
 * slot ID, so switching formations keeps names attached to the same
 * kind of position wherever possible, instead of wiping everything.
 */
export default function FormationBuilder() {
  const { showToast } = useToast();
  const [formationKey, setFormationKey] = useState("4-3-3");
  const [labelsByPosition, setLabelsByPosition] = useState<Record<string, string[]>>({});
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [chemistry] = useState(() => 65 + Math.floor(Math.random() * 30));

  const formation = FORMATIONS[formationKey];

  // Resolve the Nth occurrence of a given position label (e.g. the
  // 2nd "CB") to whatever name was typed for the Nth "CB" in any
  // formation - this is what survives a formation switch.
  function getSlotValue(slotId: string): string {
    const slot = formation.slots.find((s) => s.id === slotId);
    if (!slot) return "";
    const sameLabelSlots = formation.slots.filter((s) => s.label === slot.label);
    const occurrenceIndex = sameLabelSlots.findIndex((s) => s.id === slotId);
    return labelsByPosition[slot.label]?.[occurrenceIndex] ?? "";
  }

  function setSlotValue(slotId: string, value: string) {
    const slot = formation.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const sameLabelSlots = formation.slots.filter((s) => s.label === slot.label);
    const occurrenceIndex = sameLabelSlots.findIndex((s) => s.id === slotId);

    setLabelsByPosition((prev) => {
      const existing = [...(prev[slot.label] ?? [])];
      existing[occurrenceIndex] = value;
      return { ...prev, [slot.label]: existing };
    });
  }

  function reset() {
    setLabelsByPosition({});
    setEditingSlot(null);
  }

  function copyLineup() {
    const lines = formation.slots.map(
      (slot) => `${slot.label}: ${getSlotValue(slot.id) || "-"}`
    );
    const text = `My ${formationKey} lineup (DG Tribune Formation Builder)\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text);
    showToast("Lineup copied - paste it anywhere to share");
  }

  const filledCount = formation.slots.filter((s) => getSlotValue(s.id)).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Dropdown
            value={formationKey}
            onChange={(key) => {
              setFormationKey(key);
              setEditingSlot(null);
            }}
            options={FORMATION_OPTIONS}
            className="w-32"
          />
          <span className="text-small text-text-secondary">
            {filledCount}/11 named
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset
        </Button>
      </div>

      <p className="text-small text-text-secondary mb-4">
        Tap any position to type in a name, number, or note. Switching
        formations keeps matching positions (e.g. your CBs stay put).
      </p>

      <div
        className="relative w-full max-w-xl mx-auto aspect-[3/4] rounded-card overflow-hidden border border-border"
        style={{
          background:
            "repeating-linear-gradient(180deg, #1a4d2e, #1a4d2e 10%, #1f5a35 10%, #1f5a35 20%)",
        }}
      >
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />

        {formation.slots.map((slot) => {
          const value = getSlotValue(slot.id);
          return (
            <div
              key={slot.id}
              style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
            >
              {editingSlot === slot.id ? (
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => setSlotValue(slot.id, e.target.value)}
                  onBlur={() => setEditingSlot(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingSlot(null)}
                  className="h-12 w-24 rounded-full border-2 border-accent bg-surface px-2 text-center text-caption text-text focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingSlot(slot.id)}
                  className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-white/40 bg-surface/90 px-1 text-center text-[11px] font-semibold text-white hover:border-white transition-colors duration-button"
                >
                  <span className="truncate max-w-full">{value || slot.label}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filledCount > 0 && (
        <div className="mt-6 max-w-xl mx-auto rounded-card border border-border bg-surface p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-small text-text">
              Squad chemistry:{" "}
              <span className="font-semibold text-accent">{chemistry}%</span>
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={copyLineup}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy lineup
          </Button>
        </div>
      )}
    </div>
  );
}
