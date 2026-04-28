import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d0a0d',
        ink: '#ece1d8',
        mauve: {
          50: '#f0d8e0',
          100: '#dfc4d2',
          200: '#c8a2b8',
          300: '#b88aa8',
          400: '#a07090',
          500: '#8a5a78',
          600: '#6a4858',
          700: '#4a323e',
          800: '#2a1f25',
          900: '#15101380',
        },
        gold: '#d4b896',
        muted: '#9b8a91',
      },
    },
  },
  plugins: [],
} satisfies Config;
