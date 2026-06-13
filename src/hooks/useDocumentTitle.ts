import { useEffect } from "react";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    const suffix = "Treckin";
    if (title) {
      document.title = `${title} · ${suffix}`;
    } else {
      document.title = suffix;
    }
  }, [title]);
}
