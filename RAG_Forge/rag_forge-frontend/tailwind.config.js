/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#04060D',   // obsidian-950
          secondary: '#080C14', // obsidian-900
          card: '#0D1424',      // obsidian-800
          hover: '#111B30',     // obsidian-700
          border: '#1E2D4A',    // slate-border
        },
        brand: {
          indigo: '#7C6AFF',         // violet-forge
          'indigo-light': '#9D8FFF', // violet-light
          'indigo-dim': '#2D2760',   // violet-dim
          cyan: '#00D4FF',           // cyan-forge
          'cyan-dim': '#002D3A',     // cyan-dim
          green: '#10D9A0',          // success
          amber: '#F5A623',          // warning
          red: '#FF4D6A',            // danger
          purple: '#A855F7',         // Added for UI consistency
        },
        text: {
          primary: '#EDF2FF',
          secondary: '#8B9FC4',
          muted: '#4E6080',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['13px', '20px'],
        base: ['14px', '22px'],
        md: ['15px', '24px'],
        lg: ['17px', '26px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '38px'],
        '4xl': ['38px', '46px'],
      },
      boxShadow: {
        'glow-indigo': '0 0 30px rgba(124,106,255,0.3), 0 0 60px rgba(124,106,255,0.1)',
        'glow-cyan': '0 0 30px rgba(0,212,255,0.25)',
        'card': '0 1px 3px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,106,255,0.2)',
      },
      animation: {
        'gradient-x': 'gradientX 4s ease infinite',
        'cursor-blink': 'cursorBlink 1s step-end infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-forge': 'pulseForge 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        pulseForge: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
    },
  },
  plugins: [],
}