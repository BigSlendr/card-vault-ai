/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cv: {
          bg: 'var(--bg)',
          bg2: 'var(--bg-2)',
          surface: 'var(--surface)',
          surfaceStrong: 'var(--surface-strong)',
          border: 'var(--border)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          primary: 'var(--primary)',
          secondary: 'var(--secondary)',
          good: 'var(--good)',
          warn: 'var(--warn)',
          danger: 'var(--danger)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}
