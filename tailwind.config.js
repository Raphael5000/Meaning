/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border-color)",
        input: "var(--border-color)",
        ring: "var(--accent)",
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        soft: "var(--text-secondary)",
        "user-bubble": "var(--user-bubble)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--error)",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--bg-tertiary)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--bg-hover)",
          foreground: "var(--text-primary)",
        },
        popover: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        // v2 token aliases — consumed by components inside `.meaning-v2` scope
        "v2-bg": "var(--v2-bg)",
        "v2-surface": "var(--v2-surface)",
        "v2-surface-2": "var(--v2-surface-2)",
        "v2-surface-3": "var(--v2-surface-3)",
        "v2-line": "var(--v2-line)",
        "v2-line-strong": "var(--v2-line-strong)",
        "v2-ink": "var(--v2-ink)",
        "v2-ink-muted": "var(--v2-ink-muted)",
        "v2-ink-subtle": "var(--v2-ink-subtle)",
        "v2-ink-inverse": "var(--v2-ink-inverse)",
        "v2-brand": "var(--v2-brand)",
        "v2-brand-ink": "var(--v2-brand-ink)",
        "v2-brand-vivid": "var(--v2-brand-vivid)",
        "v2-brand-bg": "var(--v2-brand-bg)",
        "v2-on-brand": "var(--v2-on-brand)",
        "v2-pos": "var(--v2-pos)",
        "v2-pos-bg": "var(--v2-pos-bg)",
        "v2-neg": "var(--v2-neg)",
        "v2-neg-bg": "var(--v2-neg-bg)",
        "v2-info": "var(--v2-info)",
        "v2-info-bg": "var(--v2-info-bg)",
        "v2-warn": "var(--v2-warn)",
        "v2-warn-bg": "var(--v2-warn-bg)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
