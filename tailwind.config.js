/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tiktok: { DEFAULT: '#FE2C55', alt: '#25F4EE' },
        youtube: '#FF0033',
        twitch: '#9146FF',
        kick: '#53FC18'
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
