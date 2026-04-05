import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        catalog:
          "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)",
        "catalog-lg":
          "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 10px 15px -3px rgb(15 23 42 / 0.06)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        /** Cool neutrals + single blue accent */
        catalog: {
          canvas: "#f8fafc",
          surface: "#ffffff",
          panel: "#ffffff",
          raised: "#f1f5f9",
          border: "#e2e8f0",
          line: "#cbd5e1",
          muted: "#64748b",
          ink: "#0f172a",
          accent: "#2563eb",
          "accent-hover": "#1d4ed8",
          "accent-muted": "#dbeafe",
          "accent-2": "#475569",
          "accent-2-hover": "#334155",
          "accent-2-muted": "#f1f5f9",
          highlight: "#0f172a",
          success: "#15803d",
          warning: "#c2410c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
