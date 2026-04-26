import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sage: '#A9B89E',
        cream: '#F2EFE6',
        ivory: '#E8E5DA',
        ink: '#0F0F0F',
        forest: '#2F5233',
        leaf: '#6FA86B',
        mint: '#D9E8CF',
        hairline: '#D8D4C7',
        muted: '#6B6B66',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI Variable',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(40, 60, 40, 0.06)',
        float: '0 24px 60px rgba(40, 60, 40, 0.18)',
      },
      transitionTimingFunction: {
        leaf: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
