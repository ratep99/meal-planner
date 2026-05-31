/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          hover: "var(--accent-hover)",
        },
        breakfast: "var(--breakfast)",
        lunch: "var(--lunch)",
        dinner: "var(--dinner)",
        snack: "var(--snack)",
        macro: {
          protein: "var(--macro-protein)",
          carbs: "var(--macro-carbs)",
          fat: "var(--macro-fat)",
          kcal: "var(--macro-kcal)",
        },
        destructive: "var(--destructive)",
        warning: "var(--warning)",
        success: "var(--success)",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: [
          "DM Sans",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        hover: "var(--shadow-hover)",
        modal: "var(--shadow-modal)",
      },
      maxWidth: {
        content: "1200px",
      },
      spacing: {
        sidebar: "240px",
        "sidebar-collapsed": "64px",
      },
    },
  },
  plugins: [],
};
