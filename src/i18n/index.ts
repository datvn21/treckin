import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "./locales/vi.json";
import en from "./locales/en.json";

const SUPPORTED_LANGS = ["vi", "en"];

function getInitialLang(): string {
  if (typeof window === "undefined") return "vi";
  try {
    const item = localStorage.getItem("treckin-theme");
    if (item) {
      const parsed = JSON.parse(item);
      const savedLang = parsed?.state?.lang;
      if (savedLang && SUPPORTED_LANGS.includes(savedLang)) {
        return savedLang;
      }
    }
  } catch {
    // fallback
  }
  return "vi";
}

const initialLang = getInitialLang();

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: "vi",
  supportedLngs: SUPPORTED_LANGS,
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
});

export default i18n;

