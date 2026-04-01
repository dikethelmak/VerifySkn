import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b1e0f",
        surface:    "#0f2614",
        primary:    "#1A3C2E",
        accent:     "#C9A84C",
        lime:       "#7dc98a",
        success:    "#7dc98a",
        warning:    "#E07B2A",
        danger:     "#C0392B",
        "text-primary":   "#eeecea",
        "text-secondary": "rgba(238,236,234,0.5)",
        border:     "rgba(255,255,255,0.09)",
      },
      fontFamily: {
        rethink:  ["var(--font-rethink)",  "system-ui", "sans-serif"],
        fraunces: ["var(--font-fraunces)", "Georgia",   "serif"],
        mono:     ["var(--font-mono)",     "monospace"],
        syne:     ["var(--font-syne)",     "system-ui", "sans-serif"],
        "dm-mono": ["var(--font-dm-mono)", "monospace"],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
