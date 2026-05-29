/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        line: '#d7dde5',
        surface: '#ffffff',
        muted: '#f5f7fa',
        brand: '#235789',
        success: '#2f855a',
        warning: '#b7791f',
        danger: '#c53030'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(31, 41, 51, 0.08)'
      }
    }
  },
  plugins: []
};
