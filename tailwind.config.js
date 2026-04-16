import tailwindAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.tsx',
    './hooks/**/*.tsx',
    './hooks/**/*.ts',
    './utils/**/*.tsx',
    './utils/**/*.ts',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    tailwindAnimate,
    function ({ addUtilities }) {
      addUtilities({
        '.bg-gradient-conic': {
          'background-image': 'conic-gradient(var(--tw-gradient-stops))',
        },
      });
    },
  ],
};
