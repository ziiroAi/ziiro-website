import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // One family for everything that is words. `sans` and `display` are
      // deliberately the same stack: the reference runs a single face at every
      // size and lets scale and weight do the work that a second family used to
      // do. Helvetica Neue on macOS and iOS, Arial on Windows, which is
      // metrically identical, so the line breaks do not move across platforms.
      // Neither needs downloading, which is two render-blocking requests gone.
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        // Space Mono stays. The uppercase tracked micro-labels are a signature
        // of this site and Helvetica cannot do that job.
        mono: ['Space Mono', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      // Helvetica Neue ships Thin/UltraLight/Light/Regular/Medium/Bold — there
      // is no 600. CSS font matching resolves a 600 request upwards, so every
      // `font-semibold` on the site would have rendered as Bold, which is the
      // "too heavy" the brief warns about, and Arial would do the same with
      // only 400 and 700 to choose from. Pointing `semibold` at 500 lands it on
      // real Helvetica Neue Medium instead of a synthesised weight, which is
      // the lighter, airier setting the reference uses. `bold` is left alone:
      // 700 is a genuine Helvetica weight.
      fontWeight: {
        semibold: "500",
      },
      // -0.025em was tuned for Instrument Sans. Helvetica is already tightly
      // fitted, so the same value closes the counters up at display sizes.
      letterSpacing: {
        tight: "-0.015em",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "var(--radius-xl)",
        pill: "50px",
      },
      boxShadow: {
        "neo": "8px 8px 16px var(--neo-shadow-dark), -8px -8px 16px var(--neo-shadow-light)",
        "neo-sm": "4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)",
        "neo-inset": "inset 4px 4px 8px var(--neo-shadow-dark), inset -4px -4px 8px var(--neo-shadow-light)",
        "glass": "0 8px 32px rgba(0, 0, 0, 0.1)",
        "glass-lg": "0 16px 48px rgba(0, 0, 0, 0.15)",
      },
      backdropBlur: {
        glass: "40px",
        "glass-strong": "60px",
      },
      zIndex: {
        "-1": "-1",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "orbit-rotate": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "orbit": "orbit-rotate 60s linear infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
