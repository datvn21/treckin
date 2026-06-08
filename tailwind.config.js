/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ─── Color Palette (Dropbox-inspired, warm neutral) ─── */
      colors: {
        /* Base surfaces */
        base:       "#f7f5f2",
        surface:    "#ffffff",

        /* Primary action */
        primary: {
          DEFAULT:  "#0061fe",
          hover:    "#0044af",
          focus:    "#428bff",
        },

        /* Text hierarchy */
        "text-dark":  "#1e1919",
        "text-muted": "#524a3e",

        /* Semantic states */
        success: {
          DEFAULT:    "#00a870",
          foreground: "#ffffff",
          bg:         "#e6f7f1",
        },
        warning: {
          DEFAULT:    "#f5a623",
          foreground: "#1e1919",
          bg:         "#fff8eb",
        },
        danger: {
          DEFAULT:    "#e5484d",
          foreground: "#ffffff",
          bg:         "#ffeef0",
        },

        /* Neutral scale (for borders, disabled states, dividers) */
        neutral: {
          100: "#f7f5f2",
          200: "#ede9e3",
          300: "#d6d0c8",
          400: "#b8b0a4",
          500: "#8c8377",
          600: "#6b6359",
          700: "#524a3e",
          800: "#3b342a",
          900: "#1e1919",
        },
      },

      /* ─── Typography ─── */
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        ui:      ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        /* Display / hero */
        "display-lg": ["2.25rem", { lineHeight: "2.75rem", fontWeight: "800" }],
        "display-sm": ["1.875rem", { lineHeight: "2.375rem", fontWeight: "700" }],
        /* Headings */
        "heading-1":  ["1.5rem",   { lineHeight: "2rem",    fontWeight: "700" }],
        "heading-2":  ["1.25rem",  { lineHeight: "1.75rem", fontWeight: "600" }],
        "heading-3":  ["1.125rem", { lineHeight: "1.5rem",  fontWeight: "600" }],
        /* Body */
        "body-lg":    ["1rem",     { lineHeight: "1.5rem",  fontWeight: "400" }],
        "body-md":    ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        "body-sm":    ["0.75rem",  { lineHeight: "1rem",    fontWeight: "400" }],
        /* Mono data (Student IDs, timers) */
        "data-lg":    ["1.125rem", { lineHeight: "1.5rem",  fontWeight: "600" }],
        "data-md":    ["0.875rem", { lineHeight: "1.25rem", fontWeight: "500" }],
      },

      /* ─── Border Radii ─── */
      borderRadius: {
        btn:    "12px",
        card:   "16px",
        avatar: "16px",
        full:   "9999px",
      },

      /* ─── Shadows (Soft, physical-depth tickets) ─── */
      boxShadow: {
        "ticket":    "0px 16px 32px 0px rgba(0, 0, 0, 0.10)",
        "ticket-sm": "0px 8px 16px 0px rgba(0, 0, 0, 0.08)",
        "elevated":  "0px 4px 12px 0px rgba(0, 0, 0, 0.06)",
        "focus":     "0 0 0 3px #428bff",
      },

      /* ─── Touch Targets ─── */
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },

      /* ─── Spacing Tokens ─── */
      spacing: {
        "4.5": "1.125rem",
        "18":  "4.5rem",
      },

      /* ─── Transitions ─── */
      transitionDuration: {
        fast:   "120ms",
        normal: "200ms",
        slow:   "350ms",
      },

      /* ─── Keyframe Animations ─── */
      keyframes: {
        "scan-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
        "slide-up": {
          "0%":   { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "qr-refresh": {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(0.96)", opacity: "0.7" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "scan-pulse": "scan-pulse 2s ease-in-out infinite",
        "slide-up":   "slide-up 0.35s ease-out",
        "fade-in":    "fade-in 0.2s ease-out",
        "qr-refresh": "qr-refresh 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
};
