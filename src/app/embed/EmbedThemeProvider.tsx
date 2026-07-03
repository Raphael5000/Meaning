"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ThemeContext } from "@/components/ThemeProvider";

type ResolvedTheme = "light" | "dark";

function getInitialTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  const param = new URLSearchParams(window.location.search).get("theme");
  if (param === "dark" || param === "light") return param;
  return "light";
}

/**
 * Lightweight theme provider for the embed iframe.
 * Reads initial theme from ?theme= URL param, listens for postMessage
 * changes from the host portal, and provides the same ThemeContext that
 * ChartRenderer expects via useTheme().
 *
 * Also guards against the root ThemeProvider overwriting the class
 * via a MutationObserver.
 */
export function EmbedThemeProvider({ children }: { children: React.ReactNode }) {
  const [resolved, setResolved] = useState<ResolvedTheme>(getInitialTheme);
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  // Apply theme class synchronously before paint
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  useEffect(() => {
    // Listen for postMessage theme changes from host portal
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "theme") {
        setResolved(e.data.value as ResolvedTheme);
      }
    }
    window.addEventListener("message", onMessage);

    // Guard: if the root ThemeProvider or anything else mutates the class,
    // force it back to the embed's theme
    const observer = new MutationObserver(() => {
      const hasDark = document.documentElement.classList.contains("dark");
      const wantDark = resolvedRef.current === "dark";
      if (hasDark !== wantDark) {
        document.documentElement.classList.toggle("dark", wantDark);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("message", onMessage);
      observer.disconnect();
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: resolved, resolvedTheme: resolved, setTheme: (t) => setResolved(t as ResolvedTheme) }}>
      {children}
    </ThemeContext.Provider>
  );
}
