/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0d71e2',
        pink: {
          DEFAULT: '#e8408a',
          pastel: '#f980b5',
          dark: '#B92A69',
        },
        skyblue: '#a6d3fd',
        lightblue: '#B9D9FF',
        lightpink: '#FFC2DD',
        bluedark: '#0756AF',
        mint: { bg: '#EAF2FD', fg: '#0d71e2' },
        redflag: { bg: '#FCE8E6', fg: '#D93025' },
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(7, 86, 175, 0.08), 0 4px 14px rgba(7, 86, 175, 0.06)',
        float: '0 6px 20px rgba(13, 113, 226, 0.35)',
      },
    },
  },
  plugins: [],
}
