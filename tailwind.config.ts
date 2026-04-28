import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d0b0d',
        ink: '#ece1d8',
        mauve: {
          50: '#e2dde3',
          100: '#cbbdd0',
          200: '#ae95b6',
          300: '#925fa2',
          400: '#765580',
          500: '#5e4569',
          600: '#4d3b53',
          700: '#3a2c40',
          800: '#2b242d',
          900: '#1a121f80',
        },
        gold: '#d4b896',
        muted: '#9d8ea6',
      },
    },
  },
  plugins: [],
} satisfies Config;
