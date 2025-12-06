/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./login.html",
    "./browse.html",
    "./about.html",
    "./admin.html",
    "./my-account.html",
    "./competitions.html",
    "./americano/**/*.{html,js}",
    "./mexicano/**/*.{html,js}",
    "./team-league/**/*.{html,js}",
    "./tournament/**/*.{html,js}",
    "./src/**/*.{html,js}",
  ],
  
  theme: {
    extend: {
      // Custom colors for UberPadel branding
      colors: {
        'uber': {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fececa',
          300: '#fcaca5',
          400: '#f87c71',
          500: '#ef5344', // Primary brand color
          600: '#dc3626',
          700: '#b92a1c',
          800: '#99261b',
          900: '#7f251d',
        },
        'padel': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      
      // Custom fonts
      fontFamily: {
        'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      
      // Animations
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 1s infinite',
      },
      
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      
      // Border radius
      borderRadius: {
        '4xl': '2rem',
      },
      
      // Box shadows
      boxShadow: {
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.1), 0 4px 12px -4px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 8px 24px -8px rgba(0, 0, 0, 0.15), 0 12px 32px -12px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  
  plugins: [
    require('@tailwindcss/forms'),
  ],
  
  // Safelist classes that might be dynamically generated
  safelist: [
    // Player colors
    { pattern: /bg-(red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|stone|zinc|slate)-(50|100|200)/ },
    { pattern: /text-(red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|stone|zinc|slate)-(600|700)/ },
    { pattern: /border-(red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|stone|zinc|slate)-(100|200)/ },
    // Grid columns
    { pattern: /grid-cols-(1|2|3|4)/ },
    // Gaps
    { pattern: /gap-(2|3|4|6|8)/ },
  ],
};
