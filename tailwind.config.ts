import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { ink: "#0D0B1E", plum: "#1B1636", violet: "#8B7CFF", peach: "#FFB27A", live: "#7CF5C8" },
    fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-body)", "sans-serif"] } } },
} satisfies Config;
