import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";
type Lang = string;

interface ThemeStore {
  theme: Theme;
  lang: Lang;
  setTheme: (theme: Theme) => void;
  setLang: (lang: Lang) => void;
  resolvedTheme: () => "light" | "dark";
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "system",
      lang: "vi",

      setTheme(theme) {
        set({ theme });
        applyTheme(theme);
      },

      setLang(lang) {
        set({ lang });
        document.documentElement.lang = lang;
      },

      resolvedTheme() {
        const { theme } = get();
        return theme === "system" ? getSystemTheme() : theme;
      },
    }),
    {
      name: "treckin-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

// Listen for OS theme changes when in "system" mode
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const { theme } = useThemeStore.getState();
    if (theme === "system") applyTheme("system");
  });
}
