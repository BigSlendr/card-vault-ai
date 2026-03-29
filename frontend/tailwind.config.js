/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cv: {
          bg:        'var(--bg)',
          bg2:       'var(--bg-2)',
          surface:   'var(--surface)',
          border:    'var(--border)',
          text:      'var(--text)',
          muted:     'var(--muted)',
          primary:   'var(--primary)',
          secondary: 'var(--secondary)',
          good:      'var(--good)',
          warn:      'var(--warn)',
          danger:    'var(--danger)',
        },
      },
    },
  },
  plugins: [],
}

