/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        growe: {
          DEFAULT: '#4CF5B7',
          light: '#6FF8C8',
          dark: '#2EE8A0',
          soft: 'rgba(76, 245, 183, 0.12)',
        },
      },
      transitionProperty: { colors: 'color, background-color, border-color' },
    },
  },
  plugins: [],
};
