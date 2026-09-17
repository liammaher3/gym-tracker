/** @type {import('tailwindcss').Config} */
export default {
  // Theme is driven by data-theme on <html>, not by media query or a .dark class.
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        slab: "var(--slab)",
        ink: "var(--ink)",
        dim: "var(--dim)",
        line: "var(--line)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-hot": "var(--accent-hot)",
        "on-accent": "var(--on-accent)",
        danger: "var(--danger)",
        success: "var(--success)",
      },
      fontFamily: {
        head: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        body: ["Barlow", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Industry is square. Nothing rounds.
        DEFAULT: "0",
        none: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        full: "0",
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
    },
  },
  plugins: [],
};
