/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",        // toggle via <html class="dark">
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ─── Colors ─── */
      colors: {
        /* App shell — CSS var driven for dark mode */
        canvas:          "var(--color-canvas)",
        surface:         "var(--color-surface)",
        "surface-raised":"var(--color-surface-raised)",

        /* Primary — Dropbox Blue */
        primary: {
          DEFAULT: "var(--color-primary)",
          hover:   "var(--color-primary-hover)",
          muted:   "var(--color-primary-muted)",
          border:  "var(--color-primary-border)",
          text:    "var(--color-primary-text)",
        },

        /* Text scale */
        "ink-1": "var(--color-ink-1)",
        "ink-2": "var(--color-ink-2)",
        "ink-3": "var(--color-ink-3)",
        "ink-4": "var(--color-ink-4)",

        /* Border scale */
        "border-1": "var(--color-border-1)",
        "border-2": "var(--color-border-2)",
        "border-3": "var(--color-border-3)",

        /* Semantic */
        success: {
          DEFAULT: "var(--color-success)",
          bg:      "var(--color-success-bg)",
          border:  "var(--color-success-border)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          bg:      "var(--color-warning-bg)",
          border:  "var(--color-warning-border)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          bg:      "var(--color-danger-bg)",
          border:  "var(--color-danger-border)",
        },

        /* Static neutrals */
        neutral: {
          50:  "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#0d1117",
        },
      },

      /* ─── Typography ─── */
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      fontSize: {
        "xs":        ["0.75rem",   { lineHeight: "1rem" }],
        "sm":        ["0.8125rem", { lineHeight: "1.25rem" }],
        "base":      ["0.875rem",  { lineHeight: "1.375rem" }],
        "md":        ["0.9375rem", { lineHeight: "1.5rem" }],
        "lg":        ["1rem",      { lineHeight: "1.5rem" }],
        "xl":        ["1.125rem",  { lineHeight: "1.625rem" }],
        "2xl":       ["1.25rem",   { lineHeight: "1.75rem" }],
        "3xl":       ["1.5rem",    { lineHeight: "2rem" }],
        /* Design system scale */
        "page-title":    ["1.375rem", { lineHeight: "1.875rem", fontWeight: "600" }],
        "section-title": ["1.0625rem", { lineHeight: "1.625rem", fontWeight: "600" }],
        "card-title":    ["0.9375rem", { lineHeight: "1.5rem",   fontWeight: "600" }],
        "body":          ["0.875rem", { lineHeight: "1.5rem",    fontWeight: "400" }],
        "body-sm":       ["0.8125rem",{ lineHeight: "1.375rem",  fontWeight: "400" }],
        "caption":       ["0.75rem",  { lineHeight: "1.1rem",    fontWeight: "500" }],
        "overline":      ["0.6875rem",{ lineHeight: "1rem",      fontWeight: "600" }],
        "form-label":    ["0.8125rem",{ lineHeight: "1.375rem",  fontWeight: "600" }],
      },
      fontWeight: {
        normal:   "400",
        medium:   "500",
        semibold: "600",
        bold:     "700",
      },

      /* ─── Border radii — Dropbox product shapes ─── */
      borderRadius: {
        none:    "0",
        sm:      "6px",
        DEFAULT: "8px",   /* inputs */
        md:      "12px",  /* buttons */
        lg:      "16px",  /* cards */
        xl:      "20px",  /* large panels / modals */
        "2xl":   "24px",
        full:    "9999px",
      },

      /* ─── Shadows — minimal, border-first ─── */
      boxShadow: {
        none:    "none",
        xs:      "0 1px 2px rgba(0,0,0,0.05)",
        sm:      "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        md:      "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
        lg:      "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)",
        modal:   "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
        focus:   "0 0 0 3px rgba(0,97,254,0.25)",
      },

      /* ─── Spacing — functional ─── */
      spacing: {
        px:        "1px",
        0:         "0",
        1:         "0.25rem",
        1.5:       "0.375rem",
        2:         "0.5rem",
        2.5:       "0.625rem",
        3:         "0.75rem",
        3.5:       "0.875rem",
        4:         "1rem",
        5:         "1.25rem",
        6:         "1.5rem",
        7:         "1.75rem",
        8:         "2rem",
        9:         "2.25rem",
        10:        "2.5rem",
        12:        "3rem",
        14:        "3.5rem",
        16:        "4rem",
        20:        "5rem",
        24:        "6rem",
        sidebar:   "220px",
        "bottom-nav": "64px",   /* mobile bottom nav height */
        "safe-b":  "env(safe-area-inset-bottom, 0px)",
      },

      /* ─── Layout ─── */
      width:     { sidebar: "220px" },
      height:    { "bottom-nav": "64px", header: "52px" },
      minHeight: { touch: "44px" },    /* WCAG 2.5.5 min touch target */
      minWidth:  { touch: "44px" },

      /* ─── Transitions ─── */
      transitionDuration: {
        75:  "75ms",
        100: "100ms",
        150: "150ms",
        200: "200ms",
        fast: "160ms",
        normal: "260ms",
        300: "300ms",
        slow: "420ms",
      },
      transitionTimingFunction: {
        "ease-spring": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-out":    "cubic-bezier(0.2, 0.8, 0.2, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      /* ─── Keyframes ─── */
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%":   { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%":   { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "modal-scale-in": {
          "0%":   { opacity: "0", transform: "translate(-50%, -50%) scale(0.95)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "modal-scale-out": {
          "0%":   { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          "100%": { opacity: "0", transform: "translate(-50%, -50%) scale(0.95)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "spin": {
          "to": { transform: "rotate(360deg)" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0)" },
          "40%":           { transform: "scale(1)" },
        },
        "tab-indicator": {
          "0%":   { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-in":       "fade-in 260ms cubic-bezier(0.2,0.8,0.2,1) both",
        "fade-out":      "fade-out 150ms cubic-bezier(0.4,0,1,1) both",
        "fade-in-up":    "fade-in-up 420ms cubic-bezier(0.2,0.8,0.2,1) both",
        "fade-in-down":  "fade-in-down 320ms cubic-bezier(0.2,0.8,0.2,1) both",
        "scale-in":      "scale-in 320ms cubic-bezier(0.16,1,0.3,1) both",
        "modal-scale-in":"modal-scale-in 320ms cubic-bezier(0.16,1,0.3,1) both",
        "modal-scale-out":"modal-scale-out 150ms cubic-bezier(0.4,0,1,1) both",
        "slide-up":      "slide-up 420ms cubic-bezier(0.2,0.8,0.2,1) both",
        "slide-in-right":"slide-in-right 320ms cubic-bezier(0.2,0.8,0.2,1) both",
        "shimmer":       "shimmer 1.6s linear infinite",
        "spin":          "spin 1.1s linear infinite",
        "spin-slow":     "spin 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};
