/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#070c18',
        surface: '#0d162a',
        border: '#1a2744',
      },
    },
  },
  plugins: [],
}
