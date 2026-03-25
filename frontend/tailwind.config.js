/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf9ec',
          100: '#faf0cc',
          200: '#f4de8d',
          300: '#eec84e',
          400: '#e8b82a',
          500: '#C9A84C',
          600: '#b8932e',
          700: '#9a7425',
          800: '#7d5d24',
          900: '#664d22',
        },
        surface: {
          DEFAULT: '#111111',
          50:  '#1a1a1a',
          100: '#222222',
          200: '#2a2a2a',
          300: '#333333',
          400: '#444444',
        },
        cream: '#F5F0E8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #F0C04A 50%, #C9A84C 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0D0D0D 0%, #1a1a1a 100%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201, 168, 76, 0.3)',
        'gold-sm': '0 0 10px rgba(201, 168, 76, 0.2)',
      },
    },
  },
  plugins: [],
};
