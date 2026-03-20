/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: "#2f6d66",
        "teal-dark": "#2D6B6B",
        "teal-light": "#8FC4C4",
        red: "#c62828",
        "red-dark": "#A01E23",
        aqua: "#82b6b0",
        gold: "#d4af37",
        cream: "#f5e5c0",
        "cream-dark": "#EDE3B2",
        "cream-mid": "#F9F4E3",
        charcoal: "#2e2a25",
        espresso: "#3b2e2a",
        "gray-mid": "#6B6B6B",
        // Aliases for consistency
        "brand-cream": "#f5e5c0",
        "brand-charcoal": "#2e2a25",
        "brand-teal": "#2f6d66",
        "brand-gold": "#d4af37",
        "brand-offwhite": "#fffaf2",
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
