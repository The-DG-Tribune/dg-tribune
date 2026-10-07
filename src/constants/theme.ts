/**
 * DG Tribune Design System - Document 02 (Complete Design System)
 * Single source of truth for design tokens used outside Tailwind classes
 * (e.g. inline styles, Framer Motion variants, chart libraries).
 */

export const colors = {
  background: "#0B0F19",
  backgroundSecondary: "#151B28",
  surface: "#1D2433",
  accent: "#00E676",
  accentSecondary: "#3B82F6",
  danger: "#EF4444",
  warning: "#F59E0B",
  text: "#FFFFFF",
  textSecondary: "#AAB4C8",
  border: "#273142",
  divider: "rgba(255,255,255,0.06)",
} as const;

export const fonts = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
} as const;

export const spacing = {
  1: 4,
  2: 8,
  4: 16,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  button: 12,
  input: 12,
  card: 16,
  image: 18,
  modal: 20,
  container: 24,
} as const;

export const transitions = {
  button: 0.2,
  card: 0.25,
  page: 0.3,
} as const;

export const layout = {
  maxWidth: 1280,
} as const;

/** Standard fade/scale/slide motion presets - subtle only, per Document 02. */
export const motionPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: transitions.page },
  },
  fadeSlideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 12 },
    transition: { duration: transitions.page },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
    transition: { duration: transitions.card },
  },
} as const;
