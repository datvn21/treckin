import * as React from "react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, X, Check, Languages } from "lucide-react";

export interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean; // compact = show VI/EN only, false = show full names in pills mode
  variant?: "pills" | "dropdown";
}

const LANGUAGES = [
  {
    value: "vi",
    label: "Vietnamese",
    nativeName: "Tiếng Việt",
    searchKey: "tieng viet vietnamese vi",
  },
  { value: "en", label: "English", nativeName: "English", searchKey: "english en" },
  { value: "ja", label: "Japanese", nativeName: "日本語", searchKey: "japanese nihongo ja" },
  { value: "ko", label: "Korean", nativeName: "한국어", searchKey: "korean ko" },
  { value: "zh", label: "Chinese", nativeName: "中文", searchKey: "chinese zh" },
  { value: "fr", label: "French", nativeName: "Français", searchKey: "french fr" },
  { value: "es", label: "Spanish", nativeName: "Español", searchKey: "spanish es" },
  { value: "de", label: "German", nativeName: "Deutsch", searchKey: "german de" },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  compact = true,
  variant = "pills",
}) => {
  const { lang, setLang } = useThemeStore();
  const { i18n } = useTranslation();

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const setLanguage = (next: string) => {
    setLang(next);
    i18n.changeLanguage(next);
    setIsOpen(false);
    setSearchQuery("");
  };

  const filteredLanguages = LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.searchKey.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentLangObj = LANGUAGES.find((l) => l.value === lang) || {
    value: "vi",
    label: "Vietnamese",
    nativeName: "Tiếng Việt",
    searchKey: "tieng viet",
  };

  if (variant === "dropdown") {
    return (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex items-center justify-between w-full rounded-md border border-border-1 bg-surface px-3 py-2 text-sm font-medium text-ink-1 min-h-[44px]",
            "hover:border-border-2 hover:bg-surface-raised transition-all duration-100 outline-none",
            isOpen && "border-primary ring-2 ring-primary/20",
          )}
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            <Languages size={15} className="text-ink-3" />
            <span>{currentLangObj.nativeName}</span>
          </span>
          <ChevronDown
            size={14}
            className={cn("text-ink-4 transition-transform duration-150", isOpen && "rotate-180")}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 min-w-[200px] card-elevated p-2 animate-scale-in origin-top-left max-h-[300px] overflow-hidden flex flex-col">
            <div className="relative flex items-center mb-1.5 shrink-0">
              <Search size={14} className="absolute left-2.5 text-ink-4" />
              <input
                type="text"
                placeholder="Tìm kiếm ngôn ngữ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-raised text-sm text-ink-1 placeholder:text-ink-4 rounded px-8 py-1.5 border border-border-1 focus:border-primary focus:bg-surface outline-none transition-all duration-100"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-0.5 text-ink-4 hover:text-ink-2 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 space-y-0.5 max-h-[200px] no-scrollbar">
              {filteredLanguages.length === 0 ? (
                <p className="px-3 py-4 text-xs text-ink-4 text-center">Không tìm thấy ngôn ngữ</p>
              ) : (
                filteredLanguages.map((l) => {
                  const isSelected = l.value === lang;
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLanguage(l.value)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-sm rounded transition-all duration-100 text-left",
                        isSelected
                          ? "text-primary font-semibold bg-primary-muted/20"
                          : "text-ink-2 hover:text-ink-1 hover:bg-surface-raised",
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{l.nativeName}</span>
                        {l.label !== l.nativeName && (
                          <span className="text-[10px] text-ink-4 font-normal">{l.label}</span>
                        )}
                      </span>
                      {isSelected && <Check size={14} className="text-primary shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pills variant (default)
  const pillsOptions = [
    { value: "vi", label: "Tiếng Việt", short: "VI" },
    { value: "en", label: "English", short: "EN" },
  ];

  return (
    <div className={cn("tab-pills", className)} role="group" aria-label="Chọn ngôn ngữ">
      {pillsOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLanguage(opt.value)}
          className={cn("tab-pill", lang === opt.value && "active")}
          aria-pressed={lang === opt.value}
          aria-label={opt.label}
        >
          {compact ? opt.short : opt.label}
        </button>
      ))}
    </div>
  );
};

LanguageSwitcher.displayName = "LanguageSwitcher";

export { LanguageSwitcher };
