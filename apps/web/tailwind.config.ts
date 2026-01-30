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
        // ═══════════════════════════════════════════════════════════
        // MOLDTANK DESIGN SYSTEM - "Deep Luxe" Palette
        // Inspired by Stripe/Superstate: sophisticated, premium, deep
        // ═══════════════════════════════════════════════════════════
        
        // Primary: Deep Ocean Blues (refined, not garish)
        ocean: {
          50: "#f0f7ff",
          100: "#e0efff",
          200: "#b9dfff",
          300: "#7cc4ff",
          400: "#36a5ff",
          500: "#0c85f4",
          600: "#0066d1",
          700: "#0052a9",
          800: "#05458b",
          900: "#0a3a73",
          950: "#071d3b",
        },
        
        // Neutral: Slate-tinted grays for depth
        slate: {
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
        
        // Accent: Warm Coral (signature accent, used sparingly)
        coral: {
          50: "#fff5f2",
          100: "#ffebe4",
          200: "#ffd5c8",
          300: "#ffb39f",
          400: "#ff8566",
          500: "#ff5c38",
          600: "#ed3c16",
          700: "#c62d0d",
          800: "#a32912",
          900: "#872715",
          950: "#4a0f06",
        },
        
        // Success: Emerald (cleaner than kelp)
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        
        // Violet: Premium accent for special elements
        violet: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        
        // Amber: Warning/attention states
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      
      fontFamily: {
        // Syne: Editorial, distinctive display font with character
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        // DM Sans: Clean, modern body text - refined alternative to Inter
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        // JetBrains Mono: Superior code readability
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      
      fontSize: {
        // Refined type scale with better line heights
        "xs": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        "sm": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.005em" }],
        "base": ["1rem", { lineHeight: "1.625rem", letterSpacing: "0" }],
        "lg": ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],
        "xl": ["1.25rem", { lineHeight: "1.875rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
        "5xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.03em" }],
        "6xl": ["3.75rem", { lineHeight: "4.25rem", letterSpacing: "-0.035em" }],
        "7xl": ["4.5rem", { lineHeight: "5rem", letterSpacing: "-0.04em" }],
        "8xl": ["6rem", { lineHeight: "6.5rem", letterSpacing: "-0.04em" }],
      },
      
      spacing: {
        // Extended spacing for generous whitespace (Stripe-like)
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "38": "9.5rem",
      },
      
      backgroundImage: {
        // Refined gradients
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        
        // Hero gradient: subtle, sophisticated
        "hero-gradient": `
          linear-gradient(to bottom, 
            rgba(7, 29, 59, 0.95) 0%, 
            rgba(2, 6, 23, 1) 100%
          )
        `,
        
        // Mesh gradient: premium ambient glow
        "mesh-gradient": `
          radial-gradient(at 20% 30%, rgba(12, 133, 244, 0.08) 0px, transparent 50%),
          radial-gradient(at 80% 20%, rgba(139, 92, 246, 0.06) 0px, transparent 50%),
          radial-gradient(at 50% 80%, rgba(255, 92, 56, 0.04) 0px, transparent 50%)
        `,
        
        // Card highlight gradient
        "card-highlight": "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%)",
        
        // CTA gradient
        "cta-gradient": "linear-gradient(135deg, #ff5c38 0%, #ed3c16 100%)",
        
        // Premium shimmer
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
      
      boxShadow: {
        // Refined shadows: softer, more natural
        "soft": "0 2px 8px -2px rgba(0, 0, 0, 0.15), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        "medium": "0 4px 16px -4px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        "large": "0 8px 32px -8px rgba(0, 0, 0, 0.3), 0 4px 8px -4px rgba(0, 0, 0, 0.15)",
        "xl": "0 16px 48px -12px rgba(0, 0, 0, 0.4), 0 8px 16px -8px rgba(0, 0, 0, 0.2)",
        
        // Glow effects: subtle, premium
        "glow-sm": "0 0 16px -4px rgba(12, 133, 244, 0.15)",
        "glow": "0 0 24px -4px rgba(12, 133, 244, 0.2)",
        "glow-lg": "0 0 40px -8px rgba(12, 133, 244, 0.25)",
        "glow-coral": "0 0 32px -8px rgba(255, 92, 56, 0.3)",
        "glow-violet": "0 0 32px -8px rgba(139, 92, 246, 0.25)",
        
        // Card shadows
        "card": "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.02)",
        "card-hover": "0 8px 24px -8px rgba(0, 0, 0, 0.3), 0 4px 8px -4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        
        // Button shadows
        "btn": "0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        "btn-hover": "0 4px 12px -2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      },
      
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "fade-in-down": "fadeInDown 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "float": "float 6s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin 8s linear infinite",
        "gradient": "gradient 8s ease infinite",
      },
      
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-expo": "cubic-bezier(0.7, 0, 0.84, 0)",
        "bounce-out": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      
      transitionDuration: {
        "400": "400ms",
        "600": "600ms",
      },
    },
  },
  plugins: [],
};

export default config;
