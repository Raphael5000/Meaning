"use client";

import { useEffect } from "react";

function apply(theme: string) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function EmbedThemeEnforcer() {
  useEffect(() => {
    let current =
      new URLSearchParams(window.location.search).get("theme") || "light";
    apply(current);

    // Listen for live theme changes from the host portal
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "theme") {
        current = e.data.value;
        apply(current);
      }
    }
    window.addEventListener("message", onMessage);

    // If ThemeProvider mutates the class, override it back
    const observer = new MutationObserver(() => {
      const hasDark = document.documentElement.classList.contains("dark");
      if ((current === "dark") !== hasDark) apply(current);
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

  return null;
}
