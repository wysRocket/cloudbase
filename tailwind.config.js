/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue,svelte}",
    "./*.html" 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}