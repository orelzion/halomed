import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'desert-oasis': {
          'primary': '#FEFAE0',
          'secondary': '#E9EDC9',
          'card': '#FAEDCD',
          'accent': '#D4A373',
          'muted': '#CCD5AE',
          'dark-primary': '#121212',
          'dark-secondary': '#1E1E1E',
          'dark-card': '#2D2D2D',
        },
        background: {
          DEFAULT: 'var(--bg-primary)',
        },
        foreground: {
          DEFAULT: 'var(--text-primary)',
        },
        secondary: {
          DEFAULT: 'var(--bg-secondary)',
          foreground: 'var(--text-secondary)',
        },
        card: {
          DEFAULT: 'var(--bg-card)',
          foreground: 'var(--text-primary)',
        },
        muted: {
          DEFAULT: 'var(--muted-accent)',
          foreground: 'var(--text-secondary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        border: 'var(--border-color)',
        input: 'var(--input-color)',
        ring: 'var(--accent)',
      },
      fontFamily: {
        'source': ['var(--font-source)', 'serif'],
        'explanation': ['var(--font-explanation)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
