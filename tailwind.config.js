/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FFFBF0',
          100: '#FFF7E6',
          200: '#FFECC0',
          300: '#FFE0A0',
          400: '#FFD580',
          500: '#FFC700',
          600: '#E6B000',
          700: '#CC9900',
          800: '#B28600',
          900: '#997200',
        },
      },
    },
  },
  plugins: [],
}
