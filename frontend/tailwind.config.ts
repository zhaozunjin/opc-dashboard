import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4d6a7a",
          dark: "#3a5260",
          light: "#6b8a9c",
          50: "#f0f5f7",
          100: "#dce6eb",
          200: "#b8ccd7",
          300: "#8eaabb",
          400: "#6b8a9c",
          500: "#4d6a7a",
          600: "#3a5260",
          700: "#2d404c",
          800: "#1f2d35",
          900: "#141e24",
        },
        surface: {
          DEFAULT: "#fafbfc",
          card: "#ffffff",
          muted: "#f1f3f5",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
