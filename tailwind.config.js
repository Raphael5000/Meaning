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
        // shadcn semantic tokens. Each one points at a CSS var that has
        // two definitions:
        //   - :root (in globals.css) — aliased to v1 vars so v1 marketing
        //     and v1 app pages render with their existing palette.
        //   - .meaning-v2 (in tokens-v2.css) — design's OKLCH palette.
        //
        // Same Tailwind class (`bg-card`, `text-foreground`, etc.) renders
        // correctly in both scopes.
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        soft: "var(--text-secondary)",
        "user-bubble": "var(--user-bubble)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        // shadcn calls this `accent`; we use `--accent-color` for the var
        // because v1 already binds `--accent` to the brand green (Hivory).
        // Renaming v1's `--accent` would ripple across the codebase, so we
        // sidestep with a fresh var here.
        accent: {
          DEFAULT: "var(--accent-color)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // Chart palette — points at --chart-1..5. Inside .meaning-v2 these
        // use the design's reordered palette; outside they fall through to
        // values defined as needed.
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
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
