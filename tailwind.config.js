/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // Site-wide font (loaded via Google Fonts in public/index.html). Setting
      // the `sans` key makes Inter the default everywhere font-sans / the base
      // body font is used, with system sans fallbacks until the webfont loads.
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Readability bump: the UI leaned heavily on Tailwind's default 12px
      // (text-xs) and 14px (text-sm) sizes, which read as cramped. We nudge the
      // small/body steps up a notch (and pair sensible line-heights) so every
      // screen gets more legible text WITHOUT changing layout or hierarchy —
      // the steps keep their relative scale. Large display sizes (4xl+) are
      // left at Tailwind defaults so hero headings don't overflow.
      fontSize: {
        xs: ["0.875rem", { lineHeight: "1.25rem" }], // 17px
        sm: ["1rem", { lineHeight: "1.5rem" }], // 19px
        base: ["1.125rem", { lineHeight: "1.625rem" }], // 21px
        lg: ["1.25rem", { lineHeight: "1.75rem" }], // 23px
        xl: ["1.375rem", { lineHeight: "1.875rem" }], // 25px
        "2xl": ["1.625rem", { lineHeight: "2.125rem" }], // 29px
        "3xl": ["2rem", { lineHeight: "2.5rem" }], // 35px
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }], // 40px
        "5xl": ["2.75rem", { lineHeight: "1" }], // 52px
        "6xl": ["3.5rem", { lineHeight: "1" }], // 64px
      },
    },
  },
  plugins: [],
};