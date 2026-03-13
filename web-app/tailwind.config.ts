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
        background: "#F7F5F2",
        surface: "#FFFFFF",
        primary: "#1A3C2E",
        accent: "#C9A84C",
        success: "#2D7A4F",
        warning: "#E07B2A",
        danger: "#C0392B",
        "text-primary": "#141414",
        "text-secondary": "#6B6B6B",
        border: "#E5E2DD",
      },
      fontFamily: {
        rethink: ["var(--font-rethink)", "system-ui", "sans-serif"],
        fraunces: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
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
