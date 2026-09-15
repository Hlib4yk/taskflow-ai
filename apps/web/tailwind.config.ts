import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f5ff",
          100: "#e6ecff",
          500: "#5b6ee8",
          600: "#4453d1",
          700: "#3641a8",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
