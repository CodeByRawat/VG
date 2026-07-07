/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#111111',
        panel: '#1B1B1B',
        accent: '#CCFF00',
        text: '#EAF0FB',
        muted: '#8A8F98',
        border: '#2C2C2C',
      },
    },
  },
  plugins: [],
};
