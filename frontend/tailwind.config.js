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
      animation: {
        'fade-in':  'fade-in 350ms ease-out both',
        'slide-up': 'slide-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
