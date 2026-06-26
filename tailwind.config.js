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
        xs: ["1.0625rem", { lineHeight: "1.5rem" }], // 17px
        sm: ["1.1875rem", { lineHeight: "1.625rem" }], // 19px
        base: ["1.3125rem", { lineHeight: "1.875rem" }], // 21px
        lg: ["1.4375rem", { lineHeight: "2rem" }], // 23px
        xl: ["1.5625rem", { lineHeight: "2.125rem" }], // 25px
        "2xl": ["1.8125rem", { lineHeight: "2.375rem" }], // 29px
        "3xl": ["2.1875rem", { lineHeight: "2.625rem" }], // 35px
        "4xl": ["2.5rem", { lineHeight: "2.75rem" }], // 40px
        "5xl": ["3.25rem", { lineHeight: "1" }], // 52px
        "6xl": ["4rem", { lineHeight: "1" }], // 64px
      },
    },
  },
  plugins: [],
};