/** @type {import('tailwindcss').Config} */
export default {
  content: ['./renderer/index.html', './renderer/src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0c0c14',
          50: '#12121e',
          100: '#16162a',
          200: '#1c1c36',
          300: '#242442',
        },
        neon: {
          cyan: '#00e5ff',
          purple: '#b14dff',
          pink: '#ff4dcd',
          green: '#39ff8f',
        },
        text: {
          primary: '#e8e8ea',
          secondary: '#8f8fa3',
          muted: '#5a5a70',
        },
        border: {
          DEFAULT: '#1e1e30',
          hover: '#2a2a44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 12px rgba(0, 229, 255, 0.15)',
        'glow-purple': '0 0 12px rgba(177, 77, 255, 0.15)',
      },
    },
  },
  plugins: [],
}
