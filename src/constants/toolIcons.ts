import {
  Users,
  Layers,
  TrendingUp,
  Trophy,
  BookOpen,
  Calculator,
  Clock,
  Timer,
  DollarSign,
  Hash,
  Shield,
  UserSearch,
  MapPin,
  Target,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/**
 * TOOL_ICONS - Document 03 Tools Platform.
 * Curated so the admin picks from a known-good set rather than
 * typing a raw (and potentially invalid) lucide icon name.
 */
export const TOOL_ICONS: Record<string, LucideIcon> = {
  Users,
  Layers,
  TrendingUp,
  Trophy,
  BookOpen,
  Calculator,
  Clock,
  Timer,
  DollarSign,
  Hash,
  Shield,
  UserSearch,
  MapPin,
  Target,
  Wand2,
};

export const TOOL_ICON_OPTIONS = Object.keys(TOOL_ICONS).map((name) => ({
  label: name,
  value: name,
}));
