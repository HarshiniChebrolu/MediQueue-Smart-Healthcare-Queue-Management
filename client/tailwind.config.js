/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hospital: {
          teal: '#0F766E',
          'teal-dark': '#115E59',
          'teal-soft': '#CCFBF1',
          blue: '#2563EB',
          'blue-soft': '#DBEAFE',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          text: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(15, 118, 110, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        glow: '0 0 25px rgba(15, 118, 110, 0.25)',
      },
    },
  },
  plugins: [],
};
