/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0B0F19", // Primary Background
          secondary: "#151B28", // Secondary Background
        },
        surface: "#1D2433",
        accent: {
          DEFAULT: "#00E676", // Primary Accent
          secondary: "#3B82F6", // Secondary Accent
        },
        danger: "#EF4444",
        warning: "#F59E0B",
        text: {
          DEFAULT: "#FFFFFF", // Primary Text
          secondary: "#AAB4C8", // Secondary Text
        },
        border: {
          DEFAULT: "#273142",
        },
        divider: "rgba(255,255,255,0.06)",
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      fontSize: {
        hero: ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        "page-title": ["36px", { lineHeight: "1.15", fontWeight: "700" }],
        "section-title": ["28px", { lineHeight: "1.2", fontWeight: "600" }],
        "card-title": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        small: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      spacing: {
        1: "4px",
        2: "8px",
        4: "16px",
        6: "24px",
        8: "32px",
        10: "40px",
        12: "48px",
        16: "64px",
        20: "80px",
        24: "96px",
      },
      borderRadius: {
        button: "12px",
        input: "12px",
        card: "16px",
        image: "18px",
        modal: "20px",
        container: "24px",
      },
      maxWidth: {
        layout: "1280px",
      },
      transitionDuration: {
        button: "200ms",
        card: "250ms",
        page: "300ms",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(0,230,118,0.35)",
        "glow-lg": "0 0 80px -12px rgba(0,230,118,0.4)",
        glass: "0 8px 32px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        mesh:
          "radial-gradient(at 15% 10%, rgba(0,230,118,0.20) 0px, transparent 50%), radial-gradient(at 85% 25%, rgba(59,130,246,0.18) 0px, transparent 50%), radial-gradient(at 50% 90%, rgba(0,230,118,0.10) 0px, transparent 50%)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
