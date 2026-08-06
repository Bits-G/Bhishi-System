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
          50: "#eefdfc",
          100: "#d4f7f5",
          200: "#a9eeeb",
          300: "#72dfdb",
          400: "#3cc7c3",
          500: "#1aa9a8",
          600: "#0f8687",
          700: "#0d6b6e",
          800: "#0c5457",
          900: "#0a3f42",
          950: "#042629",
        },
        ink: {
          900: "#0b1220",
          800: "#121a2b",
          700: "#1b2438",
        },
      },
      boxShadow: {
        soft: "0 8px 30px -8px rgba(10, 63, 66, 0.25)",
        card: "0 4px 20px -4px rgba(10, 63, 66, 0.15)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
