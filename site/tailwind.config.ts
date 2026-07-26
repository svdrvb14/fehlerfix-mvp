import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2B2B2E",
        coral: {
          DEFAULT: "#FD6D68",
          light: "#F7E1DC",
        },
        blue: {
          DEFAULT: "#5C82D6",
          light: "#DCE7F6",
        },
        green: {
          DEFAULT: "#8ED19C",
        },
      },
      fontFamily: {
        poppins: ["var(--font-poppins)"],
        sans: [
          "var(--font-poppins)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scroll-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.8s ease-out forwards",
        "scroll-left": "scroll-left 32s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
