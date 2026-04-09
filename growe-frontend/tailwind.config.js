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
      keyframes: {
        'auth-blob-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(8%, 5%) scale(1.08)' },
          '66%': { transform: 'translate(-5%, 8%) scale(0.96)' },
        },
        'auth-blob-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '40%': { transform: 'translate(-10%, -6%) scale(1.06)' },
          '70%': { transform: 'translate(6%, -10%) scale(0.94)' },
        },
        'auth-watermark': {
          '0%, 100%': { opacity: '0.14', transform: 'scale(1) translateY(0)' },
          '50%': { opacity: '0.22', transform: 'scale(1.03) translateY(-6px)' },
        },
        'auth-brand-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 12px rgba(76, 245, 183, 0.2))' },
          '50%': { filter: 'drop-shadow(0 0 22px rgba(76, 245, 183, 0.32))' },
        },
        'auth-aurora': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'auth-blob-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(12%, -8%) scale(1.12)' },
        },
        'auth-sweep': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(380%)' },
        },
        'auth-icon-float-1': {
          '0%, 100%': { transform: 'translateY(0) rotate(-4deg)' },
          '50%': { transform: 'translateY(-16px) rotate(4deg)' },
        },
        'auth-icon-float-2': {
          '0%, 100%': { transform: 'translateY(0) rotate(3deg)' },
          '50%': { transform: 'translateY(-18px) rotate(-3deg)' },
        },
        'auth-icon-float-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(8px, -12px) scale(1.05)' },
        },
        'auth-icon-float-4': {
          '0%, 100%': { transform: 'translateY(0) scale(1) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) scale(1.12) rotate(12deg)' },
        },
        'auth-dot-1': {
          '0%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-4px)' },
        },
        'auth-dot-2': {
          '0%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-4px)' },
        },
        'auth-dot-3': {
          '0%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-4px)' },
        },
        'auth-ping-soft': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
      },
      animation: {
        'auth-blob-1': 'auth-blob-1 22s ease-in-out infinite',
        'auth-blob-2': 'auth-blob-2 28s ease-in-out infinite',
        'auth-blob-3': 'auth-blob-3 19s ease-in-out infinite',
        'auth-watermark': 'auth-watermark 14s ease-in-out infinite',
        'auth-brand-glow': 'auth-brand-glow 4s ease-in-out infinite',
        'auth-aurora': 'auth-aurora 80s linear infinite',
        'auth-sweep': 'auth-sweep 14s ease-in-out infinite',
        'auth-icon-float-1': 'auth-icon-float-1 5.5s ease-in-out infinite',
        'auth-icon-float-2': 'auth-icon-float-2 6s ease-in-out 0.4s infinite',
        'auth-icon-float-3': 'auth-icon-float-3 5.8s ease-in-out 0.8s infinite',
        'auth-icon-float-4': 'auth-icon-float-4 4.5s ease-in-out 0.2s infinite',
        'auth-dot-1': 'auth-dot-1 1.1s ease-in-out 0s infinite',
        'auth-dot-2': 'auth-dot-2 1.1s ease-in-out 0.18s infinite',
        'auth-dot-3': 'auth-dot-3 1.1s ease-in-out 0.36s infinite',
        'auth-ping-soft': 'auth-ping-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
