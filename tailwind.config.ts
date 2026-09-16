import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1d23',
        paper: '#fafaf8',
        line: '#e4e2dd',
        accent: '#2f5d50',
        accentSoft: '#e8efec',
        warn: '#a15c1f',
        warnSoft: '#f6ecdf',
        bad: '#a13a3a',
        badSoft: '#f6e6e6',
        good: '#2f6b3f',
        goodSoft: '#e7f0e8',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
