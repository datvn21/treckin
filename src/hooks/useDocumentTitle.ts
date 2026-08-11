import { useEffect } from "react";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    const suffix = "Treckin";
    if (title !== undefined) {
      document.title = title ? `${title} · ${suffix}` : ` · ${suffix}`;
    } else {
      document.title = suffix;
    }
  }, [title]);
}
