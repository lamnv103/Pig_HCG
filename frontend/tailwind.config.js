/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14231d',
        moss: '#2f5f4a',
        clay: '#b56b43',
        hay: '#ead6bd',
        fog: '#f5f8f6',
      },
      boxShadow: {
        panel: '0 20px 45px -25px rgba(8, 24, 19, 0.35)',
      },
    },
  },
  plugins: [],
}
