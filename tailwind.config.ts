import type { Config } from "tailwindcss";

/**
 * Semantic colour token.
 *
 * The CSS variables hold space-separated RGB channels (see globals.css) so
 * Tailwind can still apply opacity modifiers — `bg-canvas/80`, `text-danger`,
 * `border-hairline` all work, and each resolves differently under `.dark`.
 */
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        usdc: "#2775ca",

        // ── Theme-aware tokens ───────────────────────────────────────────
        // Surfaces, ordered from the page background upwards.
        canvas:   token("canvas"),
        surface: {
          DEFAULT: token("surface"),
          strong:  token("surface-strong"),
        },
        hairline: {
          DEFAULT: token("hairline"),
          strong:  token("hairline-strong"),
        },
        // Text, ordered from most to least prominent.
        fg: {
          DEFAULT: token("fg"),
          muted:   token("fg-muted"),
          subtle:  token("fg-subtle"),
          faint:   token("fg-faint"),
          dim:     token("fg-dim"),
        },
        // Brand accent for text/icons — darker on light, lighter on dark.
        accent: {
          DEFAULT: token("accent"),
          strong:  token("accent-strong"),
        },
        success: token("success"),
        warning: token("warning"),
        danger:  token("danger"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-in-out",
        "slide-up":   "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
