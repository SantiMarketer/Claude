import { useEffect } from "react";
import type { ThemePref } from "../types";

/** Aplica el tema (claro/oscuro/sistema) a <html class="dark">. */
export function useTheme(pref: ThemePref) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = pref === "dark" || (pref === "system" && media.matches);
      root.classList.toggle("dark", dark);
    };

    apply();
    if (pref === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [pref]);
}
