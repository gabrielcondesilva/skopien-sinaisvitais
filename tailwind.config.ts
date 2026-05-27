import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Backward-compat aliases (existing components) ── */
        background:  "var(--background)",
        foreground:  "var(--foreground)",
        surface:     "var(--surface)",
        border:      "var(--border)",
        muted:       "var(--muted)",
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        status: {
          stable:    "var(--status-stable)",
          attention: "var(--status-attention)",
          elevated:  "var(--status-elevated)",
          critical:  "var(--status-critical)",
        },

        /* ── Design System canonical tokens ── */
        sk: {
          base:    "var(--sk-base)",
          s1:      "var(--sk-s1)",
          s2:      "var(--sk-s2)",
          sidebar: "var(--sk-sidebar)",

          "b-subtle":  "var(--sk-b-subtle)",
          "b-default": "var(--sk-b-default)",

          "text-primary":   "var(--sk-text-primary)",
          "text-secondary": "var(--sk-text-secondary)",
          "text-muted":     "var(--sk-text-muted)",
          "text-disabled":  "var(--sk-text-disabled)",

          accent:   "var(--sk-accent)",
          "accent-h": "var(--sk-accent-h)",
          "accent-m": "var(--sk-accent-m)",

          crit:      "var(--sk-crit)",
          high:      "var(--sk-high)",
          warn:      "var(--sk-warn)",
          stable:    "var(--sk-stable)",
          allergy:   "var(--sk-allergy)",
          discharge: "var(--sk-discharge)",

          "data-real":     "var(--sk-data-real)",
          "data-forecast": "var(--sk-data-forecast)",
          "data-target":   "var(--sk-data-target)",
        },
      },

      fontFamily: {
        sans: ["var(--font-segoe)", "system-ui", "-apple-system", "Helvetica Neue", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },

      fontSize: {
        "sk-xs":   ["11px", { lineHeight: "1.4" }],
        "sk-sm":   ["13px", { lineHeight: "1.4" }],
        "sk-base": ["14px", { lineHeight: "1.55" }],
        "sk-md":   ["15px", { lineHeight: "1.55" }],
        "sk-lg":   ["18px", { lineHeight: "1.4" }],
        "sk-xl":   ["24px", { lineHeight: "1.2" }],
        "sk-2xl":  ["32px", { lineHeight: "1.2" }],
        "sk-3xl":  ["40px", { lineHeight: "1.2" }],
      },

      borderRadius: {
        "sk-sm":   "4px",
        "sk-md":   "8px",
        "sk-lg":   "12px",
        "sk-pill": "9999px",
      },

      spacing: {
        "sk-1":  "4px",
        "sk-2":  "8px",
        "sk-3":  "12px",
        "sk-4":  "16px",
        "sk-5":  "20px",
        "sk-6":  "24px",
        "sk-8":  "32px",
        "sk-10": "40px",
        "sk-12": "48px",
        "sk-16": "64px",
      },

      boxShadow: {
        "sk-1": "0 1px 2px rgba(0,0,0,.4)",
        "sk-2": "0 4px 12px rgba(0,0,0,.45)",
        "sk-3": "0 12px 32px rgba(0,0,0,.55)",
      },
    },
  },
  plugins: [],
};

export default config;
