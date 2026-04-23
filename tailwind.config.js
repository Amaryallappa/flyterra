/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4fb',
          100: '#d5e5f4',
          200: '#a9cbe9',
          300: '#74a8d6',
          400: '#4585be',
          500: '#2d6fa4',
          600: '#234C7B',   /* FLYTERRA logo blue */
          700: '#1d3f67',
          800: '#163252',
          900: '#0f233a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
