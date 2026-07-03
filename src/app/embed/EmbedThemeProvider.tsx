"use client";

import { useEffect, useState } from "react";
import { ThemeContext } from "@/components/ThemeProvider";

type ResolvedTheme = "light" | "dark";

/**
 * Lightweight theme provider for the embed iframe.
 * Reads initial theme from ?theme= URL param, listens for postMessage
 * changes from the host portal, and provides the same ThemeContext that
 * ChartRenderer expects via useTheme().
 */
export function EmbedThemeProvider({ children }: { children: React.ReactNode }) {
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") return "light";
    return (new URLSearchParams(window.location.search).get("theme") as ResolvedTheme) || "light";
  });

  // Apply theme class to html element
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  // Listen for postMessage theme changes from host portal
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "theme") {
        setResolved(e.data.value as ResolvedTheme);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: resolved, resolvedTheme: resolved, setTheme: (t) => setResolved(t as ResolvedTheme) }}>
      {children}
    </ThemeContext.Provider>
  );
}
