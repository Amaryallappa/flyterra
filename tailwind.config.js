/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          50:  '#F7F7F8',
          100: '#EBEBED',
          200: '#D5D5D8',
          300: '#B2B2B8',
          400: '#7E7E87',
          500: '#54545C',
          600: '#3D3D3D',   /* Primary charcoal */
          700: '#2C2C2E',
          800: '#1C1C1E',
          900: '#121214',
          950: '#0A0A0C',
        },
        brand: {
          50:  '#F7F7F8',
          100: '#EBEBED',
          200: '#D5D5D8',
          300: '#B2B2B8',
          400: '#7E7E87',
          500: '#54545C',
          600: '#3D3D3D',   /* Replaced blue with primary charcoal */
          700: '#2C2C2E',
          800: '#1C1C1E',
          900: '#121214',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
