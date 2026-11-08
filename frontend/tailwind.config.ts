import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oled: "#000000",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: {
          DEFAULT: "#10b981",
          neon: "#05df72",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
        critical: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        glass: {
          dark: "rgba(255, 255, 255, 0.03)",
          light: "rgba(0, 0, 0, 0.02)",
          "dark-elevated": "rgba(255, 255, 255, 0.05)",
          "light-elevated": "rgba(255, 255, 255, 0.90)",
          border: "rgba(255, 255, 255, 0.10)",
          "border-light": "rgba(0, 0, 0, 0.08)",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
      boxShadow: {
        "glow-emerald": "0 0 15px rgba(16, 185, 129, 0.35)",
        "glow-emerald-lg": "0 0 25px rgba(16, 185, 129, 0.50)",
        "glow-amber": "0 0 15px rgba(245, 158, 11, 0.35)",
        "glow-crimson": "0 0 15px rgba(239, 68, 68, 0.35)",
        "glass-sm": "0 2px 10px rgba(0, 0, 0, 0.2)",
        "glass-md": "0 8px 30px rgba(0, 0, 0, 0.3)",
        "glass-lg": "0 20px 40px rgba(0, 0, 0, 0.4)",
        "glass-inner": "inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
