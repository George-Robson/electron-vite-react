/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#18192b', // deep blue background
        foreground: '#e6e6f0', // light text
        selection: '#23243a', // sidebar, card backgrounds
        primary: '#7b5cff', // vibrant purple (buttons, highlights)
        secondary: '#23243a', // secondary backgrounds
        accent: '#4f8cff', // blue accent (links, icons)
        comment: '#8a8fa3', // muted text
        card: '#23243a', // card backgrounds
        border: '#282a3a', // subtle borders
        yellow: '#ffd66b',
        green: '#4ade80',
        red: '#f87171',
        // Add more as needed for UI elements
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
