import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 🦞 MoldTank Ocean/Lobster Theme
        ocean: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        abyss: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        coral: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        shell: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
          950: "#4a044e",
        },
        kelp: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "ocean-gradient": "linear-gradient(180deg, #0c4a6e 0%, #020617 100%)",
        "ocean-mesh": `
          radial-gradient(at 40% 20%, hsla(200, 100%, 30%, 0.15) 0px, transparent 50%),
          radial-gradient(at 80% 0%, hsla(189, 100%, 25%, 0.1) 0px, transparent 50%),
          radial-gradient(at 0% 50%, hsla(355, 100%, 50%, 0.05) 0px, transparent 50%),
          radial-gradient(at 80% 50%, hsla(200, 100%, 30%, 0.1) 0px, transparent 50%),
          radial-gradient(at 0% 100%, hsla(280, 100%, 30%, 0.1) 0px, transparent 50%)
        `,
        "card-gradient": "linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(217, 70, 239, 0.05) 100%)",
        "cta-gradient": "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(14, 165, 233, 0.15)",
        "glow-coral": "0 0 30px rgba(249, 115, 22, 0.2)",
        "glow-shell": "0 0 30px rgba(217, 70, 239, 0.15)",
        card: "0 4px 30px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.1) inset",
        "card-hover": "0 8px 40px rgba(14, 165, 233, 0.15), 0 0 1px rgba(255, 255, 255, 0.15) inset",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "wave": "wave 10s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        wave: {
          "0%": { transform: "translateX(0) translateZ(0) scaleY(1)" },
          "50%": { transform: "translateX(-25%) translateZ(0) scaleY(0.55)" },
          "100%": { transform: "translateX(-50%) translateZ(0) scaleY(1)" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
