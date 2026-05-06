import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0d",
        paper: "#fafaf7",
        accent: "#c8a25b",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
