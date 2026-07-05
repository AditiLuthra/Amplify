/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'clara-primary': '#6366f1',
        'clara-secondary': '#ec4899',
        'clara-accent': '#f59e0b',
      },
    },
  },
  plugins: [],
}
