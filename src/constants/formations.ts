export interface FormationSlot {
  id: string;
  label: string;
  top: number; // percentage from top of pitch
  left: number; // percentage from left of pitch
}

export interface Formation {
  name: string;
  slots: FormationSlot[];
}

export const FORMATIONS: Record<string, Formation> = {
  "4-3-3": {
    name: "4-3-3",
    slots: [
      { id: "gk", label: "GK", top: 92, left: 50 },
      { id: "lb", label: "LB", top: 72, left: 15 },
      { id: "cb1", label: "CB", top: 76, left: 38 },
      { id: "cb2", label: "CB", top: 76, left: 62 },
      { id: "rb", label: "RB", top: 72, left: 85 },
      { id: "cm1", label: "CM", top: 50, left: 28 },
      { id: "cm2", label: "CM", top: 54, left: 50 },
      { id: "cm3", label: "CM", top: 50, left: 72 },
      { id: "lw", label: "LW", top: 20, left: 18 },
      { id: "st", label: "ST", top: 12, left: 50 },
      { id: "rw", label: "RW", top: 20, left: 82 },
    ],
  },
  "4-4-2": {
    name: "4-4-2",
    slots: [
      { id: "gk", label: "GK", top: 92, left: 50 },
      { id: "lb", label: "LB", top: 72, left: 12 },
      { id: "cb1", label: "CB", top: 76, left: 35 },
      { id: "cb2", label: "CB", top: 76, left: 65 },
      { id: "rb", label: "RB", top: 72, left: 88 },
      { id: "lm", label: "LM", top: 46, left: 15 },
      { id: "cm1", label: "CM", top: 50, left: 38 },
      { id: "cm2", label: "CM", top: 50, left: 62 },
      { id: "rm", label: "RM", top: 46, left: 85 },
      { id: "st1", label: "ST", top: 15, left: 38 },
      { id: "st2", label: "ST", top: 15, left: 62 },
    ],
  },
  "3-5-2": {
    name: "3-5-2",
    slots: [
      { id: "gk", label: "GK", top: 92, left: 50 },
      { id: "cb1", label: "CB", top: 76, left: 30 },
      { id: "cb2", label: "CB", top: 80, left: 50 },
      { id: "cb3", label: "CB", top: 76, left: 70 },
      { id: "lm", label: "LM", top: 46, left: 10 },
      { id: "cm1", label: "CM", top: 52, left: 32 },
      { id: "cm2", label: "CM", top: 55, left: 50 },
      { id: "cm3", label: "CM", top: 52, left: 68 },
      { id: "rm", label: "RM", top: 46, left: 90 },
      { id: "st1", label: "ST", top: 15, left: 38 },
      { id: "st2", label: "ST", top: 15, left: 62 },
    ],
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    slots: [
      { id: "gk", label: "GK", top: 92, left: 50 },
      { id: "lb", label: "LB", top: 72, left: 12 },
      { id: "cb1", label: "CB", top: 76, left: 35 },
      { id: "cb2", label: "CB", top: 76, left: 65 },
      { id: "rb", label: "RB", top: 72, left: 88 },
      { id: "cdm1", label: "CDM", top: 56, left: 38 },
      { id: "cdm2", label: "CDM", top: 56, left: 62 },
      { id: "lw", label: "LW", top: 30, left: 20 },
      { id: "cam", label: "CAM", top: 32, left: 50 },
      { id: "rw", label: "RW", top: 30, left: 80 },
      { id: "st", label: "ST", top: 12, left: 50 },
    ],
  },
};

export const FORMATION_OPTIONS = Object.keys(FORMATIONS).map((key) => ({
  label: key,
  value: key,
}));
