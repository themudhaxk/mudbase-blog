import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090c",
          900: "#0d0f14",
          800: "#14171f",
          700: "#1d212c",
          600: "#2a2f3d",
          500: "#454b5c",
          400: "#6b7280",
          300: "#9aa1b0",
          200: "#c9cdd6",
          100: "#eef0f4",
          50: "#f7f8fa",
        },
        mud: {
          600: "#3457d5",
          500: "#4568e8",
          400: "#6b85ef",
          300: "#9caefb",
          200: "#c9d3fd",
        },
        clay: {
          600: "#a8442a",
          500: "#d97757",
          400: "#e59273",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      typography: () => ({
        DEFAULT: {
          css: {
            maxWidth: "none",
          },
        },
      }),
    },
  },
  plugins: [],
};

export default config;
