/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        foreground: '#ededed',
        surface: {
          50: '#1e1e24',
          100: '#18181c',
          200: '#121216',
          300: '#0d0d10',
          border: '#27272e',
          hover: '#22222a',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          glow: 'rgba(99, 102, 241, 0.25)',
        },
        sidebar: '#111115',
        toolbar: '#16161b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 4s ease-in-out infinite',
        scanline: 'scanline 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
