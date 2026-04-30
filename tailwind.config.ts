import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#eef5ee",
          100: "#d9e8d7",
          300: "#9fbd9e",
          500: "#5f815e",
          700: "#355a3b",
          900: "#1d3324"
        },
        rice: "#f7f1e4",
        ink: "#2f3430",
        warm: "#fbf8f0"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(47, 52, 48, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
